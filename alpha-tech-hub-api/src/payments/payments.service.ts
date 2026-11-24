import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePhone } from '../common/phone';

/**
 * M-Pesa prompt (STK push). NOTE: this needs real Safaricom Daraja credentials and a public HTTPS callback URL,
 * so it has been written to the Daraja spec but not exercised against Safaricom. The manual paybill/till flow
 * (customer sends the M-Pesa code, the office verifies it) does not depend on any of this.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private config: ConfigService, private prisma: PrismaService, private notifications: NotificationsService) {}

  private get base() {
    return this.config.get('MPESA_ENV') === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  }

  private async token(): Promise<string> {
    const key = this.config.get('MPESA_CONSUMER_KEY');
    const secret = this.config.get('MPESA_CONSUMER_SECRET');
    if (!key || !secret) throw new BadRequestException('The M-Pesa prompt is not set up yet. Please pay with the paybill/till and send us the code.');
    const credentials = Buffer.from(`${key}:${secret}`).toString('base64');
    const { data } = await axios.get(`${this.base}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${credentials}` }, timeout: 10000 });
    return data.access_token;
  }

  async initiateStkPush(orderNumber: string, phoneRaw: string) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber: (orderNumber || '').toUpperCase() } });
    const phone = normalizePhone(phoneRaw);
    if (!order || !phone) throw new NotFoundException('No order found with those details');
    if (order.paymentMethod !== 'MPESA_STK') throw new BadRequestException('This order is not paid with the M-Pesa prompt.');
    if (order.lifecycleStatus !== 'AWAITING_PAYMENT') throw new BadRequestException('This order is not waiting for payment.');

    const shortcode = this.config.get('MPESA_SHORTCODE');
    const passkey = this.config.get('MPESA_PASSKEY');
    const callbackBase = this.config.get('MPESA_CALLBACK_URL');
    const cbToken = this.config.get('MPESA_CALLBACK_TOKEN');
    if (!shortcode || !passkey || !callbackBase || !cbToken) throw new BadRequestException('The M-Pesa prompt is not set up yet.');

    const token = await this.token();
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    const msisdn = phone.replace('+', '');
    const { data } = await axios.post(`${this.base}/mpesa/stkpush/v1/processrequest`, {
      BusinessShortCode: shortcode, Password: password, Timestamp: timestamp, TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(Number(order.totalAmount)), PartyA: msisdn, PartyB: shortcode, PhoneNumber: msisdn,
      CallBackURL: `${String(callbackBase).replace(/\/$/, '')}/${cbToken}`,
      AccountReference: order.orderNumber, TransactionDesc: 'Order payment',
    }, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });

    await this.prisma.order.update({ where: { id: order.id }, data: { mpesaCheckoutRequestId: data.CheckoutRequestID } });
    return { message: 'Check your phone and enter your M-Pesa PIN.', checkoutRequestId: data.CheckoutRequestID };
  }

  /** Safaricom calls this when the customer finishes (or cancels) the prompt. Matched by CheckoutRequestID. */
  async handleCallback(body: any) {
    const cb = body?.Body?.stkCallback;
    if (!cb?.CheckoutRequestID) return { received: true };
    const order = await this.prisma.order.findFirst({ where: { mpesaCheckoutRequestId: cb.CheckoutRequestID } });
    if (!order) { this.logger.warn(`Callback for unknown CheckoutRequestID ${cb.CheckoutRequestID}`); return { received: true }; }
    if (cb.ResultCode !== 0) return { received: true }; // cancelled / failed: the order simply stays awaiting payment

    const items: any[] = cb.CallbackMetadata?.Item ?? [];
    const receipt = String(items.find(i => i.Name === 'MpesaReceiptNumber')?.Value ?? '').toUpperCase();
    const amount = Number(items.find(i => i.Name === 'Amount')?.Value ?? 0);
    const underpaid = amount + 0.5 < Number(order.totalAmount);

    const changed = await this.prisma.$transaction(async tx => {
      // idempotent: a repeated callback finds the order already moved on and does nothing
      const res = await tx.order.updateMany({
        where: { id: order.id, lifecycleStatus: { in: ['AWAITING_PAYMENT', 'AWAITING_VERIFICATION'] } },
        data: underpaid
          ? { lifecycleStatus: 'AWAITING_VERIFICATION', paymentStatus: 'AWAITING_VERIFICATION', paymentReference: receipt || null, paymentReferenceAt: new Date() }
          : { lifecycleStatus: 'PAID', paymentStatus: 'PAID', mpesaReceiptNumber: receipt || null, paidAt: new Date() },
      });
      if (!res.count) return false;
      await tx.orderEvent.create({
        data: {
          orderId: order.id, lifecycleStatus: underpaid ? 'AWAITING_VERIFICATION' : 'PAID', workflowStage: order.workflowStage,
          note: underpaid ? `M-Pesa ${receipt} received but KES ${amount} is less than the order total. Office to check.` : `M-Pesa payment received (${receipt})`,
        },
      });
      return true;
    });
    if (changed && !underpaid) this.notifications.send(order.id, 'payment_verified');
    return { received: true };
  }
}

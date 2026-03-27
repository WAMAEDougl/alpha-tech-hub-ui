import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private config: ConfigService, private prisma: PrismaService) {}

  private async getMpesaToken(): Promise<string> {
    const key = this.config.get('MPESA_CONSUMER_KEY');
    const secret = this.config.get('MPESA_CONSUMER_SECRET');
    const credentials = Buffer.from(`${key}:${secret}`).toString('base64');
    const { data } = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { headers: { Authorization: `Basic ${credentials}` } },
    );
    return data.access_token;
  }

  async initiateStkPush(orderId: string, phone: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');
    if (order.status !== 'PENDING') throw new BadRequestException('Order already processed');

    const token = await this.getMpesaToken();
    const shortcode = this.config.get('MPESA_SHORTCODE');
    const passkey = this.config.get('MPESA_PASSKEY');
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    const amount = Math.ceil(Number(order.totalAmount));

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone.replace('+', ''),
      PartyB: shortcode,
      PhoneNumber: phone.replace('+', ''),
      CallBackURL: this.config.get('MPESA_CALLBACK_URL'),
      AccountReference: `ORDER-${orderId.slice(0, 8).toUpperCase()}`,
      TransactionDesc: `Alpha Computers Order`,
    };

    const { data } = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return { message: 'STK Push sent. Check your phone.', checkoutRequestId: data.CheckoutRequestID };
  }

  async handleMpesaCallback(body: any) {
    const result = body?.Body?.stkCallback;
    if (!result || result.ResultCode !== 0) return { received: true };

    const items: any[] = result.CallbackMetadata?.Item || [];
    const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
    const ref = result.AccountReference?.replace('ORDER-', '').toLowerCase();

    if (ref) {
      const order = await this.prisma.order.findFirst({ where: { id: { startsWith: ref } } });
      if (order) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'PAID', mpesaReceiptNumber: receipt },
        });
      }
    }
    return { received: true };
  }

  async initiateCardPayment(orderId: string, _cardToken: string) {
    return { message: 'Card payment integration coming soon. Use M-Pesa or Pay on Delivery.', orderId };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../common/phone';

export type Milestone =
  | 'order_received'
  | 'payment_verified'
  | 'approved'
  | 'packing'
  | 'dispatched'
  | 'ready_pickup'
  | 'delivered'
  | 'collected'
  | 'cancelled'
  | 'delivery_failed'
  /** one per refund (suffix = return id), so a second refund on an order is still announced */
  | `refund_recorded:${string}`;

interface Message { subject: string; text: string }

const money = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`;
const TIMEOUT_MS = 8000;

/**
 * Customer updates by email (Resend) and WhatsApp (WaSender), one per milestone per channel.
 *  - Each channel is independent: one failing never blocks the other or undoes the order change.
 *  - (order, channel, milestone) is unique, so a milestone is never sent twice, even on retries.
 *  - Without an API key or a usable contact the channel is recorded as SKIPPED, not as an error.
 *  - A timeout stays PENDING (the provider may have accepted it): never auto-retried, to avoid duplicates.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  /** Fire and forget: call after the order change has committed. Never throws. */
  send(orderId: string, milestone: Milestone, extra?: { amount?: number }): void {
    this.notify(orderId, milestone, extra).catch(e => this.logger.error(`notify ${milestone} failed: ${e?.message}`));
  }

  async notify(orderId: string, milestone: Milestone, extra?: { amount?: number }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, invoice: true },
    });
    if (!order) return;
    const settings = await this.prisma.settings.findFirst();
    const shop = settings?.companyName || 'Alpha Computers Nanyuki';
    const msg = this.compose(order, milestone, shop, settings, extra);

    await Promise.all([
      this.deliver(order.id, 'EMAIL', milestone, async () => {
        const key = this.config.get<string>('RESEND_API_KEY');
        const from = this.config.get<string>('EMAIL_FROM');
        if (!key || !from) return { skip: 'Email is not configured' };
        if (!order.customerEmail) return { skip: 'No email address on the order' };
        const res = await this.post('https://api.resend.com/emails', key, {
          from: `${shop} <${from}>`, to: [order.customerEmail], subject: msg.subject,
          text: msg.text,
        }, { 'Idempotency-Key': `order-${order.id}-${milestone}` });
        return res;
      }),
      this.deliver(order.id, 'WHATSAPP', milestone, async () => {
        const key = this.config.get<string>('WASENDER_API_KEY');
        if (!key) return { skip: 'WhatsApp is not configured' };
        const to = normalizePhone(order.customerPhone);
        if (!to) return { skip: 'No usable phone number' };
        return this.post('https://www.wasenderapi.com/api/send-message', key, { to, text: msg.text });
      }),
    ]);
  }

  // ── plumbing ─────────────────────────────────────────────────────────────

  private async deliver(
    orderId: string, channel: NotificationChannel, milestone: string,
    run: () => Promise<{ skip: string } | { id?: string } | { error: string; unknown?: boolean }>,
  ) {
    // claim the (order, channel, milestone) slot first: concurrent callers lose here
    let claimed = true;
    try {
      await this.prisma.notificationLog.create({ data: { orderId, channel, milestone, status: 'PENDING' } });
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e;
      // already exists: only a known-rejected (FAILED) send may be retried
      const re = await this.prisma.notificationLog.updateMany({
        where: { orderId, channel, milestone, status: 'FAILED' }, data: { status: 'PENDING', error: null },
      });
      claimed = re.count > 0;
    }
    if (!claimed) return;

    let result: Awaited<ReturnType<typeof run>>;
    try { result = await run(); } catch (e: any) { result = { error: e?.message || 'Send failed', unknown: true }; }

    const where = { orderId_channel_milestone: { orderId, channel, milestone } };
    if ('skip' in result) await this.prisma.notificationLog.update({ where, data: { status: 'SKIPPED', error: result.skip } });
    else if ('error' in result) {
      // a timeout/5xx may still have been accepted by the provider, so it stays PENDING
      await this.prisma.notificationLog.update({ where, data: { status: result.unknown ? 'PENDING' : 'FAILED', error: result.error.slice(0, 300) } });
    } else await this.prisma.notificationLog.update({ where, data: { status: 'SENT', providerMessageId: result.id ?? null } });
  }

  private async post(url: string, key: string, body: unknown, extra: Record<string, string> = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, ...extra },
        body: JSON.stringify(body),
      });
      const json: any = await res.json().catch(() => ({}));
      if (res.ok) return { id: json?.id ?? json?.data?.msgId ?? undefined };
      const reason = json?.message || json?.error || `HTTP ${res.status}`;
      // 4xx = provider rejected it (safe to retry later). 5xx = unknown outcome.
      return { error: String(reason), unknown: res.status >= 500 };
    } catch (e: any) {
      return { error: e?.name === 'AbortError' ? 'Timed out' : e?.message || 'Network error', unknown: true };
    } finally {
      clearTimeout(t);
    }
  }

  private compose(order: any, milestone: Milestone, shop: string, settings: any, extra?: { amount?: number }): Message {
    const first = (order.customerName || 'there').split(' ')[0];
    const base = (this.config.get<string>('STORE_URL') || 'http://localhost:8080').replace(/\/$/, '');
    const link = `${base}/track?order=${order.orderNumber}`;
    const n = order.orderNumber;
    const total = money(Number(order.totalAmount));
    const pickup = order.fulfillmentMode === 'PICKUP';

    const pay =
      order.paymentMethod === 'CASH'
        ? `You'll pay ${total} ${pickup ? 'at the shop when you collect' : 'on delivery'}.`
        : settings?.paybillNumber
          ? `Pay ${total} by M-Pesa to Paybill ${settings.paybillNumber}, account ${n}, then send us the M-Pesa code on the tracking page.`
          : settings?.tillNumber
            ? `Pay ${total} by M-Pesa to Till ${settings.tillNumber}, then send us the M-Pesa code on the tracking page.`
            : `We'll contact you with M-Pesa payment details for ${total}.`;

    if (milestone.startsWith('refund_recorded')) {
      return {
        subject: `Refund sent for order ${n}`,
        text: `Hi ${first}, your refund of ${money(extra?.amount ?? 0)} for order ${n} has been sent. M-Pesa refunds usually arrive within a few minutes. Please contact us if you do not see it.\n\nTrack your order: ${link}\n- ${shop}`,
      };
    }
    const lines: Record<string, [string, string]> = {
      order_received: [`We received your order ${n}`, `Hi ${first}, thank you for your order ${n} (${total}). ${pay}`],
      payment_verified: [`Payment received for ${n}`, `Hi ${first}, we've received your payment for order ${n}. We'll review it and start preparing it shortly.`],
      approved: [`We're preparing your order ${n}`, `Hi ${first}, your order ${n} is confirmed and being prepared.${order.invoice ? ` Invoice: ${order.invoice.invoiceNumber}.` : ''}`],
      packing: [`Packing your order ${n}`, `Hi ${first}, we're packing your order ${n} now.`],
      dispatched: [`Your order ${n} is on its way`, `Hi ${first}, your order ${n} is on its way.${order.riderName ? ` Rider: ${order.riderName}${order.riderPhone ? ` (${order.riderPhone})` : ''}.` : ''}${order.paymentMethod === 'CASH' ? ` Please have ${total} ready.` : ''}`],
      ready_pickup: [`Order ${n} is ready for collection`, `Hi ${first}, your order ${n} is ready for collection${settings?.address ? ` at ${settings.address}` : ''}.${order.paymentMethod === 'CASH' ? ` Please bring ${total}.` : ''}`],
      delivered: [`Order ${n} delivered`, `Hi ${first}, your order ${n} has been delivered. Thank you for shopping with ${shop}!`],
      collected: [`Order ${n} collected`, `Hi ${first}, your order ${n} has been collected. Thank you for shopping with ${shop}!`],
      cancelled: [`Order ${n} cancelled`, `Hi ${first}, your order ${n} has been cancelled. Please contact us if you have questions.`],
      delivery_failed: [`We couldn't deliver order ${n}`, `Hi ${first}, we were unable to deliver order ${n} and the goods are returning to our shop. Please contact us to arrange the next step.`],
    };
    const [subject, text] = lines[milestone as string];
    return { subject, text: `${text}\n\nTrack your order: ${link}\n— ${shop}` };
  }
}

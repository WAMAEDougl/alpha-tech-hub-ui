import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from './pricing.service';
import { CreateOrderDto, PaymentMethodDto } from './dto/create-order.dto';
import { normalizeMpesaCode, normalizePhone } from '../common/phone';
import { journeyStage, STAGE_LABEL } from './journey';

/** Unpaid orders are closed after this long. Nothing is reserved before approval, so no stock is locked. */
const UNPAID_HOURS = 24;

/** Queue lanes: which orders need which team's attention. */
export const LANES: Record<string, Prisma.OrderWhereInput> = {
  // office
  payment: { lifecycleStatus: { in: ['AWAITING_PAYMENT', 'AWAITING_VERIFICATION'] } },
  verify: { lifecycleStatus: 'AWAITING_VERIFICATION' },
  review: { workflowStage: 'OFFICE_REVIEW', lifecycleStatus: { in: ['PAID', 'PAY_ON_DELIVERY'] } },
  attention: {
    lifecycleStatus: { notIn: ['CANCELLED', 'STALE', 'COMPLETED'] },
    OR: [{ inventoryIssue: { not: null } }, { lifecycleStatus: 'AWAITING_VERIFICATION' }, { deliveryResolved: false }],
  },
  // inventory
  sourcing: { workflowStage: 'SOURCING', lifecycleStatus: { notIn: ['CANCELLED', 'STALE'] } },
  packing: { workflowStage: { in: ['READY_TO_PACK', 'PACKING'] }, lifecycleStatus: { notIn: ['CANCELLED', 'STALE'] } },
  handoffs: { workflowStage: { in: ['PACKED', 'READY_PICKUP', 'DISPATCHED'] }, lifecycleStatus: { notIn: ['CANCELLED', 'STALE'] } },
  warehouse: { workflowStage: { in: ['SOURCING', 'READY_TO_PACK', 'PACKING', 'PACKED', 'READY_PICKUP', 'DISPATCHED'] }, lifecycleStatus: { notIn: ['CANCELLED', 'STALE'] } },
  // history
  closed: { lifecycleStatus: { in: ['COMPLETED', 'CANCELLED', 'STALE'] } },
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private lastSweep = 0;

  constructor(
    private prisma: PrismaService,
    private pricing: PricingService,
    private notifications: NotificationsService,
  ) {}

  // ── Customer: place an order ─────────────────────────────────────────────

  async create(dto: CreateOrderDto, userId?: string) {
    const phone = normalizePhone(dto.customerPhone);
    if (!phone) throw new BadRequestException('Enter a valid Kenyan phone number, e.g. 0712 345 678');

    const settings = await this.prisma.settings.findFirst();
    const method = dto.paymentMethod;
    if (method === PaymentMethodDto.CASH && settings && !settings.codEnabled) {
      throw new BadRequestException('Cash payment is not available right now');
    }
    if (method === PaymentMethodDto.MPESA_MANUAL && settings && !settings.mpesaManualEnabled) {
      throw new BadRequestException('Paying with an M-Pesa code is not available right now');
    }
    if (method === PaymentMethodDto.MPESA_STK && !(settings?.mpesaStkEnabled)) {
      throw new BadRequestException('The M-Pesa prompt is not available right now');
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const orderNumber = makeOrderNumber();
      try {
        const order = await this.prisma.$transaction(async tx => {
          const q = await this.pricing.quote(dto, tx);

          if (q.discountCodeId) {
            // conditional increment: two people cannot both use the last redemption
            const d = await tx.discountCode.findUniqueOrThrow({ where: { id: q.discountCodeId } });
            const res = await tx.discountCode.updateMany({
              where: { id: d.id, ...(d.maxUses !== null ? { usedCount: { lt: d.maxUses } } : {}) },
              data: { usedCount: { increment: 1 } },
            });
            if (res.count === 0) throw new BadRequestException('That discount code has been fully used');
          }

          const cash = method === PaymentMethodDto.CASH;
          return tx.order.create({
            data: {
              orderNumber, userId: userId ?? null,
              customerName: dto.customerName.trim(), customerPhone: phone,
              customerEmail: dto.customerEmail?.trim().toLowerCase() || null,
              lifecycleStatus: cash ? 'PAY_ON_DELIVERY' : 'AWAITING_PAYMENT',
              paymentStatus: cash ? 'ON_DELIVERY' : 'PENDING',
              workflowStage: 'OFFICE_REVIEW',
              paymentMethod: method, fulfillmentMode: dto.fulfillmentMode,
              subtotal: q.subtotal, deliveryFee: q.deliveryFee, discountAmount: q.discountAmount, totalAmount: q.total,
              deliveryZoneId: q.deliveryZoneId, deliveryResolved: q.deliveryResolved, discountCodeId: q.discountCodeId,
              deliveryAddress: dto.fulfillmentMode === 'DELIVERY' ? dto.deliveryAddress?.trim() : null,
              notes: dto.notes?.trim() || null,
              items: { create: q.lines.map(l => ({ productId: l.productId, productName: l.name, sku: l.sku, unitPrice: l.unitPrice, quantity: l.quantity })) },
              events: {
                create: {
                  lifecycleStatus: cash ? 'PAY_ON_DELIVERY' : 'AWAITING_PAYMENT', workflowStage: 'OFFICE_REVIEW',
                  note: 'Order placed by customer',
                },
              },
            },
            include: { items: true },
          });
        });
        this.notifications.send(order.id, 'order_received');
        return this.publicView(await this.loadPublic(order.id), settings);
      } catch (e: any) {
        if (e?.code === 'P2002') continue; // order-number collision: retry with a new one
        throw e;
      }
    }
    throw new BadRequestException('Could not create the order, please try again');
  }

  /** Customer says "I paid, here is my M-Pesa code". Office then verifies it against the till. */
  async submitPaymentReference(orderNumber: string, phone: string, rawCode: string, user?: { id: string }) {
    const order = await this.byNumberAndPhone(orderNumber, phone, user);
    const code = normalizeMpesaCode(rawCode);
    if (!code) throw new BadRequestException('An M-Pesa code is 10 letters and numbers, e.g. SGH7K2L9QX');
    if (order.paymentMethod !== 'MPESA_MANUAL' && order.paymentMethod !== 'MPESA_STK') {
      throw new BadRequestException('This order is not paid by M-Pesa');
    }
    if (order.lifecycleStatus !== 'AWAITING_PAYMENT' && order.lifecycleStatus !== 'AWAITING_VERIFICATION') {
      throw new BadRequestException('This order is not waiting for payment');
    }
    const clash = await this.prisma.order.findFirst({
      where: { id: { not: order.id }, OR: [{ paymentReference: code }, { mpesaReceiptNumber: code }] }, select: { id: true },
    });
    if (clash) throw new ConflictException('That M-Pesa code has already been used on another order. Check it and try again.');

    await this.prisma.$transaction(async tx => {
      await tx.order.update({
        where: { id: order.id },
        data: { paymentReference: code, paymentReferenceAt: new Date(), lifecycleStatus: 'AWAITING_VERIFICATION', paymentStatus: 'AWAITING_VERIFICATION' },
      });
      await tx.orderEvent.create({
        data: { orderId: order.id, lifecycleStatus: 'AWAITING_VERIFICATION', workflowStage: order.workflowStage, note: `Customer submitted M-Pesa code ${code}` },
      });
    });
    return this.publicView(await this.loadPublic(order.id));
  }

  // ── Customer: tracking ───────────────────────────────────────────────────

  async track(orderNumber: string, phone: string) {
    const order = await this.byNumberAndPhone(orderNumber, phone);
    return this.publicView(await this.loadPublic(order.id));
  }

  /** A guest proves it is their order with the phone number; a signed-in customer with their account. */
  private async byNumberAndPhone(orderNumber: string, phone: string, user?: { id: string }) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber: (orderNumber || '').trim().toUpperCase() } });
    const given = normalizePhone(phone || '');
    const owner = !!order && !!user && order.userId === user.id;
    if (!order || !(owner || (given && order.customerPhone === given))) throw new NotFoundException('No order found with those details');
    return order;
  }

  loadPublic(id: string) {
    return this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: { items: true, invoice: true, deliveryZone: true, events: { orderBy: { createdAt: 'asc' } }, returns: { select: { id: true, status: true, refundAmount: true } } },
    });
  }

  /** Everything a customer may see. Internal notes, staff names and warehouse counts are left out. */
  async publicView(o: any, settingsIn?: any) {
    const settings = settingsIn ?? (await this.prisma.settings.findFirst());
    const stage = journeyStage(o);
    const pickup = o.fulfillmentMode === 'PICKUP';
    const handedOver = o.workflowStage === 'DISPATCHED' || o.workflowStage === 'READY_PICKUP' || o.lifecycleStatus === 'COMPLETED';
    const awaiting = o.lifecycleStatus === 'AWAITING_PAYMENT' || o.lifecycleStatus === 'AWAITING_VERIFICATION';

    // customer-safe timeline: one line per real change of journey stage
    const timeline: { stage: string; label: string; at: Date }[] = [];
    for (const e of o.events ?? []) {
      const s = journeyStage({ lifecycleStatus: e.lifecycleStatus, workflowStage: e.workflowStage, fulfillmentMode: o.fulfillmentMode });
      if (!timeline.length || timeline[timeline.length - 1].stage !== s) timeline.push({ stage: s, label: STAGE_LABEL[s], at: e.createdAt });
    }

    return {
      id: o.id, orderNumber: o.orderNumber, createdAt: o.createdAt,
      journeyStage: stage, journeyLabel: STAGE_LABEL[stage],
      lifecycleStatus: o.lifecycleStatus, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod,
      fulfillmentMode: o.fulfillmentMode,
      deliveryAddress: o.deliveryAddress, deliveryZone: o.deliveryZone?.name ?? null, estimatedDays: o.deliveryZone?.estimatedDays ?? null,
      deliveryResolved: o.deliveryResolved,
      subtotal: Number(o.subtotal), deliveryFee: Number(o.deliveryFee), discountAmount: Number(o.discountAmount), totalAmount: Number(o.totalAmount),
      invoiceNumber: o.invoice?.invoiceNumber ?? null,
      rider: o.workflowStage === 'DISPATCHED' ? { name: o.riderName, phone: o.riderPhone } : null,
      items: (o.items ?? []).map((i: any) => ({ id: i.id, name: i.productName, quantity: i.quantity, unitPrice: Number(i.unitPrice) })),
      timeline,
      payment: {
        // shown while the customer still owes money by M-Pesa
        instructions: awaiting && o.paymentMethod !== 'CASH'
          ? { paybill: settings?.paybillNumber ?? null, till: settings?.tillNumber ?? null, account: o.orderNumber, amount: Number(o.totalAmount) }
          : null,
        canSubmitCode: awaiting && o.paymentMethod !== 'CASH',
        submittedCode: o.paymentReference ?? null,
        awaitingVerification: o.lifecycleStatus === 'AWAITING_VERIFICATION',
      },
      returnEligible: o.lifecycleStatus === 'COMPLETED',
      hasReturn: (o.returns ?? []).length > 0,
      refundedAmount: (o.returns ?? []).reduce((s: number, r: any) => s + (r.status === 'REFUNDED' ? Number(r.refundAmount ?? 0) : 0), 0),
      handedOver, pickup,
    };
  }

  // ── Staff: queues ────────────────────────────────────────────────────────

  async findAll(opts: { lane?: string; search?: string; limit?: number }) {
    await this.sweepStaleUnpaid();
    const where: Prisma.OrderWhereInput = {
      AND: [
        opts.lane && LANES[opts.lane] ? LANES[opts.lane] : {},
        opts.search ? {
          OR: [
            { orderNumber: { contains: opts.search, mode: 'insensitive' } },
            { customerName: { contains: opts.search, mode: 'insensitive' } },
            { customerPhone: { contains: opts.search } },
          ],
        } : {},
      ],
    };
    const rows = await this.prisma.order.findMany({
      where, include: { items: true },
      orderBy: { createdAt: opts.lane && opts.lane !== 'closed' ? 'asc' : 'desc' }, // work queues: oldest first
      take: Math.min(opts.limit ?? 200, 500),
    });
    return rows.map(o => this.staffRow(o));
  }

  /** Counts + oldest waiting order per lane, for the dashboards. */
  async counts() {
    await this.sweepStaleUnpaid();
    const out: Record<string, { count: number; oldest: Date | null }> = {};
    await Promise.all(Object.entries(LANES).map(async ([lane, where]) => {
      const [count, oldest] = await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.findFirst({ where, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      ]);
      out[lane] = { count, oldest: oldest?.createdAt ?? null };
    }));
    return out;
  }

  staffRow(o: any) {
    return {
      id: o.id, orderNumber: o.orderNumber, createdAt: o.createdAt, updatedAt: o.updatedAt,
      customerName: o.customerName, customerPhone: o.customerPhone, customerEmail: o.customerEmail,
      lifecycleStatus: o.lifecycleStatus, paymentStatus: o.paymentStatus, workflowStage: o.workflowStage,
      paymentMethod: o.paymentMethod, fulfillmentMode: o.fulfillmentMode,
      totalAmount: Number(o.totalAmount), deliveryFee: Number(o.deliveryFee), deliveryResolved: o.deliveryResolved,
      itemCount: (o.items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
      items: (o.items ?? []).map((i: any) => ({ name: i.productName, quantity: i.quantity })),
      inventoryIssue: o.inventoryIssue, paymentReference: o.paymentReference,
      journeyStage: journeyStage(o),
    };
  }

  async findOne(id: string) {
    const o = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { sku: true, location: true, stock: true, reservedQuantity: true, allowSupplierSourcing: true } } }, orderBy: { productName: 'asc' } },
        events: { orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true } } } },
        invoice: true, deliveryZone: true, discountCode: { select: { code: true } },
        returns: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        notifications: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!o) throw new NotFoundException('Order not found');
    return {
      ...this.staffRow(o),
      deliveryAddress: o.deliveryAddress, notes: o.notes, deliveryZone: o.deliveryZone?.name ?? null, deliveryZoneId: o.deliveryZoneId,
      subtotal: Number(o.subtotal), discountAmount: Number(o.discountAmount), discountCode: o.discountCode?.code ?? null,
      refundedAmount: o.returns.reduce((sum, r) => sum + (r.status === 'REFUNDED' ? Number(r.refundAmount ?? 0) : 0), 0),
      mpesaReceiptNumber: o.mpesaReceiptNumber, paymentReferenceAt: o.paymentReferenceAt, paidAt: o.paidAt,
      reviewedAt: o.reviewedAt, riderName: o.riderName, riderPhone: o.riderPhone, dispatchedAt: o.dispatchedAt, deliveredAt: o.deliveredAt,
      cancelReason: o.cancelReason, deliveryFailureReason: o.deliveryFailureReason, stockSettledAt: o.stockSettledAt,
      invoice: o.invoice ? { invoiceNumber: o.invoice.invoiceNumber, issuedAt: o.invoice.issuedAt, snapshot: o.invoice.snapshot } : null,
      items: o.items.map(i => ({
        id: i.id, productId: i.productId, name: i.productName, sku: i.sku ?? i.product.sku, location: i.product.location,
        quantity: i.quantity, unitPrice: Number(i.unitPrice),
        reserved: i.reservedQuantity, picked: i.pickedQuantity, deducted: i.deductedQuantity, packChecked: i.packChecked,
        shelfStock: i.product.stock, available: Math.max(0, i.product.stock - i.product.reservedQuantity),
        canSourceFromSupplier: i.product.allowSupplierSourcing,
        planSupplierId: i.planSupplierId, planExpectedDate: i.planExpectedDate, planNote: i.planNote,
      })),
      events: o.events.map(e => ({ lifecycleStatus: e.lifecycleStatus, workflowStage: e.workflowStage, note: e.note, by: e.user?.name ?? 'Customer / system', at: e.createdAt })),
      returns: o.returns.map(r => ({ id: r.id, status: r.status, kind: r.kind, createdAt: r.createdAt, refundAmount: r.refundAmount === null ? null : Number(r.refundAmount) })),
      notifications: o.notifications.map(n => ({ channel: n.channel, milestone: n.milestone, status: n.status, error: n.error, at: n.updatedAt })),
    };
  }

  /** Poll endpoint: orders placed after `since`. Drives the pop-up and sound. */
  async newSince(since: Date, role: string) {
    await this.sweepStaleUnpaid();
    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gt: since } }, orderBy: { createdAt: 'asc' }, take: 20, include: { items: true },
    });
    const c = await this.counts();
    // what is waiting on THIS person: the office approves, inventory sources / packs / hands over
    const toFulfil = role === 'ADMIN'
      ? c.verify.count + c.review.count
      : c.sourcing.count + c.packing.count + c.handoffs.count;
    return {
      serverTime: new Date().toISOString(),
      toFulfil,
      orders: orders.map(o => ({
        id: o.id, orderNumber: o.orderNumber, customerName: o.customerName, total: Number(o.totalAmount),
        items: o.items.reduce((s, i) => s + i.quantity, 0), paymentMethod: o.paymentMethod, createdAt: o.createdAt,
      })),
    };
  }

  /** Close unpaid orders after UNPAID_HOURS. They hold no stock (nothing is reserved before approval). */
  private async sweepStaleUnpaid() {
    if (Date.now() - this.lastSweep < 5 * 60_000) return;
    this.lastSweep = Date.now();
    try {
      const cutoff = new Date(Date.now() - UNPAID_HOURS * 3600_000);
      const stale = await this.prisma.order.findMany({
        where: { lifecycleStatus: { in: ['AWAITING_PAYMENT'] }, createdAt: { lt: cutoff } }, select: { id: true }, take: 100,
      });
      for (const { id } of stale) {
        await this.prisma.$transaction(async tx => {
          const res = await tx.order.updateMany({
            where: { id, lifecycleStatus: 'AWAITING_PAYMENT' },
            data: { lifecycleStatus: 'STALE', workflowStage: 'CANCELLED', cancelledAt: new Date(), cancelReason: `Not paid within ${UNPAID_HOURS} hours` },
          });
          if (res.count) {
            await tx.orderEvent.create({ data: { orderId: id, lifecycleStatus: 'STALE', workflowStage: 'CANCELLED', note: `Not paid within ${UNPAID_HOURS} hours` } });
          }
        });
      }
    } catch (e) {
      this.logger.error('Stale order sweep failed', e as any);
    }
  }

  // ── Reporting ────────────────────────────────────────────────────────────

  async getMonthlyRevenue() {
    return this.prisma.$queryRaw`
      SELECT TO_CHAR(DATE_TRUNC('month', COALESCE("paidAt","createdAt")), 'YYYY-MM') as month,
             SUM("totalAmount")::float as revenue
      FROM orders
      WHERE "paymentStatus" = 'PAID' AND "lifecycleStatus" NOT IN ('CANCELLED','STALE')
      GROUP BY month ORDER BY month DESC LIMIT 12
    `;
  }

  async getTotalRevenue(year?: number) {
    const y = year || new Date().getFullYear();
    const result: any = await this.prisma.$queryRaw`
      SELECT SUM("totalAmount")::float as total FROM orders
      WHERE "paymentStatus" = 'PAID' AND "lifecycleStatus" NOT IN ('CANCELLED','STALE')
      AND EXTRACT(YEAR FROM COALESCE("paidAt","createdAt")) = ${y}
    `;
    return Number(result[0]?.total || 0);
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function makeOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  // unambiguous characters only (no 0/O, 1/I): easy to read out over the phone and to type as an M-Pesa account number
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (const b of randomBytes(4)) suffix += alphabet[b % alphabet.length];
  return `AC-${ymd}-${suffix}`;
}

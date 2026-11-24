import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService, Milestone } from '../notifications/notifications.service';
import { OrdersService } from './orders.service';
import { normalizeMpesaCode, normalizePhone } from '../common/phone';

type Tx = Prisma.TransactionClient;
export type Actor = { id: string; role: string };
type LockedOrder = Prisma.OrderGetPayload<{ include: { items: true; invoice: true } }>;

/** Stages in which the order is still in the shop (nothing has left yet). */
const PRE_HANDOFF = ['OFFICE_REVIEW', 'SOURCING', 'READY_TO_PACK', 'PACKING', 'PACKED', 'READY_PICKUP'];

/**
 * Every order action, in the order the shop actually works:
 *   payment verified -> office approval (+ invoice, stock reserved) -> sourcing / picking
 *   -> packing (each line checked) -> handoff (rider or pickup) -> delivery / collection confirmed.
 * Each step is guarded by the database state, so a step cannot be skipped or done twice.
 * Stock is RESERVED at approval and only DEDUCTED when the goods physically leave (handoff / collection).
 */
@Injectable()
export class WorkflowService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private notifications: NotificationsService,
    private orders: OrdersService,
  ) {}

  // ── permissions & guards ────────────────────────────────────────────────

  private office(a: Actor) {
    if (a.role !== 'ADMIN') throw new ForbiddenException('Only the office (admin) can do this');
  }
  private warehouse(a: Actor) {
    if (a.role !== 'ADMIN' && a.role !== 'INVENTORY') throw new ForbiddenException('You do not have permission for this action');
  }

  /** Locks the order row for the whole transaction, so two staff members cannot act on it at once. */
  private async lock(tx: Tx, id: string, expectedUpdatedAt?: string): Promise<LockedOrder> {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${id} FOR UPDATE`;
    const o = await tx.order.findUnique({ where: { id }, include: { items: true, invoice: true } });
    if (!o) throw new NotFoundException('Order not found');
    if (expectedUpdatedAt && o.updatedAt.toISOString() !== expectedUpdatedAt) {
      throw new ConflictException('This order was just changed by someone else. Refresh and check where it is now.');
    }
    return o;
  }

  private async log(tx: Tx, o: { id: string; lifecycleStatus: any; workflowStage: any }, note: string, userId?: string) {
    await tx.orderEvent.create({ data: { orderId: o.id, lifecycleStatus: o.lifecycleStatus, workflowStage: o.workflowStage, note, userId } });
  }

  private async run(
    orderId: string, actor: Actor, expected: string | undefined,
    fn: (tx: Tx, o: LockedOrder) => Promise<{ milestone?: Milestone } | void>,
  ) {
    const res = await this.prisma.$transaction(async tx => fn(tx, await this.lock(tx, orderId, expected)), { timeout: 15000 });
    if (res && res.milestone) this.notifications.send(orderId, res.milestone);
    return this.orders.findOne(orderId);
  }

  // ── stock helpers (always inside the order's transaction) ───────────────

  private async lockProduct(tx: Tx, productId: string) {
    await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
    return tx.product.findUniqueOrThrow({ where: { id: productId } });
  }

  /** Hold what is on the shelf for this order. Any shortage stays as demand to source from a supplier. */
  private async reserve(tx: Tx, orderId: string) {
    const items = await tx.orderItem.findMany({ where: { orderId }, orderBy: { productId: 'asc' } });
    for (const it of items) await this.reserveItem(tx, it, it.quantity);
  }

  /** Make sure `target` units of this line are reserved (as far as available stock allows). Returns units now reserved. */
  private async reserveItem(tx: Tx, it: { id: string; productId: string; quantity: number; deductedQuantity: number; reservedQuantity: number }, target: number) {
    const p = await this.lockProduct(tx, it.productId);
    const available = Math.max(0, p.stock - p.reservedQuantity);
    const need = Math.max(0, target - it.deductedQuantity - it.reservedQuantity);
    const take = Math.min(need, available);
    if (take > 0) {
      await tx.orderItem.update({ where: { id: it.id }, data: { reservedQuantity: { increment: take } } });
      await tx.product.update({ where: { id: p.id }, data: { reservedQuantity: { increment: take } } });
    }
    return it.reservedQuantity + take;
  }

  /** Give back everything this order was holding. Goods stay on the shelf. */
  private async release(tx: Tx, orderId: string) {
    const items = await tx.orderItem.findMany({ where: { orderId, reservedQuantity: { gt: 0 } }, orderBy: { productId: 'asc' } });
    for (const it of items) {
      await this.lockProduct(tx, it.productId);
      await tx.product.update({ where: { id: it.productId }, data: { reservedQuantity: { decrement: it.reservedQuantity } } });
    }
    await tx.orderItem.updateMany({ where: { orderId }, data: { reservedQuantity: 0, pickedQuantity: 0, packChecked: false } });
  }

  /** Physical handover: the ONLY place an order deducts stock. stockSettledAt guarantees it happens once. */
  private async settleStock(tx: Tx, o: LockedOrder, actor: Actor) {
    if (o.stockSettledAt) return;
    const items = await tx.orderItem.findMany({ where: { orderId: o.id }, orderBy: { productId: 'asc' } });
    for (const it of items) {
      const qty = it.quantity - it.deductedQuantity;
      if (qty <= 0) continue;
      if (it.pickedQuantity < it.quantity) throw new BadRequestException('Every unit must be picked before handover.');
      await this.lockProduct(tx, it.productId);
      await this.inventory.move(tx, {
        productId: it.productId, type: 'SALE', quantity: -qty,
        reason: `Handed over: order ${o.orderNumber}`, reference: o.orderNumber, userId: actor.id,
      });
      await tx.product.update({ where: { id: it.productId }, data: { reservedQuantity: { decrement: Math.min(it.reservedQuantity, qty) } } });
      await tx.orderItem.update({ where: { id: it.id }, data: { deductedQuantity: it.quantity, reservedQuantity: 0 } });
    }
    await tx.order.update({ where: { id: o.id }, data: { stockSettledAt: new Date() } });
  }

  // ── payment (office) ────────────────────────────────────────────────────

  /** Confirm the money arrived. If the customer did not enter a code, the office types the one from the M-Pesa statement. */
  verifyPayment(orderId: string, actor: Actor, code?: string, expected?: string) {
    this.office(actor);
    return this.run(orderId, actor, expected, async (tx, o) => {
      if (o.paymentMethod === 'CASH') throw new BadRequestException('This is a pay-on-delivery order: payment is collected at handover.');
      if (o.lifecycleStatus !== 'AWAITING_VERIFICATION' && o.lifecycleStatus !== 'AWAITING_PAYMENT') {
        throw new BadRequestException('This order is not waiting for payment.');
      }
      const receipt = normalizeMpesaCode(code || o.paymentReference || '');
      if (!receipt) throw new BadRequestException('Enter the 10-character M-Pesa confirmation code.');
      const clash = await tx.order.findFirst({ where: { id: { not: o.id }, OR: [{ paymentReference: receipt }, { mpesaReceiptNumber: receipt }] }, select: { orderNumber: true } });
      if (clash) throw new ConflictException(`That M-Pesa code is already recorded on order ${clash.orderNumber}.`);
      const u = await tx.order.update({
        where: { id: o.id },
        data: { lifecycleStatus: 'PAID', paymentStatus: 'PAID', mpesaReceiptNumber: receipt, paidAt: new Date() },
      });
      await this.log(tx, u, `Payment confirmed (M-Pesa ${receipt})`, actor.id);
      return { milestone: 'payment_verified' };
    });
  }

  rejectPayment(orderId: string, actor: Actor, note: string, expected?: string) {
    this.office(actor);
    if (!note?.trim()) throw new BadRequestException('Say why the payment was not accepted.');
    return this.run(orderId, actor, expected, async (tx, o) => {
      if (o.lifecycleStatus !== 'AWAITING_VERIFICATION') throw new BadRequestException('There is no submitted payment to reject.');
      const u = await tx.order.update({
        where: { id: o.id }, data: { lifecycleStatus: 'AWAITING_PAYMENT', paymentStatus: 'PENDING', paymentReference: null, paymentReferenceAt: null },
      });
      await this.log(tx, u, `Payment code ${o.paymentReference} not accepted: ${note.trim()}`, actor.id);
    });
  }

  /** Out-of-zone delivery: the office agrees a fee with the customer, or assigns a zone, before approving. */
  setDelivery(orderId: string, actor: Actor, d: { zoneId?: string; fee?: number }, expected?: string) {
    this.office(actor);
    return this.run(orderId, actor, expected, async (tx, o) => {
      if (o.fulfillmentMode !== 'DELIVERY') throw new BadRequestException('This is a pickup order.');
      if (o.workflowStage !== 'OFFICE_REVIEW') throw new BadRequestException('Delivery can only change before office approval.');
      let fee = d.fee ?? 0;
      let zoneId: string | null = null;
      if (d.zoneId) {
        const z = await tx.deliveryZone.findUnique({ where: { id: d.zoneId } });
        if (!z) throw new BadRequestException('Delivery zone not found.');
        fee = Number(z.fee); zoneId = z.id;
      } else if (d.fee === undefined || d.fee < 0) throw new BadRequestException('Choose a zone or enter a delivery fee.');
      const code = o.discountCodeId ? await tx.discountCode.findUnique({ where: { id: o.discountCodeId } }) : null;
      const discount = code?.type === 'FREE_DELIVERY' ? fee : Number(o.discountAmount);
      const total = Math.max(0, Number(o.subtotal) + fee - discount);
      const u = await tx.order.update({
        where: { id: o.id },
        data: { deliveryZoneId: zoneId, deliveryFee: fee, discountAmount: discount, totalAmount: total, deliveryResolved: true },
      });
      await this.log(tx, u, `Delivery fee set to KES ${fee} (total KES ${total})`, actor.id);
    });
  }

  // ── office approval ─────────────────────────────────────────────────────

  /** "Confirm, issue invoice and send to inventory": approval, invoice and stock reservation in ONE transaction. */
  approve(orderId: string, actor: Actor, expected?: string) {
    this.office(actor);
    return this.run(orderId, actor, expected, async (tx, o) => {
      if (o.reviewedAt && o.invoice) return; // already approved: retrying is harmless
      if (o.workflowStage !== 'OFFICE_REVIEW' || !['PAID', 'PAY_ON_DELIVERY'].includes(o.lifecycleStatus)) {
        throw new BadRequestException('Confirm payment (or the cash-on-delivery arrangement) before office approval.');
      }
      if (o.fulfillmentMode === 'DELIVERY' && !o.deliveryResolved) {
        throw new BadRequestException('Set the delivery fee for this address before approving.');
      }
      if (!o.items.length) throw new BadRequestException('This order has no items.');

      const settings = await tx.settings.findFirst();
      const inv = await tx.orderInvoice.create({
        data: {
          orderId: o.id, issuedById: actor.id, invoiceNumber: `TMP-${randomUUID()}`,
          snapshot: {
            seller: { name: settings?.companyName ?? 'Alpha Computers Nanyuki', address: settings?.address ?? null, email: settings?.contactEmail ?? null, phone: settings?.whatsappNumber ?? null },
            customer: { name: o.customerName, phone: o.customerPhone, email: o.customerEmail, address: o.deliveryAddress },
            orderNumber: o.orderNumber, fulfillmentMode: o.fulfillmentMode, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
            mpesaReceipt: o.mpesaReceiptNumber,
            lines: o.items.map(i => ({ name: i.productName, sku: i.sku, quantity: i.quantity, unitPrice: Number(i.unitPrice), total: Number(i.unitPrice) * i.quantity })),
            subtotal: Number(o.subtotal), deliveryFee: Number(o.deliveryFee), discount: Number(o.discountAmount), total: Number(o.totalAmount),
          } as Prisma.InputJsonValue,
        },
      });
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(inv.seq).padStart(6, '0')}`;
      await tx.orderInvoice.update({ where: { id: inv.id }, data: { invoiceNumber } });

      const u = await tx.order.update({ where: { id: o.id }, data: { reviewedAt: new Date(), reviewedById: actor.id, workflowStage: 'SOURCING' } });
      await this.reserve(tx, o.id);
      await this.log(tx, u, `Office review complete; invoice ${invoiceNumber} issued; sent to inventory`, actor.id);
      return { milestone: 'approved' };
    });
  }

  // ── sourcing & picking (inventory) ──────────────────────────────────────

  /** Record what inventory will do about a shortfall (supplier, expected date). Does not move stock. */
  planSource(orderItemId: string, actor: Actor, d: { supplierId?: string; expectedDate?: string; note?: string }) {
    this.warehouse(actor);
    return this.withItem(orderItemId, actor, undefined, async (tx, o, it) => {
      if (o.workflowStage !== 'SOURCING') throw new BadRequestException('A sourcing plan can only be recorded while the order is being sourced.');
      if (d.supplierId && !(await tx.supplier.findUnique({ where: { id: d.supplierId } }))) throw new BadRequestException('Supplier not found.');
      const date = d.expectedDate ? new Date(d.expectedDate) : null;
      if (date && isNaN(date.getTime())) throw new BadRequestException('Enter a valid expected date.');
      await tx.orderItem.update({ where: { id: it.id }, data: { planSupplierId: d.supplierId || null, planExpectedDate: date, planNote: d.note?.trim() || null } });
      await this.log(tx, o, `Sourcing plan recorded for ${it.productName}`, actor.id);
    });
  }

  /**
   * Pick units for an order line, either from the shelf or by receiving them from a supplier.
   * A supplier receipt adds real stock AND picks it for this order in one step. The receipt id makes a
   * retried request safe: goods are never added twice.
   */
  sourceItem(
    orderItemId: string, actor: Actor,
    d: { source: 'warehouse' | 'supplier'; quantity: number; receiptId?: string; supplierId?: string; unitCost?: number; reference?: string },
    expected?: string,
  ) {
    this.warehouse(actor);
    return this.withItem(orderItemId, actor, expected, async (tx, o, it) => {
      if (o.workflowStage !== 'SOURCING') throw new BadRequestException('Items can only be picked after office approval and before packing starts.');
      const remaining = it.quantity - it.pickedQuantity;
      if (!Number.isInteger(d.quantity) || d.quantity < 1 || d.quantity > remaining) {
        throw new BadRequestException(remaining ? `Enter a quantity between 1 and ${remaining}.` : 'This line is already fully picked.');
      }

      if (d.source === 'supplier') {
        if (!d.receiptId) throw new BadRequestException('Missing receipt id.');
        if (await tx.sourcingReceipt.findUnique({ where: { id: d.receiptId } })) return; // retry: already recorded
        if (d.supplierId && !(await tx.supplier.findUnique({ where: { id: d.supplierId } }))) throw new BadRequestException('Supplier not found.');
        await this.lockProduct(tx, it.productId);
        await this.inventory.move(tx, {
          productId: it.productId, type: 'RECEIVED', quantity: d.quantity,
          reason: `Received for order ${o.orderNumber}`, reference: d.reference || o.orderNumber, userId: actor.id,
        });
        if (d.unitCost !== undefined) await tx.product.update({ where: { id: it.productId }, data: { costPrice: d.unitCost } });
      }

      // make sure enough is reserved for the units being picked
      const wantReserved = it.pickedQuantity + d.quantity;
      const nowReserved = await this.reserveItem(tx, it, wantReserved);
      if (nowReserved < wantReserved) {
        const canPick = nowReserved - it.pickedQuantity;
        throw new BadRequestException(
          canPick > 0 ? `Only ${canPick} available on the shelf for this order. Receive the rest from a supplier.`
                      : 'None available on the shelf for this order. Receive it from a supplier.',
        );
      }
      await tx.orderItem.update({ where: { id: it.id }, data: { pickedQuantity: { increment: d.quantity } } });
      await tx.sourcingReceipt.create({
        data: {
          id: d.receiptId ?? randomUUID(), orderItemId: it.id, source: d.source === 'supplier' ? 'SUPPLIER' : 'WAREHOUSE',
          supplierId: d.supplierId || null, quantity: d.quantity, unitCost: d.unitCost, reference: d.reference?.trim() || null, createdById: actor.id,
        },
      });

      // all lines picked -> ready to pack
      const all = await tx.orderItem.findMany({ where: { orderId: o.id } });
      const done = all.every(i => i.pickedQuantity >= i.quantity);
      const u = done ? await tx.order.update({ where: { id: o.id }, data: { workflowStage: 'READY_TO_PACK', inventoryAssigneeId: o.inventoryAssigneeId ?? actor.id } }) : o;
      await this.log(tx, u, `${d.source === 'supplier' ? 'Received from supplier and picked' : 'Picked from stock'}: ${d.quantity} x ${it.productName}${done ? ' (all items picked)' : ''}`, actor.id);
    });
  }

  reportIssue(orderId: string, actor: Actor, text: string) {
    this.warehouse(actor);
    if (!text?.trim()) throw new BadRequestException('Describe the problem the office needs to decide on.');
    return this.run(orderId, actor, undefined, async (tx, o) => {
      if (!['SOURCING', 'READY_TO_PACK', 'PACKING', 'PACKED'].includes(o.workflowStage)) throw new BadRequestException('A problem can only be reported while the order is in the warehouse.');
      await tx.order.update({ where: { id: o.id }, data: { inventoryIssue: text.trim().slice(0, 1000) } });
      await this.log(tx, o, `Inventory needs an office decision: ${text.trim().slice(0, 300)}`, actor.id);
    });
  }

  resolveIssue(orderId: string, actor: Actor, decision: string) {
    this.office(actor);
    if (!decision?.trim()) throw new BadRequestException('Record your decision before resuming.');
    return this.run(orderId, actor, undefined, async (tx, o) => {
      if (!(o as any).inventoryIssue) throw new BadRequestException('There is no open problem on this order.');
      await tx.order.update({ where: { id: o.id }, data: { inventoryIssue: null } });
      await this.log(tx, o, `Office decision recorded; fulfilment resumed: ${decision.trim().slice(0, 300)}`, actor.id);
    });
  }

  // ── packing ─────────────────────────────────────────────────────────────

  private blocked(o: LockedOrder) {
    if ((o as any).inventoryIssue) throw new BadRequestException('Resolve the open problem with the office before continuing.');
  }

  startPacking(orderId: string, actor: Actor, expected?: string) {
    this.warehouse(actor);
    return this.run(orderId, actor, expected, async (tx, o) => {
      this.blocked(o);
      if (o.workflowStage !== 'READY_TO_PACK') throw new BadRequestException('Complete office review and pick every unit before packing.');
      if (!o.invoice) throw new BadRequestException('The office must issue the invoice before packing.');
      if (o.items.some(i => i.pickedQuantity < i.quantity)) throw new BadRequestException('Pick every unit before packing.');
      const u = await tx.order.update({ where: { id: o.id }, data: { workflowStage: 'PACKING', lifecycleStatus: 'FULFILLING', inventoryAssigneeId: o.inventoryAssigneeId ?? actor.id } });
      await this.log(tx, u, 'Order is being packed', actor.id);
      return { milestone: 'packing' };
    });
  }

  checkItem(orderItemId: string, actor: Actor, checked: boolean) {
    this.warehouse(actor);
    return this.withItem(orderItemId, actor, undefined, async (tx, o, it) => {
      this.blocked(o);
      if (o.workflowStage !== 'PACKING') throw new BadRequestException('Start packing this order first.');
      await tx.orderItem.update({ where: { id: it.id }, data: { packChecked: !!checked } });
    });
  }

  markPacked(orderId: string, actor: Actor, expected?: string) {
    this.warehouse(actor);
    return this.run(orderId, actor, expected, async (tx, o) => {
      this.blocked(o);
      if (o.workflowStage !== 'PACKING') throw new BadRequestException('Start packing this order first.');
      if (o.items.some(i => !i.packChecked)) throw new BadRequestException('Check every item and quantity before marking the order packed.');
      const u = await tx.order.update({ where: { id: o.id }, data: { workflowStage: 'PACKED' } });
      await this.log(tx, u, 'Order packed; awaiting handover', actor.id);
    });
  }

  // ── handover ────────────────────────────────────────────────────────────

  dispatch(orderId: string, actor: Actor, rider: { name: string; phone: string }, expected?: string) {
    this.warehouse(actor);
    return this.run(orderId, actor, expected, async (tx, o) => {
      this.blocked(o);
      if (o.workflowStage !== 'PACKED') throw new BadRequestException('Mark every item packed before handover.');
      if (o.fulfillmentMode !== 'DELIVERY') throw new BadRequestException('This is a pickup order: use "ready for collection".');
      const name = rider.name?.trim();
      const phone = normalizePhone(rider.phone || '');
      if (!name || !phone) throw new BadRequestException('Enter the rider name and a valid phone number before handoff.');
      const u = await tx.order.update({
        where: { id: o.id },
        data: { workflowStage: 'DISPATCHED', lifecycleStatus: 'FULFILLING', riderName: name, riderPhone: phone, dispatchedAt: new Date() },
      });
      await this.settleStock(tx, o, actor); // goods leave the shop NOW
      await this.log(tx, u, `Order dispatched · Rider: ${name} (${phone})`, actor.id);
      return { milestone: 'dispatched' };
    });
  }

  readyPickup(orderId: string, actor: Actor, expected?: string) {
    this.warehouse(actor);
    return this.run(orderId, actor, expected, async (tx, o) => {
      this.blocked(o);
      if (o.workflowStage !== 'PACKED') throw new BadRequestException('Mark every item packed before handover.');
      if (o.fulfillmentMode !== 'PICKUP') throw new BadRequestException('This is a delivery order: dispatch it with a rider.');
      const u = await tx.order.update({ where: { id: o.id }, data: { workflowStage: 'READY_PICKUP', lifecycleStatus: 'FULFILLING' } });
      await this.log(tx, u, 'Order ready for pickup (stock stays reserved until collected)', actor.id);
      return { milestone: 'ready_pickup' };
    });
  }

  // ── completion & failure (office) ───────────────────────────────────────

  /** Delivery or collection confirmed. For cash on delivery the office also confirms the money was collected. */
  complete(orderId: string, actor: Actor, collectPayment: boolean, expected?: string) {
    this.office(actor);
    return this.run(orderId, actor, expected, async (tx, o) => {
      if (o.workflowStage !== 'DISPATCHED' && o.workflowStage !== 'READY_PICKUP') {
        throw new BadRequestException('Dispatch the order or mark it ready for pickup first.');
      }
      const data: Prisma.OrderUpdateInput = {};
      if (o.paymentStatus !== 'PAID') {
        if (o.paymentMethod !== 'CASH') throw new BadRequestException('Verify the M-Pesa payment before completing this order.');
        if (!collectPayment) throw new BadRequestException('Confirm that the full payment was collected before completing this order.');
        data.paymentStatus = 'PAID'; data.paidAt = new Date();
      }
      await this.settleStock(tx, o, actor); // pickup: stock only leaves now
      const pickup = o.fulfillmentMode === 'PICKUP';
      const u = await tx.order.update({
        where: { id: o.id },
        data: { ...data, workflowStage: 'DELIVERED', lifecycleStatus: 'COMPLETED', deliveredAt: new Date(), ...(pickup ? { dispatchedAt: o.dispatchedAt ?? new Date() } : {}) },
      });
      await this.log(tx, u, pickup ? 'Order collected by customer' : 'Order delivered', actor.id);
      return { milestone: pickup ? 'collected' : 'delivered' };
    });
  }

  /** Customer was unreachable / refused. The goods are with the rider: open a return, do NOT restock yet. */
  failedDelivery(orderId: string, actor: Actor, reason: string, expected?: string) {
    this.office(actor);
    if (!reason?.trim()) throw new BadRequestException('Choose or enter the reason delivery failed.');
    return this.run(orderId, actor, expected, async (tx, o) => {
      if (o.deliveryFailedAt && o.lifecycleStatus === 'CANCELLED') return; // repeat request: no second return
      if (o.workflowStage !== 'DISPATCHED' || o.fulfillmentMode !== 'DELIVERY') throw new BadRequestException('Only an order currently with the rider can be marked as a failed delivery.');
      const u = await tx.order.update({
        where: { id: o.id },
        data: { lifecycleStatus: 'CANCELLED', workflowStage: 'AWAITING_RETURN', deliveryFailedAt: new Date(), deliveryFailureReason: reason.trim().slice(0, 400), cancelledAt: new Date(), cancelReason: `Delivery failed: ${reason.trim().slice(0, 300)}` },
      });
      await tx.orderReturn.create({
        data: {
          orderId: o.id, kind: 'CANCELLED_DISPATCH', status: 'APPROVED',
          reason: `Failed delivery: ${reason.trim().slice(0, 300)}. Awaiting goods from the rider; inspect before restocking.`,
          items: { create: o.items.filter(i => i.deductedQuantity > 0).map(i => ({ orderItemId: i.id, quantity: i.deductedQuantity })) },
        },
      });
      await this.log(tx, u, `Delivery failed · ${reason.trim().slice(0, 300)} · Return all goods to inventory`, actor.id);
      return { milestone: 'delivery_failed' };
    });
  }

  /** Cancel before the goods leave. Reservations are released; goods already received stay in stock. */
  cancel(orderId: string, actor: Actor, reason: string, expected?: string) {
    this.office(actor);
    if (!reason?.trim()) throw new BadRequestException('Give a reason for cancelling.');
    return this.run(orderId, actor, expected, async (tx, o) => {
      if (o.lifecycleStatus === 'CANCELLED' || o.lifecycleStatus === 'STALE') return; // already closed
      if (o.workflowStage === 'DISPATCHED') throw new BadRequestException('This order is with the rider. Use "Delivery failed" if it could not be delivered.');
      if (!PRE_HANDOFF.includes(o.workflowStage)) throw new BadRequestException('This order is already closed. Use a return instead.');
      await this.release(tx, o.id);
      if (o.discountCodeId) await tx.discountCode.update({ where: { id: o.discountCodeId }, data: { usedCount: { decrement: 1 } } });
      const u = await tx.order.update({
        where: { id: o.id },
        data: { lifecycleStatus: 'CANCELLED', workflowStage: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason.trim().slice(0, 300), inventoryIssue: null },
      });
      await this.log(tx, u, `Order cancelled: ${reason.trim().slice(0, 300)}`, actor.id);
      return { milestone: 'cancelled' };
    });
  }

  // ── plumbing ────────────────────────────────────────────────────────────

  private async withItem(
    orderItemId: string, actor: Actor, expected: string | undefined,
    fn: (tx: Tx, o: LockedOrder, it: LockedOrder['items'][number]) => Promise<void>,
  ) {
    const item = await this.prisma.orderItem.findUnique({ where: { id: orderItemId }, select: { orderId: true } });
    if (!item) throw new NotFoundException('Order item not found');
    return this.run(item.orderId, actor, expected, async (tx, o) => {
      const it = o.items.find(i => i.id === orderItemId);
      if (!it) throw new NotFoundException('Order item not found');
      await fn(tx, o, it);
    });
  }
}

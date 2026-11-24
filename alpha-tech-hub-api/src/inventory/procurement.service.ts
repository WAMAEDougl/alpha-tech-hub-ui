import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

const code = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (const b of randomBytes(4)) s += alphabet[b % alphabet.length];
  return s;
};
const ymd = () => { const d = new Date(); return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };

@Injectable()
export class ProcurementService {
  constructor(private prisma: PrismaService, private inventory: InventoryService) {}

  // ── suppliers ───────────────────────────────────────────────────────────

  suppliers() {
    return this.prisma.supplier.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
  }
  createSupplier(d: { name: string; phone?: string; email?: string; notes?: string }) {
    return this.prisma.supplier.create({ data: { name: d.name.trim(), phone: d.phone?.trim() || null, email: d.email?.trim() || null, notes: d.notes?.trim() || null } });
  }
  async updateSupplier(id: string, d: { name?: string; phone?: string; email?: string; notes?: string; isActive?: boolean }) {
    try { return await this.prisma.supplier.update({ where: { id }, data: d }); } catch { throw new NotFoundException('Supplier not found'); }
  }

  // ── purchase orders ─────────────────────────────────────────────────────

  private poView(p: any) {
    return {
      id: p.id, number: p.number, status: p.status, notes: p.notes, createdAt: p.createdAt, orderedAt: p.orderedAt, receivedAt: p.receivedAt,
      supplier: { id: p.supplier.id, name: p.supplier.name },
      items: p.items.map((i: any) => ({ id: i.id, productId: i.productId, name: i.product.name, sku: i.product.sku, quantity: i.quantity, received: i.receivedQuantity, unitCost: i.unitCost === null ? null : Number(i.unitCost) })),
      total: p.items.reduce((s: number, i: any) => s + i.quantity * Number(i.unitCost ?? 0), 0),
    };
  }
  private poInclude = { supplier: true, items: { include: { product: { select: { name: true, sku: true } } } } } as const;

  async purchaseOrders(status?: string) {
    const rows = await this.prisma.purchaseOrder.findMany({ where: status ? { status: status as any } : {}, include: this.poInclude, orderBy: { createdAt: 'desc' }, take: 200 });
    return rows.map(r => this.poView(r));
  }

  async purchaseOrder(id: string) {
    const p = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: this.poInclude });
    if (!p) throw new NotFoundException('Purchase order not found');
    return this.poView(p);
  }

  async createPurchaseOrder(userId: string, d: { supplierId: string; notes?: string; items: { productId: string; quantity: number; unitCost?: number }[] }) {
    if (!(await this.prisma.supplier.findFirst({ where: { id: d.supplierId, isActive: true } }))) throw new BadRequestException('Choose an active supplier.');
    const ids = new Set(d.items.map(i => i.productId));
    if (ids.size !== d.items.length) throw new BadRequestException('List each product only once.');
    if ((await this.prisma.product.count({ where: { id: { in: [...ids] } } })) !== ids.size) throw new BadRequestException('One of those products no longer exists.');
    for (let a = 0; a < 5; a++) {
      try {
        const p = await this.prisma.purchaseOrder.create({
          data: {
            number: `PO-${ymd()}-${code()}`, supplierId: d.supplierId, notes: d.notes?.trim() || null, createdById: userId,
            items: { create: d.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost ?? null })) },
          },
          include: this.poInclude,
        });
        return this.poView(p);
      } catch (e: any) { if (e?.code !== 'P2002') throw e; }
    }
    throw new BadRequestException('Could not create the purchase order, please try again.');
  }

  async setPurchaseOrderStatus(id: string, status: 'ORDERED' | 'CANCELLED') {
    const p = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!p) throw new NotFoundException('Purchase order not found');
    if (status === 'ORDERED' && p.status !== 'DRAFT') throw new BadRequestException('Only a draft can be marked as ordered.');
    if (status === 'CANCELLED' && !['DRAFT', 'ORDERED'].includes(p.status)) throw new BadRequestException('Goods have already been received against this order.');
    await this.prisma.purchaseOrder.update({ where: { id }, data: { status, ...(status === 'ORDERED' ? { orderedAt: new Date() } : {}) } });
    return this.purchaseOrder(id);
  }

  /** Goods arrived (fully or in part). `receiptId` is client-generated: retrying the same request cannot add the goods twice. */
  async receivePurchaseOrder(id: string, userId: string, d: { receiptId: string; reference?: string; items: { itemId: string; quantity: number }[] }) {
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${id} FOR UPDATE`;
      if (await tx.purchaseReceipt.findUnique({ where: { id: d.receiptId } })) return; // already recorded
      const p = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
      if (!p) throw new NotFoundException('Purchase order not found');
      if (!['ORDERED', 'PARTIAL'].includes(p.status)) throw new BadRequestException(p.status === 'DRAFT' ? 'Mark the purchase order as ordered before receiving goods.' : 'This purchase order is closed.');
      let any = false;
      for (const line of d.items) {
        if (!line.quantity) continue;
        const it = p.items.find(i => i.id === line.itemId);
        if (!it) throw new BadRequestException('That item is not on this purchase order.');
        if (line.quantity < 0 || line.quantity > it.quantity - it.receivedQuantity) throw new BadRequestException(`You can receive at most ${it.quantity - it.receivedQuantity} more of this item.`);
        await this.inventory.move(tx, { productId: it.productId, type: 'RECEIVED', quantity: line.quantity, reason: `Purchase order ${p.number}`, reference: d.reference?.trim() || p.number, userId });
        if (it.unitCost !== null) await tx.product.update({ where: { id: it.productId }, data: { costPrice: it.unitCost } });
        await tx.purchaseOrderItem.update({ where: { id: it.id }, data: { receivedQuantity: { increment: line.quantity } } });
        any = true;
      }
      if (!any) throw new BadRequestException('Enter a quantity for at least one item.');
      const fresh = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const full = fresh.every(i => i.receivedQuantity >= i.quantity);
      await tx.purchaseOrder.update({ where: { id }, data: { status: full ? 'RECEIVED' : 'PARTIAL', ...(full ? { receivedAt: new Date() } : {}) } });
      await tx.purchaseReceipt.create({ data: { id: d.receiptId, purchaseOrderId: id, createdById: userId } });
    });
    return this.purchaseOrder(id);
  }

  // ── stock-takes ─────────────────────────────────────────────────────────

  async stockTakes() {
    const rows = await this.prisma.stockTake.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { items: true } });
    return rows.map(t => ({
      id: t.id, status: t.status, note: t.note, createdAt: t.createdAt, appliedAt: t.appliedAt,
      products: t.items.length, counted: t.items.filter(i => i.counted !== null).length,
      discrepancies: t.items.filter(i => i.counted !== null && i.counted !== i.expected).length,
    }));
  }

  /** Start a count: snapshot what the books say for every active product. */
  async startStockTake(userId: string, note?: string) {
    if (await this.prisma.stockTake.findFirst({ where: { status: 'OPEN' } })) throw new BadRequestException('Finish or cancel the open stock-take first.');
    const products = await this.prisma.product.findMany({ where: { isActive: true }, select: { id: true, stock: true } });
    const t = await this.prisma.stockTake.create({
      data: { note: note?.trim() || null, createdById: userId, items: { create: products.map(p => ({ productId: p.id, expected: p.stock })) } },
    });
    return this.stockTake(t.id);
  }

  async stockTake(id: string) {
    const t = await this.prisma.stockTake.findUnique({ where: { id }, include: { items: { include: { product: { select: { name: true, sku: true, location: true, reservedQuantity: true } } }, orderBy: { product: { name: 'asc' } } } } });
    if (!t) throw new NotFoundException('Stock-take not found');
    return {
      id: t.id, status: t.status, note: t.note, createdAt: t.createdAt, appliedAt: t.appliedAt,
      items: t.items.map(i => ({
        id: i.id, productId: i.productId, name: i.product.name, sku: i.product.sku, location: i.product.location, reserved: i.product.reservedQuantity,
        expected: i.expected, counted: i.counted, difference: i.counted === null ? null : i.counted - i.expected,
      })),
    };
  }

  async saveCounts(id: string, counts: { productId: string; counted: number | null }[]) {
    const t = await this.prisma.stockTake.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Stock-take not found');
    if (t.status !== 'OPEN') throw new BadRequestException('This stock-take is closed.');
    await this.prisma.$transaction(counts.map(c =>
      this.prisma.stockTakeItem.updateMany({ where: { stockTakeId: id, productId: c.productId }, data: { counted: c.counted } })));
    return this.stockTake(id);
  }

  /** Apply the discrepancies. Uses (counted - expected) so sales made during the count are not undone. */
  async applyStockTake(id: string, userId: string) {
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM stock_takes WHERE id = ${id} FOR UPDATE`;
      const t = await tx.stockTake.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
      if (!t) throw new NotFoundException('Stock-take not found');
      if (t.status !== 'OPEN') throw new BadRequestException('This stock-take is already closed.');
      for (const i of t.items) {
        if (i.counted === null) continue;
        const delta = i.counted - i.expected;
        if (delta === 0) continue;
        if (i.product.stock + delta < i.product.reservedQuantity) {
          throw new BadRequestException(`"${i.product.name}": ${i.product.reservedQuantity} units are reserved for orders, so the count cannot bring stock below that.`);
        }
        await this.inventory.move(tx, { productId: i.productId, type: 'ADJUSTMENT', quantity: delta, reason: `Stock-take${t.note ? `: ${t.note}` : ''}`, reference: `ST-${t.id.slice(0, 8)}`, userId });
      }
      await tx.stockTake.update({ where: { id }, data: { status: 'APPLIED', appliedAt: new Date() } });
    });
    return this.stockTake(id);
  }

  async cancelStockTake(id: string) {
    const res = await this.prisma.stockTake.updateMany({ where: { id, status: 'OPEN' }, data: { status: 'CANCELLED' } });
    if (!res.count) throw new BadRequestException('Only an open stock-take can be cancelled.');
    return this.stockTake(id);
  }

  // ── restock planning & insights ─────────────────────────────────────────

  /** What to buy: low/out items plus the shortfall on orders already approved or waiting. */
  async reorderSuggestions() {
    const [products, approved, waiting] = await Promise.all([
      this.prisma.product.findMany({ where: { isActive: true } }),
      this.prisma.orderItem.groupBy({ by: ['productId'], _sum: { quantity: true, pickedQuantity: true }, where: { order: { reviewedAt: { not: null }, stockSettledAt: null, lifecycleStatus: { notIn: ['CANCELLED', 'STALE', 'COMPLETED'] } } } }),
      this.prisma.orderItem.groupBy({ by: ['productId'], _sum: { quantity: true }, where: { order: { reviewedAt: null, lifecycleStatus: { notIn: ['CANCELLED', 'STALE', 'COMPLETED'] } } } }),
    ]);
    const toPick = new Map(approved.map(a => [a.productId, Math.max(0, (a._sum.quantity ?? 0) - (a._sum.pickedQuantity ?? 0))]));
    const wait = new Map(waiting.map(w => [w.productId, w._sum.quantity ?? 0]));
    return products
      .map(p => {
        const available = Math.max(0, p.stock - p.reservedQuantity);
        const demand = (toPick.get(p.id) ?? 0) + (wait.get(p.id) ?? 0);
        // free stock after covering what customers already want
        const shortfall = Math.max(0, demand - available);
        const target = Math.max(p.reorderLevel * 2, demand);
        const suggested = available - demand <= p.reorderLevel ? Math.max(1, target - (available - 0)) : 0;
        return { productId: p.id, name: p.name, sku: p.sku, available, reorderLevel: p.reorderLevel, demand, shortfall, suggested, costPrice: p.costPrice === null ? null : Number(p.costPrice) };
      })
      .filter(r => r.suggested > 0)
      .sort((a, b) => b.shortfall - a.shortfall || a.available - b.available);
  }

  async insights() {
    const since30 = new Date(Date.now() - 30 * 86400_000);
    const since90 = new Date(Date.now() - 90 * 86400_000);
    const [products, sold30, sold90] = await Promise.all([
      this.prisma.product.findMany({ where: { isActive: true } }),
      this.prisma.stockMovement.groupBy({ by: ['productId'], where: { type: 'SALE', createdAt: { gte: since30 } }, _sum: { quantity: true } }),
      this.prisma.stockMovement.groupBy({ by: ['productId'], where: { type: 'SALE', createdAt: { gte: since90 } }, _sum: { quantity: true } }),
    ]);
    const s30 = new Map(sold30.map(s => [s.productId, -(s._sum.quantity ?? 0)]));
    const s90 = new Set(sold90.map(s => s.productId));
    const atCost = products.reduce((s, p) => s + p.stock * Number(p.costPrice ?? 0), 0);
    const atRetail = products.reduce((s, p) => s + p.stock * Number(p.price), 0);
    return {
      stockValueAtCost: atCost, stockValueAtRetail: atRetail,
      missingCost: products.filter(p => p.costPrice === null && p.stock > 0).length,
      topMovers: products.map(p => ({ name: p.name, sku: p.sku, sold: s30.get(p.id) ?? 0 })).filter(p => p.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 8),
      slowMovers: products.filter(p => p.stock > 0 && !s90.has(p.id)).map(p => ({ name: p.name, sku: p.sku, stock: p.stock, value: p.stock * Number(p.costPrice ?? p.price) })).sort((a, b) => b.value - a.value).slice(0, 8),
    };
  }
}

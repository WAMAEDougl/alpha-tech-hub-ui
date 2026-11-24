import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type Tx = Prisma.TransactionClient;

export interface MovementInput {
  productId: string;
  type: StockMovementType;
  /** Signed: positive = stock in, negative = stock out. */
  quantity: number;
  reason?: string;
  reference?: string;
  userId?: string | null;
}

/** Open orders that are approved (so stock is reserved) but not yet handed over. */
const APPROVED_OPEN: Prisma.OrderWhereInput = { reviewedAt: { not: null }, stockSettledAt: null, lifecycleStatus: { notIn: ['CANCELLED', 'STALE', 'COMPLETED'] } };

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * The ONLY place physical stock changes. Runs inside the caller's transaction.
   * Stock-out uses a conditional UPDATE (stock >= qty) so concurrent handoffs can never push stock below zero,
   * and every change leaves a ledger row.
   */
  async move(tx: Tx, m: MovementInput) {
    if (!Number.isInteger(m.quantity) || m.quantity === 0) {
      throw new BadRequestException('Quantity must be a non-zero whole number');
    }
    if (m.quantity < 0) {
      const res = await tx.product.updateMany({
        where: { id: m.productId, stock: { gte: -m.quantity } },
        data: { stock: { decrement: -m.quantity } },
      });
      if (res.count === 0) {
        const p = await tx.product.findUnique({ where: { id: m.productId }, select: { name: true, stock: true } });
        if (!p) throw new NotFoundException('Product not found');
        throw new BadRequestException(`Only ${p.stock} of "${p.name}" on the shelf`);
      }
    } else {
      try {
        await tx.product.update({ where: { id: m.productId }, data: { stock: { increment: m.quantity } } });
      } catch {
        throw new NotFoundException('Product not found');
      }
    }
    const after = await tx.product.findUniqueOrThrow({ where: { id: m.productId }, select: { stock: true } });
    return tx.stockMovement.create({
      data: {
        productId: m.productId, type: m.type, quantity: m.quantity,
        stockBefore: after.stock - m.quantity, stockAfter: after.stock,
        reason: m.reason, reference: m.reference, userId: m.userId ?? null,
      },
    });
  }

  // ── Stock list ───────────────────────────────────────────────────────────

  async stockList(opts: { search?: string; filter?: string }) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(opts.search && {
          OR: [
            { name: { contains: opts.search, mode: 'insensitive' } },
            { sku: { contains: opts.search, mode: 'insensitive' } },
            { brand: { contains: opts.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });

    // demand on open orders: approved lines still to pick, and lines not yet approved (nothing reserved for them)
    const [approved, waiting] = await Promise.all([
      this.prisma.orderItem.groupBy({ by: ['productId'], where: { order: APPROVED_OPEN }, _sum: { quantity: true, pickedQuantity: true } }),
      this.prisma.orderItem.groupBy({
        by: ['productId'], _sum: { quantity: true },
        where: { order: { reviewedAt: null, lifecycleStatus: { notIn: ['CANCELLED', 'STALE', 'COMPLETED'] } } },
      }),
    ]);
    const toSource = new Map(approved.map(a => [a.productId, Math.max(0, (a._sum.quantity ?? 0) - (a._sum.pickedQuantity ?? 0))]));
    const waitingMap = new Map(waiting.map(w => [w.productId, w._sum.quantity ?? 0]));

    const rows = products.map(p => {
      const available = Math.max(0, p.stock - p.reservedQuantity);
      return {
        id: p.id, sku: p.sku, name: p.name, brand: p.brand, category: p.category,
        stock: p.stock, reserved: p.reservedQuantity, available,
        reorderLevel: p.reorderLevel, location: p.location, allowSupplierSourcing: p.allowSupplierSourcing,
        costPrice: p.costPrice === null ? null : Number(p.costPrice), price: Number(p.price),
        toPick: toSource.get(p.id) ?? 0,          // approved orders still need this many picked
        awaitingApproval: waitingMap.get(p.id) ?? 0, // unapproved orders want this many
        status: available <= 0 ? 'OUT' : available <= p.reorderLevel ? 'LOW' : 'OK',
      };
    });
    if (opts.filter === 'low') return rows.filter(r => r.status !== 'OK');
    return rows;
  }

  // ── Movements (stock history) ────────────────────────────────────────────

  async movements(opts: { productId?: string; type?: StockMovementType; limit?: number }) {
    const rows = await this.prisma.stockMovement.findMany({
      where: { ...(opts.productId && { productId: opts.productId }), ...(opts.type && { type: opts.type }) },
      include: { product: { select: { name: true, sku: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(opts.limit ?? 100, 1), 500),
    });
    return rows.map(r => ({
      id: r.id, type: r.type, quantity: r.quantity, stockBefore: r.stockBefore, stockAfter: r.stockAfter,
      reason: r.reason, reference: r.reference, createdAt: r.createdAt,
      productId: r.productId, productName: r.product.name, sku: r.product.sku, by: r.user?.name ?? 'System',
    }));
  }

  // ── Staff actions ────────────────────────────────────────────────────────

  receive(userId: string, d: { productId: string; quantity: number; supplier?: string; reference?: string; costPrice?: number }) {
    return this.prisma.$transaction(async tx => {
      const mv = await this.move(tx, {
        productId: d.productId, type: 'RECEIVED', quantity: d.quantity,
        reason: d.supplier ? `Received from ${d.supplier}` : 'Goods received', reference: d.reference, userId,
      });
      if (d.costPrice !== undefined) await tx.product.update({ where: { id: d.productId }, data: { costPrice: d.costPrice } });
      return mv;
    });
  }

  writeOff(userId: string, d: { productId: string; quantity: number; reason: string }) {
    return this.prisma.$transaction(async tx => {
      const p = await tx.product.findUnique({ where: { id: d.productId }, select: { stock: true, reservedQuantity: true } });
      if (!p) throw new NotFoundException('Product not found');
      // never write off units that are promised to a customer: those must be released first
      const free = p.stock - p.reservedQuantity;
      if (d.quantity > free) throw new BadRequestException(`Only ${Math.max(0, free)} units are free to write off; the rest are reserved for orders.`);
      return this.move(tx, { productId: d.productId, type: 'DAMAGED', quantity: -Math.abs(d.quantity), reason: d.reason, userId });
    });
  }

  /** Quick single-product count: records the difference so the books match the shelf. */
  stockTake(userId: string, d: { productId: string; countedQuantity: number; reason: string }) {
    return this.prisma.$transaction(async tx => {
      const p = await tx.product.findUnique({ where: { id: d.productId }, select: { stock: true, reservedQuantity: true } });
      if (!p) throw new NotFoundException('Product not found');
      if (d.countedQuantity < p.reservedQuantity) {
        throw new BadRequestException(`${p.reservedQuantity} units are reserved for orders, so the count cannot be lower than that. Release or cancel an order first.`);
      }
      const diff = d.countedQuantity - p.stock;
      if (diff === 0) return { unchanged: true, stock: p.stock };
      return this.move(tx, { productId: d.productId, type: 'ADJUSTMENT', quantity: diff, reason: d.reason, userId });
    });
  }

  async updateSettings(productId: string, d: { reorderLevel?: number; location?: string; costPrice?: number; allowSupplierSourcing?: boolean }) {
    try {
      return await this.prisma.product.update({
        where: { id: productId }, data: d,
        select: { id: true, reorderLevel: true, location: true, costPrice: true, allowSupplierSourcing: true },
      });
    } catch {
      throw new NotFoundException('Product not found');
    }
  }

  // ── Workflow overview: how product and orders are moving ─────────────────

  async workflow() {
    const since = new Date(Date.now() - 30 * 86400_000);
    const open = { lifecycleStatus: { notIn: ['CANCELLED', 'STALE'] as any } };
    const [payment, review, sourcing, packing, handoffs, delivered, stockAgg, reservedAgg, flows, recent, products, attention] = await Promise.all([
      this.prisma.order.count({ where: { lifecycleStatus: { in: ['AWAITING_PAYMENT', 'AWAITING_VERIFICATION'] } } }),
      this.prisma.order.count({ where: { workflowStage: 'OFFICE_REVIEW', lifecycleStatus: { in: ['PAID', 'PAY_ON_DELIVERY'] } } }),
      this.prisma.order.count({ where: { ...open, workflowStage: 'SOURCING' } }),
      this.prisma.order.count({ where: { ...open, workflowStage: { in: ['READY_TO_PACK', 'PACKING'] } } }),
      this.prisma.order.count({ where: { ...open, workflowStage: { in: ['PACKED', 'READY_PICKUP', 'DISPATCHED'] } } }),
      this.prisma.order.count({ where: { lifecycleStatus: 'COMPLETED', deliveredAt: { gte: since } } }),
      this.prisma.product.aggregate({ where: { isActive: true }, _sum: { stock: true } }),
      this.prisma.product.aggregate({ where: { isActive: true }, _sum: { reservedQuantity: true } }),
      this.prisma.stockMovement.groupBy({ by: ['type'], where: { createdAt: { gte: since } }, _sum: { quantity: true } }),
      this.movements({ limit: 15 }),
      this.prisma.product.findMany({ where: { isActive: true }, select: { stock: true, reservedQuantity: true, reorderLevel: true, costPrice: true } }),
      this.prisma.order.count({ where: { ...open, inventoryIssue: { not: null } } }),
    ]);
    const flow = (t: string) => flows.find(f => f.type === t)?._sum.quantity ?? 0;
    const units = stockAgg._sum.stock ?? 0;
    const reserved = reservedAgg._sum.reservedQuantity ?? 0;

    return {
      pipeline: [
        { key: 'RECEIVE', label: 'Goods received (30d)', units: flow('RECEIVED'), hint: 'Stock in from suppliers' },
        { key: 'SHELF', label: 'On the shelf', units, hint: `${reserved} reserved, ${Math.max(0, units - reserved)} free to sell` },
        { key: 'PAYMENT', label: 'Awaiting payment', orders: payment, hint: 'Nothing reserved yet', to: '/admin/orders?lane=payment' },
        { key: 'REVIEW', label: 'Office review', orders: review, hint: 'Paid or pay-on-delivery, awaiting approval', to: '/admin/orders?lane=review' },
        { key: 'SOURCING', label: 'To source & pick', orders: sourcing, hint: 'Approved: pick or receive stock', to: '/admin/inventory/sourcing' },
        { key: 'PACKING', label: 'To pack', orders: packing, hint: 'All picked: check and pack', to: '/admin/inventory/packing' },
        { key: 'HANDOFF', label: 'Handoff / out', orders: handoffs, hint: 'Packed, with rider, or waiting for collection', to: '/admin/inventory/handoffs' },
        { key: 'DELIVERED', label: 'Completed (30d)', orders: delivered, hint: 'Delivered or collected' },
      ],
      attention,
      summary: {
        skus: products.length, units, reserved,
        outOfStock: products.filter(p => p.stock - p.reservedQuantity <= 0).length,
        lowStock: products.filter(p => { const a = p.stock - p.reservedQuantity; return a > 0 && a <= p.reorderLevel; }).length,
        stockValueAtCost: products.reduce((s, p) => s + p.stock * Number(p.costPrice ?? 0), 0),
      },
      last30Days: {
        received: flow('RECEIVED'), sold: -flow('SALE'), returned: flow('RETURN'), damaged: -flow('DAMAGED'), adjustments: flow('ADJUSTMENT'),
      },
      recentMovements: recent,
    };
  }
}

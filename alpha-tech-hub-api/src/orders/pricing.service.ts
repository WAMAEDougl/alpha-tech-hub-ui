import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuoteDto } from './dto/create-order.dto';

type Db = PrismaService | Prisma.TransactionClient;

export interface Quote {
  lines: { productId: string; name: string; sku: string; unitPrice: number; quantity: number }[];
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  deliveryZoneId: string | null;
  deliveryZoneName: string | null;
  estimatedDays: string | null;
  /** false = the address matched no zone, so the shop confirms the delivery fee with the customer */
  deliveryResolved: boolean;
  discountCodeId: string | null;
  discountMessage: string | null;
}

/** One place that works out what an order costs. Used by the quote endpoint and by checkout. */
@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async quote(dto: QuoteDto, db: Db = this.prisma, opts: { enforceStock?: boolean } = {}): Promise<Quote> {
    const wanted = new Map<string, number>();
    for (const i of dto.items) wanted.set(i.productId, (wanted.get(i.productId) ?? 0) + i.quantity);

    const products = await db.product.findMany({ where: { id: { in: [...wanted.keys()] }, isActive: true } });
    if (products.length !== wanted.size) {
      throw new BadRequestException('One or more items in your cart are no longer available');
    }

    const lines = products.map(p => {
      const quantity = wanted.get(p.id)!;
      if (opts.enforceStock !== false && !p.allowSupplierSourcing) {
        const available = Math.max(0, p.stock - p.reservedQuantity);
        if (quantity > available) {
          throw new BadRequestException(
            available === 0 ? `"${p.name}" is out of stock` : `Only ${available} of "${p.name}" available`,
          );
        }
      }
      return { productId: p.id, name: p.name, sku: p.sku, unitPrice: Number(p.price), quantity };
    });
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

    // ── delivery ──────────────────────────────────────────────────────────
    let deliveryFee = 0;
    let zone: { id: string; name: string; fee: Prisma.Decimal; estimatedDays: string | null } | null = null;
    let deliveryResolved = true;
    if (dto.fulfillmentMode === 'DELIVERY') {
      const zones = await db.deliveryZone.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
      if (dto.deliveryZoneId) {
        zone = zones.find(z => z.id === dto.deliveryZoneId) ?? null;
        if (!zone) throw new BadRequestException('That delivery area is not available');
      } else if (dto.deliveryArea?.trim()) {
        const area = dto.deliveryArea.trim().toLowerCase();
        zone = zones.find(z => z.areas.some(a => a && (area.includes(a.toLowerCase()) || a.toLowerCase().includes(area)))) ?? null;
      }
      if (zone) deliveryFee = Number(zone.fee);
      else deliveryResolved = false; // out of zone: fee agreed with the shop before approval
    }

    // ── discount ──────────────────────────────────────────────────────────
    let discountAmount = 0;
    let discountCodeId: string | null = null;
    let discountMessage: string | null = null;
    const code = dto.discountCode?.trim().toUpperCase();
    if (code) {
      const d = await db.discountCode.findUnique({ where: { code } });
      const now = new Date();
      if (!d || !d.isActive) throw new BadRequestException('That discount code is not valid');
      if (d.expiresAt && d.expiresAt < now) throw new BadRequestException('That discount code has expired');
      if (d.maxUses !== null && d.usedCount >= d.maxUses) throw new BadRequestException('That discount code has been fully used');
      if (d.minSubtotal !== null && subtotal < Number(d.minSubtotal)) {
        throw new BadRequestException(`That code needs an order of at least KES ${Number(d.minSubtotal).toLocaleString('en-KE')}`);
      }
      if (d.type === 'PERCENT') discountAmount = Math.round((subtotal * Math.min(Number(d.value), 100)) / 100);
      else if (d.type === 'FIXED') discountAmount = Math.min(Number(d.value), subtotal);
      else {
        if (dto.fulfillmentMode !== 'DELIVERY') throw new BadRequestException('That code only applies to delivery orders');
        discountAmount = deliveryFee;
      }
      discountCodeId = d.id;
      discountMessage = `${d.code} applied`;
    }

    const total = Math.max(0, subtotal + deliveryFee - discountAmount);
    return {
      lines, subtotal, deliveryFee, discountAmount, total,
      deliveryZoneId: zone?.id ?? null, deliveryZoneName: zone?.name ?? null, estimatedDays: zone?.estimatedDays ?? null,
      deliveryResolved, discountCodeId, discountMessage,
    };
  }
}

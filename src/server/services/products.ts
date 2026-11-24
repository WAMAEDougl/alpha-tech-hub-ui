import { NotFoundException } from '../http';
import { PrismaService } from '../prisma';
import { InventoryService } from './inventory';
import { CreateProductDto } from '../dto';

/** Fields that must never reach the public storefront. */
function toPublic<T extends Record<string, any>>(p: T) {
  const { costPrice, location, reorderLevel, reservedQuantity, allowSupplierSourcing, ...rest } = p;
  // customers see what can actually be sold: shelf stock minus what is already promised to other orders
  return {
    ...rest, price: Number(rest.price), rating: Number(rest.rating),
    stock: Math.max(0, p.stock - reservedQuantity), supplierSourced: !!allowSupplierSourcing,
  };
}

function toStaff<T extends Record<string, any>>(p: T) {
  return {
    ...p,
    price: Number(p.price),
    rating: Number(p.rating),
    costPrice: p.costPrice === null || p.costPrice === undefined ? null : Number(p.costPrice),
  };
}

export class ProductsService {
  constructor(private prisma: PrismaService, private inventory: InventoryService) {}

  async create(dto: CreateProductDto, userId?: string) {
    const { stock, ...data } = dto;
    return this.prisma.$transaction(async tx => {
      const product = await tx.product.create({ data: { ...data, stock: 0 } as any });
      // Opening stock is a ledger entry too, so the books always add up.
      if (stock > 0) {
        await this.inventory.move(tx, { productId: product.id, type: 'RECEIVED', quantity: stock, reason: 'Opening stock', userId });
      }
      return toStaff(await tx.product.findUniqueOrThrow({ where: { id: product.id } }));
    });
  }

  async findAll(query?: { category?: string; search?: string }, staff = false) {
    const rows = await this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(query?.category && { category: query.category }),
        ...(query?.search && { name: { contains: query.search, mode: 'insensitive' } }),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(p => (staff ? toStaff(p) : toPublic(p)));
  }

  async findOne(id: string, staff = false) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p || (!staff && !p.isActive)) throw new NotFoundException('Product not found');
    return staff ? toStaff(p) : toPublic(p);
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    await this.findOne(id, true);
    // Stock is changed only through inventory movements, never by editing the product.
    const { stock: _ignored, ...data } = dto;
    return toStaff(await this.prisma.product.update({ where: { id }, data: data as any }));
  }

  async remove(id: string) {
    await this.findOne(id, true);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async getMostSold(limit = 5) {
    return this.prisma.$queryRaw`
      SELECT p.id, p.name, p.category, SUM(oi.quantity)::int as total_sold
      FROM products p
      JOIN order_items oi ON oi."productId" = p.id
      JOIN orders o ON o.id = oi."orderId"
      WHERE o.status != 'CANCELLED'
      GROUP BY p.id, p.name, p.category
      ORDER BY total_sold DESC
      LIMIT ${limit}
    `;
  }
}

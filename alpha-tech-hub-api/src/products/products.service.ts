import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto as any });
  }

  async findAll(query?: { category?: string; search?: string }) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(query?.category && { category: query.category }),
        ...(query?.search && { name: { contains: query.search, mode: 'insensitive' } }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async decrementStock(id: string, qty: number) {
    return this.prisma.product.update({
      where: { id },
      data: { stock: { decrement: qty } },
    });
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

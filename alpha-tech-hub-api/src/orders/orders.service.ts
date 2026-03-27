import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:    ['PAID', 'CANCELLED'],
  PAID:       ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED'],
  SHIPPED:    ['DELIVERED'],
  DELIVERED:  [],
  CANCELLED:  [],
} as any;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private productsService: ProductsService,
  ) {}

  async checkout(userId: string, dto: CreateOrderDto) {
    const { items } = await this.cartService.getCart(userId);
    if (!items.length) throw new BadRequestException('Cart is empty');

    for (const item of items) {
      if (item.product.stock < item.quantity)
        throw new BadRequestException(`Insufficient stock for ${item.product.name}`);
    }

    const total = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);

    const order = await this.prisma.order.create({
      data: {
        userId,
        paymentMethod: dto.paymentMethod as any,
        deliveryAddress: dto.deliveryAddress,
        notes: dto.notes,
        totalAmount: total,
        items: {
          create: items.map(i => ({
            productId: i.productId,
            productName: i.product.name,
            unitPrice: i.product.price,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of items) {
      await this.productsService.decrementStock(item.productId, item.quantity);
    }
    await this.cartService.clearCart(userId);
    return order;
  }

  async findAll(userId: string, role: string) {
    return this.prisma.order.findMany({
      where: role === 'ADMIN' ? {} : { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (role !== 'ADMIN' && order.userId !== userId) throw new ForbiddenException();
    return order;
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (!TRANSITIONS[order.status]?.includes(status))
      throw new BadRequestException(`Cannot transition from ${order.status} to ${status}`);
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  async getMonthlyRevenue() {
    return this.prisma.$queryRaw`
      SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
             SUM("totalAmount")::float as revenue
      FROM orders
      WHERE status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
      GROUP BY month ORDER BY month DESC LIMIT 12
    `;
  }

  async getTotalRevenue(year?: number) {
    const y = year || new Date().getFullYear();
    const result: any = await this.prisma.$queryRaw`
      SELECT SUM("totalAmount")::float as total FROM orders
      WHERE status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
      AND EXTRACT(YEAR FROM "createdAt") = ${y}
    `;
    return Number(result[0]?.total || 0);
  }
}

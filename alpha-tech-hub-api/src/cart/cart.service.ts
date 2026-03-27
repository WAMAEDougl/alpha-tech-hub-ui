import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService, private productsService: ProductsService) {}

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });
    const subtotal = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
    return { items, subtotal, itemCount: items.reduce((s, i) => s + i.quantity, 0) };
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await this.productsService.findOne(productId);
    if (product.stock < quantity) throw new BadRequestException('Insufficient stock');

    return this.prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: { quantity: { increment: quantity } },
      create: { userId, productId, quantity },
    });
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    if (quantity <= 0) return this.removeItem(userId, productId);
    const product = await this.productsService.findOne(productId);
    if (product.stock < quantity) throw new BadRequestException('Insufficient stock');
    await this.prisma.cartItem.update({
      where: { userId_productId: { userId, productId } },
      data: { quantity },
    });
    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    await this.prisma.cartItem.delete({
      where: { userId_productId: { userId, productId } },
    });
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
  }
}

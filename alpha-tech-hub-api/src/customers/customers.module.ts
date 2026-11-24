import { Body, Controller, Delete, Get, Module, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersModule } from '../orders/orders.module';
import { OrdersService } from '../orders/orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { journeyStage, tabOf } from '../orders/journey';
import { normalizePhone } from '../common/phone';

class AddressDto {
  @IsOptional() @IsString() label?: string;
  @IsString() @MinLength(2) fullName: string;
  @IsString() @MinLength(9) phone: string;
  @IsString() @MinLength(2) area: string;
  @IsString() @MinLength(3) addressLine: string;
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

/** "My account": the signed-in customer's own orders and saved addresses. */
@ApiTags('My account')
@ApiBearerAuth()
@Controller('me')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private prisma: PrismaService, private orders: OrdersService) {}

  @Get()
  profile(@CurrentUser() u: any) {
    return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
  }

  @Get('orders')
  async myOrders(@CurrentUser() u: any, @Query('tab') tab?: string) {
    const rows = await this.prisma.order.findMany({
      where: { userId: u.id }, orderBy: { createdAt: 'desc' }, take: 100, include: { items: true },
    });
    const settings = await this.prisma.settings.findFirst();
    const list = rows.map(o => {
      const stage = journeyStage(o);
      return {
        orderNumber: o.orderNumber, createdAt: o.createdAt, totalAmount: Number(o.totalAmount),
        journeyStage: stage, tab: tabOf(stage), itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        items: o.items.slice(0, 3).map(i => i.productName), moreItems: Math.max(0, o.items.length - 3),
        needsPayment: stage === 'to_pay',
      };
    });
    void settings;
    return tab && tab !== 'all' ? list.filter(o => o.tab === tab) : list;
  }

  @Get('orders/:orderNumber')
  async myOrder(@CurrentUser() u: any, @Param('orderNumber') orderNumber: string) {
    const o = await this.prisma.order.findFirst({ where: { orderNumber: orderNumber.toUpperCase(), userId: u.id }, select: { id: true } });
    if (!o) throw new NotFoundException('Order not found');
    return this.orders.publicView(await this.orders.loadPublic(o.id));
  }

  // ── address book ────────────────────────────────────────────────────────

  @Get('addresses')
  addresses(@CurrentUser() u: any) {
    return this.prisma.customerAddress.findMany({ where: { userId: u.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  }

  @Post('addresses')
  async addAddress(@CurrentUser() u: any, @Body() d: AddressDto) {
    const phone = normalizePhone(d.phone);
    if (!phone) throw new NotFoundException('Enter a valid phone number');
    const count = await this.prisma.customerAddress.count({ where: { userId: u.id } });
    const makeDefault = d.isDefault || count === 0;
    return this.prisma.$transaction(async tx => {
      if (makeDefault) await tx.customerAddress.updateMany({ where: { userId: u.id }, data: { isDefault: false } });
      return tx.customerAddress.create({
        data: { userId: u.id, label: d.label?.trim() || 'Home', fullName: d.fullName.trim(), phone, area: d.area.trim(), addressLine: d.addressLine.trim(), zoneId: d.zoneId ?? null, isDefault: makeDefault },
      });
    });
  }

  @Delete('addresses/:id')
  async removeAddress(@CurrentUser() u: any, @Param('id') id: string) {
    const res = await this.prisma.customerAddress.deleteMany({ where: { id, userId: u.id } });
    if (!res.count) throw new NotFoundException('Address not found');
    return { deleted: true };
  }

  @Patch('addresses/:id/default')
  async makeDefault(@CurrentUser() u: any, @Param('id') id: string) {
    const a = await this.prisma.customerAddress.findFirst({ where: { id, userId: u.id } });
    if (!a) throw new NotFoundException('Address not found');
    await this.prisma.$transaction([
      this.prisma.customerAddress.updateMany({ where: { userId: u.id }, data: { isDefault: false } }),
      this.prisma.customerAddress.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return { ok: true };
  }
}

@Module({ imports: [OrdersModule], controllers: [CustomersController] })
export class CustomersModule {}

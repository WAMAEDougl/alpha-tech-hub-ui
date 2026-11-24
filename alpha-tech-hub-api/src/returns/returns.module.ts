import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryModule } from '../inventory/inventory.module';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { normalizePhone } from '../common/phone';

class ReturnLine { @IsUUID() orderItemId: string; @Type(() => Number) @IsInt() @Min(1) quantity: number }
class RequestDto {
  @IsString() orderNumber: string;
  @IsOptional() @IsString() phone?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReturnLine) items: ReturnLine[];
  @IsString() @MinLength(3) reason: string;
  /** client-generated id: a retried submit cannot create a second return */
  @IsOptional() @IsUUID() requestRef?: string;
  /** what the customer wants: their money back, or a replacement */
  @IsOptional() @IsIn(['REFUND', 'EXCHANGE']) resolution?: 'REFUND' | 'EXCHANGE';
}
class DecisionDto { @IsBoolean() approve: boolean; @IsOptional() @IsString() note?: string }
class InspectLine { @IsUUID() returnItemId: string; @Type(() => Number) @IsInt() @Min(0) receivedQuantity: number; @Type(() => Number) @IsInt() @Min(0) sellableQuantity: number }
class InspectDto { @IsArray() @ValidateNested({ each: true }) @Type(() => InspectLine) items: InspectLine[] }
class RefundDto {
  @Type(() => Number) @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() note?: string;
  /** the M-Pesa code or receipt number of the payout */
  @IsOptional() @IsString() reference?: string;
}

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService, private inventory: InventoryService, private notifications: NotificationsService) {}

  private async ownedOrder(orderNumber: string, phone: string | undefined, user?: { id: string }) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber: (orderNumber || '').trim().toUpperCase() }, include: { items: true } });
    const ok = !!order && ((user && order.userId === user.id) || (phone && normalizePhone(phone) === order.customerPhone));
    if (!order || !ok) throw new NotFoundException('No order found with those details');
    return order;
  }

  /** What can still be returned, and until when. */
  async eligibility(orderNumber: string, phone: string | undefined, user?: { id: string }) {
    const order = await this.ownedOrder(orderNumber, phone, user);
    const settings = await this.prisma.settings.findFirst();
    const windowDays = settings?.returnWindowDays ?? 7;
    const base = { orderNumber: order.orderNumber, windowDays, items: [] as any[] };
    if (order.lifecycleStatus !== 'COMPLETED' || !order.deliveredAt) return { ...base, eligible: false, reason: 'Returns open once your order has been delivered or collected.' };
    if (windowDays <= 0) return { ...base, eligible: false, reason: 'Returns are not available for this shop.' };
    const deadline = new Date(order.deliveredAt.getTime() + windowDays * 86400_000);
    const taken = await this.prisma.orderReturnItem.groupBy({
      by: ['orderItemId'], _sum: { quantity: true },
      where: { return: { orderId: order.id, kind: 'CUSTOMER', status: { not: 'REJECTED' } } },
    });
    const takenMap = new Map(taken.map(t => [t.orderItemId, t._sum.quantity ?? 0]));
    const items = order.items.map(i => ({ orderItemId: i.id, name: i.productName, bought: i.deductedQuantity || i.quantity, returnable: Math.max(0, (i.deductedQuantity || i.quantity) - (takenMap.get(i.id) ?? 0)) }));
    if (new Date() > deadline) return { ...base, items, eligible: false, deadline, reason: `The ${windowDays}-day return window ended on ${deadline.toLocaleDateString('en-KE')}.` };
    if (!items.some(i => i.returnable > 0)) return { ...base, items, eligible: false, deadline, reason: 'Everything on this order is already in a return.' };
    return { ...base, items, eligible: true, deadline, reason: null };
  }

  async request(dto: RequestDto, user?: { id: string }) {
    if (dto.requestRef) {
      const existing = await this.prisma.orderReturn.findUnique({ where: { requestRef: dto.requestRef } });
      if (existing) return this.detail(existing.id); // retry of the same submit
    }
    const elig: any = await this.eligibility(dto.orderNumber, dto.phone, user);
    if (!elig.eligible) throw new BadRequestException(elig.reason);
    const order = await this.ownedOrder(dto.orderNumber, dto.phone, user);
    const lines = new Map<string, number>();
    for (const l of dto.items) lines.set(l.orderItemId, (lines.get(l.orderItemId) ?? 0) + l.quantity);
    if (!lines.size) throw new BadRequestException('Choose at least one item to return.');
    for (const [id, qty] of lines) {
      const it = elig.items.find((i: any) => i.orderItemId === id);
      if (!it) throw new BadRequestException('One of those items is not on this order.');
      if (qty > it.returnable) throw new BadRequestException(`You can return at most ${it.returnable} of "${it.name}".`);
    }
    try {
      const r = await this.prisma.orderReturn.create({
        data: {
          orderId: order.id, kind: 'CUSTOMER', status: 'REQUESTED', reason: dto.reason.trim().slice(0, 500), requestRef: dto.requestRef ?? null, resolution: dto.resolution ?? 'REFUND',
          items: { create: [...lines].map(([orderItemId, quantity]) => ({ orderItemId, quantity })) },
        },
      });
      return this.detail(r.id);
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('This return was already submitted.');
      throw e;
    }
  }

  async list(status?: string) {
    const rows = await this.prisma.orderReturn.findMany({
      where: status ? { status: status as any } : {}, orderBy: { createdAt: 'desc' }, take: 200,
      include: { order: { select: { orderNumber: true, customerName: true } }, items: true },
    });
    return rows.map(r => ({
      id: r.id, orderNumber: r.order.orderNumber, customerName: r.order.customerName, kind: r.kind, status: r.status,
      reason: r.reason, resolution: r.resolution, refundAmount: r.refundAmount === null ? null : Number(r.refundAmount), refundedAt: r.refundedAt, createdAt: r.createdAt, units: r.items.reduce((s, i) => s + i.quantity, 0), received: r.items.reduce((s, i) => s + i.receivedQuantity, 0),
    }));
  }

  async detail(id: string) {
    const r = await this.prisma.orderReturn.findUnique({
      where: { id },
      include: {
        order: { select: { id: true, orderNumber: true, customerName: true, customerPhone: true, totalAmount: true, subtotal: true, discountAmount: true, paymentStatus: true, paymentMethod: true } },
        items: { include: { orderItem: { select: { productName: true, productId: true, unitPrice: true } } } },
      },
    });
    if (!r) throw new NotFoundException('Return not found');

    // what has already been refunded on this order, across all its returns
    const others = await this.prisma.orderReturn.aggregate({ where: { orderId: r.order.id, id: { not: r.id }, status: 'REFUNDED' }, _sum: { refundAmount: true } });
    const refundedElsewhere = Number(others._sum.refundAmount ?? 0);
    const orderTotal = Number(r.order.totalAmount);
    const paid = r.order.paymentStatus === 'PAID';
    const remaining = Math.max(0, orderTotal - refundedElsewhere);

    // suggested refund = value of the goods in this return at the price paid, less their share of any discount
    const goods = r.items.reduce((sum, i) => sum + Number(i.orderItem.unitPrice) * i.quantity, 0);
    const subtotal = Number(r.order.subtotal) || 1;
    const discountShare = (Number(r.order.discountAmount) * goods) / subtotal;
    const suggested = Math.max(0, Math.round(goods - discountShare));
    const open = ['APPROVED', 'RECEIVED'].includes(r.status);

    return {
      id: r.id, orderNumber: r.order.orderNumber, customerName: r.order.customerName, customerPhone: r.order.customerPhone, orderTotal,
      kind: r.kind, status: r.status, reason: r.reason, resolution: r.resolution, decisionNote: r.decisionNote,
      refundAmount: r.refundAmount === null ? null : Number(r.refundAmount), refundNote: r.refundNote, refundReference: r.refundReference, refundedAt: r.refundedAt,
      createdAt: r.createdAt,
      refund: {
        // only money actually received can be refunded (a cash order counts once the cash was collected)
        paid, paymentMethod: r.order.paymentMethod,
        alreadyRefundedOnOrder: refundedElsewhere,
        maxRefundable: remaining,
        suggested: Math.min(suggested, remaining),
        canRefund: paid && open && remaining > 0,
        blockedReason: !paid ? 'No refund is needed: no payment was collected for this order.'
          : r.status === 'REFUNDED' ? 'A refund has already been recorded for this return.'
          : !open ? 'Approve the return before recording a refund.'
          : remaining <= 0 ? 'The full order total has already been refunded.' : null,
      },
      items: r.items.map(i => ({
        id: i.id, name: i.orderItem.productName, unitPrice: Number(i.orderItem.unitPrice), quantity: i.quantity,
        received: i.receivedQuantity, restocked: i.restockedQuantity, held: i.heldQuantity,
      })),
    };
  }

  /** Office: approve or reject a customer's request. */
  async decide(id: string, approve: boolean, note: string | undefined) {
    const r = await this.prisma.orderReturn.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Return not found');
    if (r.status !== 'REQUESTED') throw new BadRequestException('This return was already decided.');
    if (!approve && !note?.trim()) throw new BadRequestException('Say why the return was rejected.');
    await this.prisma.orderReturn.update({ where: { id }, data: { status: approve ? 'APPROVED' : 'REJECTED', decisionNote: note?.trim() || null } });
    return this.detail(id);
  }

  /**
   * Inventory: record goods that came back. Totals are CUMULATIVE ("received so far", "sellable so far"),
   * so saving the same inspection twice cannot restock twice. Only newly-sellable units go back on the shelf;
   * damaged or uninspected units stay held aside.
   */
  async inspect(id: string, userId: string, lines: { returnItemId: string; receivedQuantity: number; sellableQuantity: number }[]) {
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM order_returns WHERE id = ${id} FOR UPDATE`;
      const r = await tx.orderReturn.findUnique({ where: { id }, include: { items: { include: { orderItem: true } }, order: { select: { orderNumber: true } } } });
      if (!r) throw new NotFoundException('Return not found');
      // goods can still come back after a refund has been recorded
      if (!['APPROVED', 'RECEIVED', 'REFUNDED'].includes(r.status)) throw new BadRequestException(r.status === 'REQUESTED' ? 'The office must approve this return first.' : 'This return is closed.');
      for (const l of lines) {
        const it = r.items.find(i => i.id === l.returnItemId);
        if (!it) throw new BadRequestException('That item is not on this return.');
        if (l.receivedQuantity < it.receivedQuantity || l.receivedQuantity > it.quantity) throw new BadRequestException(`Received for "${it.orderItem.productName}" must be between ${it.receivedQuantity} and ${it.quantity}.`);
        if (l.sellableQuantity < it.restockedQuantity || l.sellableQuantity > l.receivedQuantity) throw new BadRequestException(`Sellable for "${it.orderItem.productName}" must be between ${it.restockedQuantity} and the received quantity.`);
        const delta = l.sellableQuantity - it.restockedQuantity;
        if (delta > 0) {
          await this.inventory.move(tx, { productId: it.orderItem.productId, type: 'RETURN', quantity: delta, reason: `Returned goods inspected (order ${r.order.orderNumber})`, reference: r.order.orderNumber, userId });
        }
        await tx.orderReturnItem.update({ where: { id: it.id }, data: { receivedQuantity: l.receivedQuantity, restockedQuantity: l.sellableQuantity, heldQuantity: l.receivedQuantity - l.sellableQuantity } });
      }
      const fresh = await tx.orderReturnItem.findMany({ where: { returnId: id } });
      if (r.status === 'APPROVED' && fresh.every(i => i.receivedQuantity >= i.quantity)) await tx.orderReturn.update({ where: { id }, data: { status: 'RECEIVED' } });
    });
    return this.detail(id);
  }

  /**
   * Office: record a refund that was paid out separately (M-Pesa, cash...). This does not move money or stock.
   * Rules: only money actually received can be refunded, only once per return, and never more than the order total
   * across all of its returns. The customer is told.
   */
  async refund(id: string, userId: string, amount: number, note?: string, reference?: string) {
    const orderId = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM order_returns WHERE id = ${id} FOR UPDATE`;
      const r = await tx.orderReturn.findUnique({ where: { id }, include: { order: true } });
      if (!r) throw new NotFoundException('Return not found');
      if (r.status === 'REFUNDED') throw new BadRequestException('A refund has already been recorded for this return.');
      if (!['APPROVED', 'RECEIVED'].includes(r.status)) throw new BadRequestException('Approve the return before recording a refund.');
      if (r.order.paymentStatus !== 'PAID') throw new BadRequestException('No refund is needed: no payment was collected for this order.');
      // serialise refunds on the same order so two returns cannot together refund more than was paid
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${r.orderId} FOR UPDATE`;
      const done = await tx.orderReturn.aggregate({ where: { orderId: r.orderId, id: { not: r.id }, status: 'REFUNDED' }, _sum: { refundAmount: true } });
      const remaining = Number(r.order.totalAmount) - Number(done._sum.refundAmount ?? 0);
      if (amount > remaining + 0.001) throw new BadRequestException(`The refund cannot be more than KES ${Math.max(0, remaining).toLocaleString('en-KE')}, the amount still refundable on this order.`);
      const ref = reference?.trim().toUpperCase() || null;
      await tx.orderReturn.update({
        where: { id },
        data: { status: 'REFUNDED', refundAmount: amount, refundNote: note?.trim() || null, refundReference: ref, refundedAt: new Date(), refundedById: userId },
      });
      await tx.orderEvent.create({
        data: {
          orderId: r.orderId, lifecycleStatus: r.order.lifecycleStatus, workflowStage: r.order.workflowStage, userId,
          note: `Refund of KES ${amount.toLocaleString('en-KE')} recorded${ref ? ` (ref ${ref})` : ''}`,
        },
      });
      return r.orderId;
    });
    this.notifications.send(orderId, `refund_recorded:${id}`, { amount });
    return this.detail(id);
  }
}

const STAFF = [UserRole.ADMIN, UserRole.INVENTORY];

@ApiTags('Returns')
@Controller('returns')
export class ReturnsController {
  constructor(private readonly svc: ReturnsService) {}

  @Get('eligibility') @UseGuards(OptionalJwtAuthGuard) @Throttle({ default: { limit: 20, ttl: 60_000 } })
  eligibility(@Query('orderNumber') n = '', @Query('phone') phone: string | undefined, @Req() req: any) { return this.svc.eligibility(n, phone, req.user); }

  @Post() @UseGuards(OptionalJwtAuthGuard) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  request(@Body() dto: RequestDto, @Req() req: any) { return this.svc.request(dto, req.user); }

  @Get() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  list(@Query('status') status?: string) { return this.svc.list(status); }

  @Get(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  detail(@Param('id') id: string) { return this.svc.detail(id); }

  @Post(':id/decision') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @ApiBearerAuth()
  decide(@Param('id') id: string, @Body() d: DecisionDto) { return this.svc.decide(id, d.approve, d.note); }

  @Post(':id/inspect') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  inspect(@Param('id') id: string, @Body() d: InspectDto, @CurrentUser() u: any) { return this.svc.inspect(id, u.id, d.items); }

  @Post(':id/refund') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @ApiBearerAuth()
  refund(@Param('id') id: string, @Body() d: RefundDto, @CurrentUser() u: any) { return this.svc.refund(id, u.id, d.amount, d.note, d.reference); }
}

@Module({ imports: [InventoryModule], providers: [ReturnsService], controllers: [ReturnsController] })
export class ReturnsModule {}

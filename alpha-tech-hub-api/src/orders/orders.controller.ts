import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { OrdersService } from './orders.service';
import { WorkflowService } from './workflow.service';
import { PricingService } from './pricing.service';
import { CreateOrderDto, QuoteDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

class PaymentReferenceDto {
  @IsString() orderNumber: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() code: string;
}
class Expected { @IsOptional() @IsString() expectedUpdatedAt?: string }
class VerifyDto extends Expected { @IsOptional() @IsString() code?: string }
class NoteDto extends Expected { @IsString() note: string }
class DeliveryDto extends Expected {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fee?: number;
}
class IssueDto extends Expected { @IsString() text: string }
class DecisionDto extends Expected { @IsString() decision: string }
class DispatchDto extends Expected { @IsString() riderName: string; @IsString() riderPhone: string }
class CompleteDto extends Expected { @IsOptional() @IsBoolean() collectPayment?: boolean }
class SourceDto extends Expected {
  @IsIn(['warehouse', 'supplier']) source: 'warehouse' | 'supplier';
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @IsOptional() @IsUUID() receiptId?: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitCost?: number;
  @IsOptional() @IsString() reference?: string;
}
class PlanDto extends Expected {
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsString() expectedDate?: string;
  @IsOptional() @IsString() note?: string;
}
class CheckDto extends Expected { @IsBoolean() checked: boolean }

const STAFF = [UserRole.ADMIN, UserRole.INVENTORY];

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly flow: WorkflowService,
    private readonly pricing: PricingService,
  ) {}

  // ── Public: customers (guest or signed in) ──────────────────────────────

  @Post('quote')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Price a cart: delivery fee, discount, total (same maths as checkout)' })
  quote(@Body() dto: QuoteDto) {
    return this.pricing.quote(dto);
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Place an order (guest checkout, or signed in to keep it on your account)' })
  create(@Body() dto: CreateOrderDto, @Req() req: any) {
    return this.orders.create(dto, req.user?.id);
  }

  @Get('track')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Track an order by order number + phone' })
  track(@Query('orderNumber') orderNumber = '', @Query('phone') phone = '') {
    return this.orders.track(orderNumber, phone);
  }

  @Post('payment-reference')
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Customer submits the M-Pesa code they paid with' })
  paymentReference(@Body() dto: PaymentReferenceDto, @Req() req: any) {
    return this.orders.submitPaymentReference(dto.orderNumber, dto.phone ?? '', dto.code, req.user);
  }

  // ── Staff: queues ───────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  findAll(@Query('lane') lane?: string, @Query('search') search?: string) {
    return this.orders.findAll({ lane, search });
  }

  @Get('counts')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  counts() { return this.orders.counts(); }

  @Get('new')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  @ApiOperation({ summary: 'Orders placed since a timestamp (drives the alert sound)' })
  newSince(@Query('since') since: string | undefined, @CurrentUser() user: any) {
    const d = since ? new Date(since) : new Date();
    return this.orders.newSince(isNaN(d.getTime()) ? new Date() : d, user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  findOne(@Param('id') id: string) { return this.orders.findOne(id); }

  // ── Staff: order actions (the service enforces office-only vs inventory) ─

  @Post(':id/verify-payment') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  verify(@Param('id') id: string, @Body() d: VerifyDto, @CurrentUser() u: any) { return this.flow.verifyPayment(id, u, d.code, d.expectedUpdatedAt); }

  @Post(':id/reject-payment') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  reject(@Param('id') id: string, @Body() d: NoteDto, @CurrentUser() u: any) { return this.flow.rejectPayment(id, u, d.note, d.expectedUpdatedAt); }

  @Post(':id/delivery') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  delivery(@Param('id') id: string, @Body() d: DeliveryDto, @CurrentUser() u: any) { return this.flow.setDelivery(id, u, d, d.expectedUpdatedAt); }

  @Post(':id/approve') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  @ApiOperation({ summary: 'Office: confirm, issue invoice and send to inventory (reserves stock)' })
  approve(@Param('id') id: string, @Body() d: Expected, @CurrentUser() u: any) { return this.flow.approve(id, u, d.expectedUpdatedAt); }

  @Post(':id/issue') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  issue(@Param('id') id: string, @Body() d: IssueDto, @CurrentUser() u: any) { return this.flow.reportIssue(id, u, d.text); }

  @Post(':id/resolve-issue') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  resolve(@Param('id') id: string, @Body() d: DecisionDto, @CurrentUser() u: any) { return this.flow.resolveIssue(id, u, d.decision); }

  @Post(':id/start-packing') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  startPacking(@Param('id') id: string, @Body() d: Expected, @CurrentUser() u: any) { return this.flow.startPacking(id, u, d.expectedUpdatedAt); }

  @Post(':id/mark-packed') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  markPacked(@Param('id') id: string, @Body() d: Expected, @CurrentUser() u: any) { return this.flow.markPacked(id, u, d.expectedUpdatedAt); }

  @Post(':id/dispatch') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  dispatch(@Param('id') id: string, @Body() d: DispatchDto, @CurrentUser() u: any) {
    return this.flow.dispatch(id, u, { name: d.riderName, phone: d.riderPhone }, d.expectedUpdatedAt);
  }

  @Post(':id/ready-pickup') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  readyPickup(@Param('id') id: string, @Body() d: Expected, @CurrentUser() u: any) { return this.flow.readyPickup(id, u, d.expectedUpdatedAt); }

  @Post(':id/complete') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  complete(@Param('id') id: string, @Body() d: CompleteDto, @CurrentUser() u: any) { return this.flow.complete(id, u, !!d.collectPayment, d.expectedUpdatedAt); }

  @Post(':id/failed-delivery') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  failed(@Param('id') id: string, @Body() d: NoteDto, @CurrentUser() u: any) { return this.flow.failedDelivery(id, u, d.note, d.expectedUpdatedAt); }

  @Post(':id/cancel') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  cancel(@Param('id') id: string, @Body() d: NoteDto, @CurrentUser() u: any) { return this.flow.cancel(id, u, d.note, d.expectedUpdatedAt); }

  // ── Staff: per-line warehouse actions ───────────────────────────────────

  @Post('items/:itemId/source') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  source(@Param('itemId') itemId: string, @Body() d: SourceDto, @CurrentUser() u: any) { return this.flow.sourceItem(itemId, u, d, d.expectedUpdatedAt); }

  @Post('items/:itemId/plan') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  plan(@Param('itemId') itemId: string, @Body() d: PlanDto, @CurrentUser() u: any) { return this.flow.planSource(itemId, u, d); }

  @Post('items/:itemId/check') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...STAFF) @ApiBearerAuth()
  check(@Param('itemId') itemId: string, @Body() d: CheckDto, @CurrentUser() u: any) { return this.flow.checkItem(itemId, u, d.checked); }
}

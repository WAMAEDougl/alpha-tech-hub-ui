import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested, IsBoolean } from 'class-validator';
import { ProcurementService } from './procurement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

class SupplierDto {
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() notes?: string;
}
class SupplierPatchDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class PoLine {
  @IsUUID() productId: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitCost?: number;
}
class PoDto {
  @IsUUID() supplierId: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PoLine) items: PoLine[];
}
class PoStatusDto { @IsIn(['ORDERED', 'CANCELLED']) status: 'ORDERED' | 'CANCELLED' }
class ReceiveLine { @IsUUID() itemId: string; @Type(() => Number) @IsInt() @Min(0) quantity: number }
class ReceiveDto {
  @IsUUID() receiptId: string;
  @IsOptional() @IsString() reference?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReceiveLine) items: ReceiveLine[];
}
class StartTakeDto { @IsOptional() @IsString() note?: string }
class CountLine { @IsUUID() productId: string; @IsOptional() @Type(() => Number) @IsInt() @Min(0) counted: number | null }
class CountsDto { @IsArray() @ValidateNested({ each: true }) @Type(() => CountLine) counts: CountLine[] }

@ApiTags('Procurement')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.INVENTORY)
export class ProcurementController {
  constructor(private readonly svc: ProcurementService) {}

  @Get('suppliers') suppliers() { return this.svc.suppliers(); }
  @Post('suppliers') createSupplier(@Body() d: SupplierDto) { return this.svc.createSupplier(d); }
  @Patch('suppliers/:id') updateSupplier(@Param('id') id: string, @Body() d: SupplierPatchDto) { return this.svc.updateSupplier(id, d); }

  @Get('purchase-orders') pos(@Query('status') status?: string) { return this.svc.purchaseOrders(status); }
  @Get('purchase-orders/:id') po(@Param('id') id: string) { return this.svc.purchaseOrder(id); }
  @Post('purchase-orders') createPo(@Body() d: PoDto, @CurrentUser() u: any) { return this.svc.createPurchaseOrder(u.id, d); }
  @Post('purchase-orders/:id/status') poStatus(@Param('id') id: string, @Body() d: PoStatusDto) { return this.svc.setPurchaseOrderStatus(id, d.status); }
  @Post('purchase-orders/:id/receive') receive(@Param('id') id: string, @Body() d: ReceiveDto, @CurrentUser() u: any) { return this.svc.receivePurchaseOrder(id, u.id, d); }

  @Get('stock-takes') takes() { return this.svc.stockTakes(); }
  @Post('stock-takes') startTake(@Body() d: StartTakeDto, @CurrentUser() u: any) { return this.svc.startStockTake(u.id, d.note); }
  @Get('stock-takes/:id') take(@Param('id') id: string) { return this.svc.stockTake(id); }
  @Patch('stock-takes/:id/counts') counts(@Param('id') id: string, @Body() d: CountsDto) { return this.svc.saveCounts(id, d.counts); }
  @Post('stock-takes/:id/apply') apply(@Param('id') id: string, @CurrentUser() u: any) { return this.svc.applyStockTake(id, u.id); }
  @Post('stock-takes/:id/cancel') cancel(@Param('id') id: string) { return this.svc.cancelStockTake(id); }

  @Get('reorder') reorder() { return this.svc.reorderSuggestions(); }
  @Get('insights') insights() { return this.svc.insights(); }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { StockMovementType } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

class ReceiveDto {
  @IsUUID() productId: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @IsOptional() @IsString() supplier?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costPrice?: number;
}
class WriteOffDto {
  @IsUUID() productId: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @IsString() @MinLength(3) reason: string;
}
class StockTakeDto {
  @IsUUID() productId: string;
  @Type(() => Number) @IsInt() @Min(0) countedQuantity: number;
  @IsString() @MinLength(3) reason: string;
}
class SettingsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) reorderLevel?: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @IsBoolean() allowSupplierSourcing?: boolean;
}

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.INVENTORY)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('stock')
  stock(@Query('search') search?: string, @Query('filter') filter?: string) {
    return this.inventory.stockList({ search, filter });
  }

  @Get('movements')
  movements(
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const t = type && (Object.values(StockMovementType) as string[]).includes(type) ? (type as StockMovementType) : undefined;
    return this.inventory.movements({ productId, type: t, limit: limit ? Number(limit) : undefined });
  }

  @Get('workflow')
  workflow() { return this.inventory.workflow(); }

  @Post('receive')
  receive(@CurrentUser() u: any, @Body() dto: ReceiveDto) { return this.inventory.receive(u.id, dto); }

  @Post('write-off')
  writeOff(@CurrentUser() u: any, @Body() dto: WriteOffDto) { return this.inventory.writeOff(u.id, dto); }

  @Post('stock-take')
  stockTake(@CurrentUser() u: any, @Body() dto: StockTakeDto) { return this.inventory.stockTake(u.id, dto); }

  @Patch(':productId/settings')
  settings(@Param('productId') id: string, @Body() dto: SettingsDto) { return this.inventory.updateSettings(id, dto); }
}

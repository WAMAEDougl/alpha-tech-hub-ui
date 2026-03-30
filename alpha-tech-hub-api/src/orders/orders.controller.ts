import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

enum OrderStatus {
  PENDING = 'PENDING', PAID = 'PAID', PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED', DELIVERED = 'DELIVERED', CANCELLED = 'CANCELLED',
}

class UpdateStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Checkout cart and create order' })
  checkout(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.checkout(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders (own for customer, all for admin)' })
  findAll(@CurrentUser() user: any) {
    return this.ordersService.findAll(user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.findOne(id, user.id, user.role);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update order status (Admin)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}

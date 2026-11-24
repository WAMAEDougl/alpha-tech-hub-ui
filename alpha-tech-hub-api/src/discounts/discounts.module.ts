import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Module, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { DiscountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

class DiscountDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{3,30}$/, { message: 'Code must be 3-30 letters, numbers, - or _' }) code: string;
  @IsEnum(DiscountType) type: DiscountType;
  @Type(() => Number) @IsNumber() @Min(0) value: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minSubtotal?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxUses?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class DiscountPatchDto {
  @IsOptional() @IsEnum(DiscountType) type?: DiscountType;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) value?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minSubtotal?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxUses?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

const view = (d: any) => ({ ...d, value: Number(d.value), minSubtotal: d.minSubtotal === null ? null : Number(d.minSubtotal) });

@ApiTags('Discounts')
@ApiBearerAuth()
@Controller('discounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DiscountsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    return (await this.prisma.discountCode.findMany({ orderBy: { createdAt: 'desc' } })).map(view);
  }

  @Post()
  async create(@Body() d: DiscountDto) {
    if (d.type === 'PERCENT' && d.value > 100) throw new BadRequestException('A percentage discount cannot be more than 100.');
    try {
      return view(await this.prisma.discountCode.create({
        data: {
          code: d.code.trim().toUpperCase(), type: d.type, value: d.type === 'FREE_DELIVERY' ? 0 : d.value,
          minSubtotal: d.minSubtotal ?? null, maxUses: d.maxUses ?? null,
          expiresAt: d.expiresAt ? new Date(d.expiresAt) : null, isActive: d.isActive ?? true,
        },
      }));
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('That code already exists.');
      throw e;
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() d: DiscountPatchDto) {
    try {
      return view(await this.prisma.discountCode.update({
        where: { id }, data: { ...d, ...(d.expiresAt ? { expiresAt: new Date(d.expiresAt) } : {}) },
      }));
    } catch { throw new NotFoundException('Code not found'); }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const used = await this.prisma.order.count({ where: { discountCodeId: id } });
    if (used) { await this.prisma.discountCode.update({ where: { id }, data: { isActive: false } }); return { deactivated: true }; }
    await this.prisma.discountCode.delete({ where: { id } }).catch(() => { throw new NotFoundException('Code not found'); });
    return { deleted: true };
  }
}

@Module({ controllers: [DiscountsController] })
export class DiscountsModule {}

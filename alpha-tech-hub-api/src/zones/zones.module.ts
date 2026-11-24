import { Body, Controller, Delete, Get, Module, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

class ZoneDto {
  @IsString() @MinLength(2) name: string;
  @Type(() => Number) @IsNumber() @Min(0) fee: number;
  /** place names this zone covers, e.g. ["nanyuki", "likii", "ngangarithi"] */
  @IsOptional() @IsArray() @IsString({ each: true }) areas?: string[];
  @IsOptional() @IsString() estimatedDays?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}
class ZonePatchDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fee?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) areas?: string[];
  @IsOptional() @IsString() estimatedDays?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

const clean = (areas?: string[]) => (areas ?? []).map(a => a.trim().toLowerCase()).filter(Boolean);
const view = (z: any) => ({ ...z, fee: Number(z.fee) });

@ApiTags('Delivery zones')
@Controller('zones')
export class ZonesController {
  constructor(private prisma: PrismaService) {}

  /** Public: what the checkout offers. */
  @Get()
  async list() {
    const rows = await this.prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    return rows.map(z => ({ id: z.id, name: z.name, fee: Number(z.fee), estimatedDays: z.estimatedDays, areas: z.areas }));
  }

  @Get('all') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN, UserRole.INVENTORY) @ApiBearerAuth()
  async all() {
    return (await this.prisma.deliveryZone.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })).map(view);
  }

  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @ApiBearerAuth()
  async create(@Body() d: ZoneDto) {
    return view(await this.prisma.deliveryZone.create({
      data: { name: d.name.trim(), fee: d.fee, areas: clean(d.areas), estimatedDays: d.estimatedDays?.trim() || null, isActive: d.isActive ?? true, sortOrder: d.sortOrder ?? 0 },
    }));
  }

  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @ApiBearerAuth()
  async update(@Param('id') id: string, @Body() d: ZonePatchDto) {
    try {
      return view(await this.prisma.deliveryZone.update({
        where: { id }, data: { ...d, ...(d.areas ? { areas: clean(d.areas) } : {}) },
      }));
    } catch { throw new NotFoundException('Zone not found'); }
  }

  /** A zone that past orders point to is switched off, never deleted, so history stays intact. */
  @Delete(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @ApiBearerAuth()
  async remove(@Param('id') id: string) {
    const used = await this.prisma.order.count({ where: { deliveryZoneId: id } });
    if (used) { await this.prisma.deliveryZone.update({ where: { id }, data: { isActive: false } }); return { deactivated: true }; }
    await this.prisma.deliveryZone.delete({ where: { id } }).catch(() => { throw new NotFoundException('Zone not found'); });
    return { deleted: true };
  }
}

@Module({ controllers: [ZonesController] })
export class ZonesModule {}

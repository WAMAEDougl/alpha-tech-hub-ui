import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

class CreateDisposalDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() phone: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiProperty() @IsString() items: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

@ApiTags('Disposal')
@Controller('disposal')
export class DisposalController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Submit e-waste disposal request (public)' })
  create(@Body() dto: CreateDisposalDto) {
    return this.prisma.disposalRequest.create({ data: dto as any });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all disposal requests (Admin)' })
  findAll() {
    return this.prisma.disposalRequest.findMany({ orderBy: { submittedAt: 'desc' } });
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update disposal request status (Admin)' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.prisma.disposalRequest.update({ where: { id }, data: { status: body.status } });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete disposal request (Admin)' })
  remove(@Param('id') id: string) {
    return this.prisma.disposalRequest.delete({ where: { id } });
  }
}

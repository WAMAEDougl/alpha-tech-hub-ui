import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

class CreateQuoteDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsString() interest: string;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
}

@ApiTags('Quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a quick quote request (public)' })
  create(@Body() dto: CreateQuoteDto) {
    return this.prisma.quoteRequest.create({ data: dto });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all quote requests (Admin)' })
  findAll() {
    return this.prisma.quoteRequest.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete quote request (Admin)' })
  remove(@Param('id') id: string) {
    return this.prisma.quoteRequest.delete({ where: { id } });
  }
}

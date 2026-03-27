import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

class CreateBuildRequestDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() phone: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiProperty() @IsString() buildType: string;
  @ApiProperty() @IsString() budget: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() useCases?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

@ApiTags('Build Requests')
@Controller('build-requests')
export class BuildRequestsController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a custom PC build request (public)' })
  create(@Body() dto: CreateBuildRequestDto) {
    return this.prisma.buildRequest.create({ data: dto as any });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all build requests (Admin)' })
  findAll() {
    return this.prisma.buildRequest.findMany({ orderBy: { submittedAt: 'desc' } });
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update build request status (Admin)' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.prisma.buildRequest.update({ where: { id }, data: { status: body.status } });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete build request (Admin)' })
  remove(@Param('id') id: string) {
    return this.prisma.buildRequest.delete({ where: { id } });
  }
}

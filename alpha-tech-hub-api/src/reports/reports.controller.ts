import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Download Sales PDF report (Admin)' })
  salesReport(@Res() res: Response) {
    return this.reportsService.generateSalesReport(res);
  }

  @Get('repairs')
  @ApiOperation({ summary: 'Download Repairs PDF report (Admin)' })
  repairsReport(@Res() res: Response) {
    return this.reportsService.generateRepairsReport(res);
  }
}

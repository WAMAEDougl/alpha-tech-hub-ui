import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RepairsService } from './repairs.service';
import { CreateRepairDto, UpdateRepairDto } from './dto/create-repair.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Repairs')
@Controller('repairs')
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a repair booking (public or authenticated)' })
  create(@Body() dto: CreateRepairDto, @CurrentUser() user?: any) {
    return this.repairsService.create(dto, user?.id);
  }

  @Get('track/:ticketNumber')
  @ApiOperation({ summary: 'Track repair by ticket number (public)' })
  track(@Param('ticketNumber') ticketNumber: string) {
    return this.repairsService.trackByTicketNumber(ticketNumber);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all repair tickets (Admin)' })
  findAll() {
    return this.repairsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get repair ticket by ID (Admin)' })
  findOne(@Param('id') id: string) {
    return this.repairsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update repair ticket (Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateRepairDto) {
    return this.repairsService.update(id, dto);
  }
}

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsString, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from './user.entity';

class SetActiveDto { @IsBoolean() isActive: boolean; }
class ResetPasswordDto { @IsString() @MinLength(8) password: string; }
class SetRoleDto { @IsEnum(UserRole) role: UserRole; }

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() { return this.usersService.findAll(); }

  @Post('staff')
  createStaff(@Body() dto: CreateStaffDto) { return this.usersService.createStaff(dto); }

  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto, @CurrentUser() me: any) {
    return this.usersService.setActive(id, dto.isActive, me.id);
  }

  @Patch(':id/password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto.password);
  }

  @Patch(':id/role')
  setRole(@Param('id') id: string, @Body() dto: SetRoleDto, @CurrentUser() me: any) {
    return this.usersService.setRole(id, dto.role, me.id);
  }
}

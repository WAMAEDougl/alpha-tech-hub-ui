import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UserRole, STAFF_ROLES } from './user.entity';

const SAFE_SELECT = {
  id: true, email: true, name: true, phone: true, role: true, isActive: true, createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Public self-registration. The role is ALWAYS customer — never taken from input. */
  async create(dto: CreateUserDto) {
    return this.createWithRole({ ...dto, role: UserRole.CUSTOMER });
  }

  /** Admin-only: create a back-office account. */
  async createStaff(dto: CreateStaffDto) {
    if (!STAFF_ROLES.includes(dto.role)) throw new BadRequestException('Role must be ADMIN or INVENTORY');
    const user = await this.createWithRole(dto);
    const { password, ...safe } = user;
    return safe;
  }

  private async createWithRole(data: { email: string; name: string; password: string; phone?: string; role: UserRole }) {
    const email = data.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({ data: { ...data, email, password: hashed } as any });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({ select: SAFE_SELECT, orderBy: { createdAt: 'desc' } });
  }

  async setActive(id: string, isActive: boolean, actingUserId: string) {
    if (id === actingUserId && !isActive) throw new BadRequestException('You cannot deactivate your own account');
    await this.findById(id);
    return this.prisma.user.update({ where: { id }, data: { isActive }, select: SAFE_SELECT });
  }

  async setRole(id: string, role: UserRole, actingUserId: string) {
    if (id === actingUserId) throw new BadRequestException('You cannot change your own role');
    await this.findById(id);
    return this.prisma.user.update({ where: { id }, data: { role }, select: SAFE_SELECT });
  }

  async resetPassword(id: string, password: string) {
    await this.findById(id);
    const hashed = await bcrypt.hash(password, 12);
    await this.prisma.user.update({ where: { id }, data: { password: hashed } });
    return { ok: true };
  }

  async count() {
    return this.prisma.user.count();
  }
}

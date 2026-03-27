import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.settings.count();
    if (count === 0) {
      await this.prisma.settings.create({ data: { companyName: 'Alpha Computers Nanyuki' } });
    }
  }

  async get() {
    return this.prisma.settings.findFirst();
  }

  async update(dto: UpdateSettingsDto) {
    return this.prisma.settings.update({ where: { id: 1 }, data: dto as any });
  }
}

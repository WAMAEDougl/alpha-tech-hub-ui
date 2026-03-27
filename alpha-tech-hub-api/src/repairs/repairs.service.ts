import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRepairDto, UpdateRepairDto } from './dto/create-repair.dto';

@Injectable()
export class RepairsService {
  constructor(private prisma: PrismaService) {}

  private async nextTicketNumber(): Promise<string> {
    const count = await this.prisma.repairTicket.count();
    return `SVC-${String(count + 1).padStart(4, '0')}`;
  }

  async create(dto: CreateRepairDto, userId?: string) {
    const ticketNumber = await this.nextTicketNumber();
    return this.prisma.repairTicket.create({
      data: { ...dto, userId, ticketNumber },
    });
  }

  async findAll() {
    return this.prisma.repairTicket.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const t = await this.prisma.repairTicket.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Repair ticket not found');
    return t;
  }

  async trackByTicketNumber(ticketNumber: string) {
    const t = await this.prisma.repairTicket.findUnique({ where: { ticketNumber } });
    if (!t) throw new NotFoundException(`No ticket found: ${ticketNumber}`);
    return t;
  }

  async update(id: string, dto: UpdateRepairDto) {
    const ticket = await this.findOne(id);
    const data: any = { ...dto };
    if (dto.status === 'COMPLETED' && !ticket.completedAt) {
      data.completedAt = new Date();
    }
    return this.prisma.repairTicket.update({ where: { id }, data });
  }

  async getActiveCount() {
    return this.prisma.repairTicket.count({
      where: { status: { in: ['RECEIVED', 'DIAGNOSTIC', 'AWAITING_PARTS', 'IN_REPAIR'] as any } },
    });
  }

  async getAverageTurnaround(): Promise<number> {
    const result: any = await this.prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt")) / 3600) as avg_hours
      FROM repair_tickets WHERE status = 'COMPLETED' AND "completedAt" IS NOT NULL
    `;
    return Math.round(Number(result[0]?.avg_hours || 0));
  }
}

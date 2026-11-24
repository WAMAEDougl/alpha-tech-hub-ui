import { PrismaService } from "../prisma";

export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /** The single settings row. Created on first use, so a fresh database needs no manual setup. */
  async get() {
    return (await this.prisma.settings.findFirst()) ?? this.prisma.settings.create({ data: { companyName: "Alpha Computers Nanyuki" } });
  }

  async update(dto: Record<string, unknown>) {
    const row = await this.get();
    return this.prisma.settings.update({ where: { id: row.id }, data: dto as never });
  }
}

import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as PDFDocument from 'pdfkit';
import { SettingsService } from '../settings/settings.service';
import { OrdersService } from '../orders/orders.service';
import { RepairsService } from '../repairs/repairs.service';
import { ProductsService } from '../products/products.service';
import axios from 'axios';

@Injectable()
export class ReportsService {
  constructor(
    private settingsService: SettingsService,
    private ordersService: OrdersService,
    private repairsService: RepairsService,
    private productsService: ProductsService,
  ) {}

  private async addHeader(doc: PDFKit.PDFDocument, title: string): Promise<void> {
    const settings = await this.settingsService.get();

    // Try to embed logo
    if (settings.logoUrl) {
      try {
        const response = await axios.get(settings.logoUrl, { responseType: 'arraybuffer', timeout: 5000 });
        doc.image(Buffer.from(response.data), 40, 30, { width: 60, height: 60 });
      } catch {
        // Skip logo if unreachable
      }
    }

    doc.fontSize(18).font('Helvetica-Bold').text(settings.companyName || 'Alpha Computers Nanyuki', 110, 40);
    if (settings.address) doc.fontSize(9).font('Helvetica').text(settings.address, 110, 62);
    if (settings.contactEmail) doc.text(settings.contactEmail, 110, 74);
    if (settings.whatsappNumber) doc.text(`WhatsApp: ${settings.whatsappNumber}`, 110, 86);

    doc.moveTo(40, 105).lineTo(555, 105).strokeColor('#E53E3E').lineWidth(2).stroke();

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text(title, 40, 115);
    doc.fontSize(9).font('Helvetica').fillColor('#666')
      .text(`Generated: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`, 40, 133);

    doc.moveDown(2);
  }

  private addTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], colWidths: number[]): void {
    const startX = 40;
    let y = doc.y + 10;
    const rowH = 22;

    // Header row
    doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH).fill('#E53E3E');
    doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold');
    let x = startX;
    headers.forEach((h, i) => {
      doc.text(h, x + 4, y + 6, { width: colWidths[i] - 8 });
      x += colWidths[i];
    });

    // Data rows
    rows.forEach((row, ri) => {
      y += rowH;
      if (y > 720) { doc.addPage(); y = 60; }
      doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH)
        .fill(ri % 2 === 0 ? '#f9f9f9' : '#fff');
      doc.fillColor('#000').font('Helvetica').fontSize(8);
      x = startX;
      row.forEach((cell, i) => {
        doc.text(String(cell ?? ''), x + 4, y + 6, { width: colWidths[i] - 8 });
        x += colWidths[i];
      });
    });

    doc.y = y + rowH + 10;
  }

  async generateSalesReport(res: Response): Promise<void> {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');
    doc.pipe(res);

    await this.addHeader(doc, 'Sales Report');

    const revenue = await this.ordersService.getMonthlyRevenue();
    const mostSold = await this.productsService.getMostSold(10);

    doc.fontSize(11).font('Helvetica-Bold').text('Monthly Revenue', { underline: true });
    this.addTable(doc,
      ['Month', 'Revenue (KES)'],
      revenue.map(r => [r.month, Number(r.revenue).toLocaleString()]),
      [260, 255],
    );

    doc.addPage();
    await this.addHeader(doc, 'Sales Report — Top Products');
    doc.fontSize(11).font('Helvetica-Bold').text('Best Selling Products', { underline: true });
    this.addTable(doc,
      ['Product', 'Category', 'Units Sold'],
      mostSold.map(p => [p.name, p.category, p.total_sold]),
      [260, 150, 105],
    );

    doc.end();
  }

  async generateRepairsReport(res: Response): Promise<void> {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="repairs-report.pdf"');
    doc.pipe(res);

    await this.addHeader(doc, 'Repairs Report');

    const tickets = await this.repairsService.findAll();
    const avgHours = await this.repairsService.getAverageTurnaround();
    const activeCount = await this.repairsService.getActiveCount();

    doc.fontSize(10).font('Helvetica')
      .text(`Total Tickets: ${tickets.length}   |   Active: ${activeCount}   |   Avg Turnaround: ${avgHours}h`)
      .moveDown();

    this.addTable(doc,
      ['Ticket #', 'Customer', 'Device', 'Service', 'Status', 'Date'],
      tickets.slice(0, 50).map(t => [
        t.ticketNumber,
        t.customerName,
        `${t.deviceBrand} ${t.deviceModel || ''}`.trim(),
        t.serviceType || '—',
        t.status,
        new Date(t.createdAt).toLocaleDateString('en-KE'),
      ]),
      [70, 100, 100, 90, 90, 65],
    );

    doc.end();
  }
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SiteConfig } from '@/contexts/SiteConfigContext';

export type ReportType = 'sales' | 'orders' | 'repairs';

/**
 * Generates a jsPDF document with a header (company name + optional logo)
 * and an auto-table built from the provided data array.
 *
 * @param reportType - The type of report ('sales' | 'orders' | 'repairs')
 * @param data       - Array of plain objects; column headers are derived from the first item's keys
 * @param siteConfig - SiteConfig used to populate the PDF header
 * @returns           The jsPDF document instance — caller should invoke `.save(filename)`
 */
export function generateReport(
  reportType: ReportType,
  data: Record<string, unknown>[],
  siteConfig: SiteConfig,
): jsPDF {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = 14;

  // --- Logo (only if logoLight is a data URL) ---
  const logo = siteConfig.logoLight;
  if (logo && logo.startsWith('data:')) {
    try {
      // Determine format from the data URL mime type (default to PNG)
      const mimeMatch = logo.match(/^data:image\/([a-zA-Z+]+);base64,/);
      const format = mimeMatch ? mimeMatch[1].toUpperCase() : 'PNG';
      const logoWidth = 30;
      const logoHeight = 15;
      doc.addImage(logo, format, 14, cursorY, logoWidth, logoHeight);
      cursorY += logoHeight + 4;
    } catch {
      // Skip logo gracefully if embedding fails
    }
  }

  // --- Company name ---
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(siteConfig.companyName, 14, cursorY);
  cursorY += 8;

  // --- Report title ---
  const title = `${reportType.charAt(0).toUpperCase()}${reportType.slice(1)} Report`;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, cursorY);
  cursorY += 4;

  // --- Divider line ---
  doc.setLineWidth(0.3);
  doc.line(14, cursorY, pageWidth - 14, cursorY);
  cursorY += 6;

  // --- Table ---
  if (data.length > 0) {
    const columns = Object.keys(data[0]).map((key) => ({
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      dataKey: key,
    }));

    const rows = data.map((item) =>
      columns.map((col) => {
        const val = item[col.dataKey];
        return val === null || val === undefined ? '' : String(val);
      }),
    );

    autoTable(doc, {
      startY: cursorY,
      head: [columns.map((c) => c.header)],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 38, 38] }, // brand red
    });
  }

  return doc;
}

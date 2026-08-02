import { jsPDF } from 'jspdf';
import { CompanyProfile, Quotation } from '../types';

export interface PdfAttachment {
  filename: string;
  mimeType: string;
  data: Uint8Array;
}

export function createQuotationPdf(quotation: Quotation, company: CompanyProfile): PdfAttachment {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = 16;
  const right = 194;
  let y = 18;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(company.name || 'Quotation', left, y);
  pdf.setFontSize(16);
  pdf.text('QUOTATION', right, y, { align: 'right' });
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const companyLines = [company.address, company.phone, company.email].filter(Boolean);
  pdf.text(companyLines, left, y);
  pdf.text([`Quote: ${quotation.quoteNumber}`, `Date: ${quotation.date}`, `Valid until: ${quotation.validUntil}`], right, y, { align: 'right' });
  y += Math.max(companyLines.length, 3) * 4 + 7;

  pdf.setDrawColor(203, 213, 225);
  pdf.line(left, y, right, y);
  y += 7;
  pdf.setFont('helvetica', 'bold');
  pdf.text('BILL TO', left, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  const clientLines = [quotation.client.name, quotation.client.companyName, quotation.client.address, quotation.client.email, quotation.client.phone].filter(Boolean);
  pdf.text(clientLines, left, y);
  y += clientLines.length * 4 + 8;

  const widths = [10, 82, 18, 30, 32];
  const headers = ['#', 'Description', 'Qty', 'Unit price', 'Total'];
  pdf.setFillColor(30, 41, 59);
  pdf.rect(left, y, 178, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  headers.forEach((header, index) => pdf.text(header, left + widths.slice(0, index).reduce((a, b) => a + b, 0) + 2, y + 5.3));
  y += 8;
  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'normal');

  quotation.items.forEach((item, index) => {
    const description = pdf.splitTextToSize(item.description || '-', widths[1] - 4);
    const rowHeight = Math.max(8, description.length * 4 + 3);
    if (y + rowHeight > 272) {
      pdf.addPage();
      y = 18;
    }
    if (index % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(left, y, 178, rowHeight, 'F');
    }
    const cells = [String(index + 1), description, String(item.quantity), `${quotation.currency} ${item.unitPrice.toFixed(2)}`, `${quotation.currency} ${item.total.toFixed(2)}`];
    cells.forEach((cell, cellIndex) => pdf.text(cell, left + widths.slice(0, cellIndex).reduce((a, b) => a + b, 0) + 2, y + 5));
    y += rowHeight;
  });

  y += 6;
  const totals = [
    ['Subtotal', quotation.subtotal],
    ['Discount', -quotation.discountTotal],
    ['Tax', quotation.taxTotal],
    ['Grand total', quotation.grandTotal],
  ] as const;
  totals.forEach(([label, amount], index) => {
    if (index === totals.length - 1) pdf.setFont('helvetica', 'bold');
    pdf.text(label, 145, y, { align: 'right' });
    pdf.text(`${quotation.currency} ${amount.toFixed(2)}`, right, y, { align: 'right' });
    y += 5;
  });

  if (quotation.notes || quotation.terms) {
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes and terms', left, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text(pdf.splitTextToSize([quotation.notes, quotation.terms].filter(Boolean).join('\n\n'), 178), left, y);
  }

  return {
    filename: `${quotation.quoteNumber.replace(/[^a-z0-9_-]/gi, '_')}.pdf`,
    mimeType: 'application/pdf',
    data: new Uint8Array(pdf.output('arraybuffer')),
  };
}

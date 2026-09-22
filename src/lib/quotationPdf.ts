import { jsPDF } from 'jspdf';
import { documentQuotation } from './documentData';
import { CompanyProfile, DeliveryOrder, Invoice, Quotation } from '../types';

export interface PdfAttachment {
  filename: string;
  mimeType: string;
  data: Uint8Array;
}

export type DocumentPdfType = 'quotation' | 'do' | 'invoice';

interface Column {
  label: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

const PAGE_BOTTOM = 270;
const LEFT = 16;
const RIGHT = 194;
const CONTENT_WIDTH = RIGHT - LEFT;

function lines(values: Array<string | undefined>): string[] {
  return values
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(/\r?\n/).filter(Boolean));
}

function safeFilename(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, '_');
}

export function createDocumentPdf(
  type: DocumentPdfType,
  quotation: Quotation,
  company: CompanyProfile,
  deliveryOrder?: DeliveryOrder | null,
  invoice?: Invoice | null,
): PdfAttachment {
  if (type === 'do' && !deliveryOrder) throw new Error('Generate the delivery order before downloading its PDF.');
  if (type === 'invoice' && !invoice) throw new Error('Generate the invoice before downloading its PDF.');

  quotation = documentQuotation(type, quotation, deliveryOrder, invoice);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const title = type === 'quotation' ? 'QUOTATION' : type === 'do' ? 'DELIVERY ORDER' : 'INVOICE';
  const documentNumber = type === 'quotation'
    ? quotation.quoteNumber
    : type === 'do'
    ? deliveryOrder!.doNumber
    : invoice!.invoiceNumber;
  const documentDate = type === 'quotation'
    ? quotation.date
    : type === 'do'
    ? deliveryOrder!.deliveryDate
    : invoice!.date;
  let y = 18;

  const ensureSpace = (height: number) => {
    if (y + height > PAGE_BOTTOM) {
      pdf.addPage();
      y = 18;
    }
  };

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(company.name || 'Company', LEFT, y);
  pdf.setFontSize(16);
  pdf.text(title, RIGHT, y, { align: 'right' });
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const companyLines = lines([company.address, company.phone, company.email, company.taxId ? `Tax ID: ${company.taxId}` : undefined]);
  const referenceLines = [
    `${type === 'quotation' ? 'Quotation' : type === 'do' ? 'DO' : 'Invoice'} no.: ${documentNumber}`,
    `Issue date: ${documentDate}`,
    ...(type === 'quotation'
      ? [`Valid until: ${quotation.validUntil}`]
      : [`PO reference: ${quotation.poNumber || 'Not provided'}`, `Quotation reference: ${quotation.quoteNumber}`]),
    ...(type === 'invoice' ? [`Due date: ${invoice!.dueDate}`] : []),
  ];
  pdf.text(companyLines, LEFT, y);
  pdf.text(referenceLines, RIGHT, y, { align: 'right' });
  y += Math.max(companyLines.length, referenceLines.length) * 4 + 7;

  pdf.setDrawColor(203, 213, 225);
  pdf.line(LEFT, y, RIGHT, y);
  y += 7;

  pdf.setFont('helvetica', 'bold');
  pdf.text(type === 'do' ? 'DELIVER TO' : 'BILL TO', LEFT, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  const clientLines = lines([
    quotation.client.name,
    quotation.client.companyName,
    type === 'do' ? deliveryOrder!.deliveryAddress : quotation.client.address,
    quotation.client.email,
    quotation.client.phone,
  ]);
  pdf.text(clientLines, LEFT, y);
  y += clientLines.length * 4 + 8;

  const columns: Column[] = type === 'do'
    ? [
        { label: '#', width: 10, align: 'center' },
        { label: 'Description', width: 100 },
        { label: 'Qty', width: 20, align: 'center' },
        { label: 'Remark', width: 48 },
      ]
    : [
        { label: '#', width: 10, align: 'center' },
        { label: 'Description', width: 78 },
        { label: 'Qty', width: 18, align: 'center' },
        { label: 'Unit price', width: 34, align: 'right' },
        { label: 'Total', width: 38, align: 'right' },
      ];

  const drawTableHeader = () => {
    pdf.setFillColor(30, 41, 59);
    pdf.rect(LEFT, y, CONTENT_WIDTH, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    columns.forEach((column, index) => {
      const x = LEFT + columns.slice(0, index).reduce((sum, item) => sum + item.width, 0);
      const textX = column.align === 'right' ? x + column.width - 2 : column.align === 'center' ? x + column.width / 2 : x + 2;
      pdf.text(column.label, textX, y + 5.3, { align: column.align || 'left' });
    });
    y += 8;
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'normal');
  };

  drawTableHeader();
  quotation.items.forEach((item, index) => {
    const description = pdf.splitTextToSize(item.description || '-', columns[1].width - 4) as string[];
    const remark = type === 'do'
      ? (pdf.splitTextToSize(item.remark || item.notes || '-', columns[3].width - 4) as string[])
      : [];
    const rowHeight = Math.max(8, Math.max(description.length, remark.length) * 4 + 3);
    if (y + rowHeight > PAGE_BOTTOM) {
      pdf.addPage();
      y = 18;
      drawTableHeader();
    }
    if (index % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(LEFT, y, CONTENT_WIDTH, rowHeight, 'F');
    }
    const cells: Array<string | string[]> = type === 'do'
      ? [String(index + 1), description, String(item.quantity), remark]
      : [
          String(index + 1),
          description,
          String(item.quantity),
          `${quotation.currency} ${item.unitPrice.toFixed(2)}`,
          `${quotation.currency} ${item.total.toFixed(2)}`,
        ];
    cells.forEach((cell, cellIndex) => {
      const column = columns[cellIndex];
      const x = LEFT + columns.slice(0, cellIndex).reduce((sum, current) => sum + current.width, 0);
      const textX = column.align === 'right' ? x + column.width - 2 : column.align === 'center' ? x + column.width / 2 : x + 2;
      pdf.text(cell, textX, y + 5, { align: column.align || 'left' });
    });
    y += rowHeight;
  });

  if (type !== 'do') {
    ensureSpace(34);
    y += 6;
    const totals = [
      ['Subtotal', quotation.subtotal],
      ['Discount', -quotation.discountTotal],
      ['Tax', quotation.taxTotal],
      [type === 'invoice' ? 'Amount due' : 'Grand total', quotation.grandTotal],
    ] as const;
    totals.forEach(([label, amount], index) => {
      pdf.setFont('helvetica', index === totals.length - 1 ? 'bold' : 'normal');
      pdf.text(label, 145, y, { align: 'right' });
      pdf.text(`${quotation.currency} ${amount.toFixed(2)}`, RIGHT, y, { align: 'right' });
      y += 5;
    });
  }

  if (type === 'invoice') {
    ensureSpace(24);
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT DETAILS', LEFT, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    const paymentLines = lines([
      `Payment term: ${invoice!.paymentTerms}`,
      invoice!.bankDetails,
    ]);
    pdf.text(paymentLines, LEFT, y);
    y += paymentLines.length * 4;
  }

  const notes = type === 'do'
    ? 'Goods are supplied according to the referenced purchase order.'
    : type === 'invoice'
    ? ''
    : [quotation.notes, quotation.terms].filter(Boolean).join('\n\n');
  if (notes) {
    ensureSpace(20);
    y += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.text(type === 'do' ? 'DELIVERY REMARKS' : 'NOTES AND TERMS', LEFT, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    const wrapped = pdf.splitTextToSize(notes, CONTENT_WIDTH) as string[];
    wrapped.forEach((line) => {
      ensureSpace(5);
      pdf.text(line, LEFT, y);
      y += 4;
    });
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(203, 213, 225);
    pdf.line(LEFT, 278, RIGHT, 278);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Document remark: This is a computer-generated document and is valid without a signature.', 105, 284, { align: 'center' });
    pdf.text(`Page ${page} of ${pageCount}`, RIGHT, 289, { align: 'right' });
  }

  return {
    filename: `${safeFilename(documentNumber)}-${type === 'do' ? 'DO' : type === 'invoice' ? 'Invoice' : 'Quotation'}.pdf`,
    mimeType: 'application/pdf',
    data: new Uint8Array(pdf.output('arraybuffer')),
  };
}

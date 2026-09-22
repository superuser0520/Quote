import { jsPDF } from 'jspdf';
import { ClientDetails, CompanyProfile, Invoice, Quotation } from '../types';
import { PdfAttachment } from './quotationPdf';

const LEFT = 16;
const RIGHT = 194;
const PAGE_BOTTOM = 270;

const customerKey = (client: ClientDetails) =>
  (client.companyName || client.email || client.name).trim().toLowerCase();

const safeFilename = (value: string) => value.replace(/[^a-z0-9_-]/gi, '_');

export const invoiceDueStatus = (invoice: Invoice, referenceDate = new Date()) => {
  if (invoice.status === 'Paid') return 'Paid';
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${invoice.dueDate}T00:00:00`);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return `Overdue ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;
  if (days === 0) return 'Due today';
  return `Due in ${days} day${days === 1 ? '' : 's'}`;
};

export const invoiceIsOverdue = (invoice: Invoice, referenceDate = new Date()) =>
  invoice.status !== 'Paid' && invoiceDueStatus(invoice, referenceDate).startsWith('Overdue');

export const outstandingInvoicesForCustomer = (
  selected: Invoice,
  invoices: Invoice[],
  quotations: Quotation[] = [],
) => {
  const key = customerKey(selected.client);
  return invoices
    .filter((invoice) => customerKey(invoice.client) === key && invoice.status !== 'Paid')
    .map((invoice) => {
      const quotation = quotations.find((quote) => quote.id === invoice.quotationId);
      return quotation?.poNumber ? { ...invoice, poNumber: quotation.poNumber } : invoice;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};

export function createStatementOfAccountPdf(
  customer: ClientDetails,
  invoices: Invoice[],
  company: CompanyProfile,
): PdfAttachment {
  if (invoices.length === 0) throw new Error('This customer has no outstanding invoices.');

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const statementDate = new Date().toISOString().split('T')[0];
  let y = 18;

  const drawHeader = () => {
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(company.name || 'Company', LEFT, y);
    pdf.setFontSize(16);
    pdf.text('STATEMENT OF ACCOUNT', RIGHT, y, { align: 'right' });
    y += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const issuer = [company.address, company.phone, company.email]
      .filter(Boolean)
      .flatMap((value) => value.split(/\r?\n/));
    pdf.text(issuer, LEFT, y);
    pdf.text([`Statement date: ${statementDate}`, `Outstanding invoices: ${invoices.length}`], RIGHT, y, { align: 'right' });
    y += Math.max(issuer.length, 2) * 4 + 7;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(LEFT, y, RIGHT, y);
    y += 7;
  };

  const drawTableHeader = () => {
    pdf.setFillColor(30, 41, 59);
    pdf.rect(LEFT, y, RIGHT - LEFT, 9, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('Invoice', 18, y + 6);
    pdf.text('PIC', 45, y + 6);
    pdf.text('Due date', 96, y + 6);
    pdf.text('Due status', 121, y + 6);
    pdf.text('PO reference', 153, y + 6);
    pdf.text('Outstanding', 192, y + 6, { align: 'right' });
    y += 9;
  };

  const newPage = () => {
    pdf.addPage();
    y = 18;
    drawTableHeader();
  };

  drawHeader();
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('ACCOUNT FOR', LEFT, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  const customerLines = [customer.companyName, customer.name, customer.address, customer.email, customer.phone]
    .filter(Boolean)
    .flatMap((value) => value.split(/\r?\n/));
  pdf.text(customerLines, LEFT, y);
  y += customerLines.length * 4 + 8;

  drawTableHeader();
  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'normal');
  invoices.forEach((invoice, index) => {
    const picLines = pdf.splitTextToSize(
      [invoice.client.name, invoice.client.email].filter(Boolean).join(' / '),
      46,
    ) as string[];
    const rowHeight = Math.max(9, picLines.length * 4 + 3);
    if (y + rowHeight > PAGE_BOTTOM) newPage();
    const overdue = invoiceIsOverdue(invoice);
    if (overdue) {
      pdf.setFillColor(254, 226, 226);
      pdf.rect(LEFT, y, RIGHT - LEFT, rowHeight, 'F');
    } else if (index % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(LEFT, y, RIGHT - LEFT, rowHeight, 'F');
    }
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(8);
    pdf.text(invoice.invoiceNumber, 18, y + 6);
    pdf.text(picLines, 45, y + 5);
    pdf.text(invoice.dueDate, 96, y + 6);
    if (overdue) {
      pdf.setTextColor(185, 28, 28);
      pdf.setFont('helvetica', 'bold');
    }
    pdf.text(invoiceDueStatus(invoice), 121, y + 6);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'normal');
    pdf.text(invoice.poNumber || '-', 153, y + 6);
    pdf.text(`${invoice.currency} ${invoice.grandTotal.toFixed(2)}`, 192, y + 6, { align: 'right' });
    y += rowHeight;
  });

  const totals = invoices.reduce((map, invoice) => {
    map.set(invoice.currency, (map.get(invoice.currency) || 0) + invoice.grandTotal);
    return map;
  }, new Map<string, number>());

  if (y + 48 > PAGE_BOTTOM) newPage();
  y += 7;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('TOTAL OUTSTANDING', 135, y, { align: 'right' });
  Array.from(totals.entries()).forEach(([currency, total]) => {
    pdf.text(`${currency} ${total.toFixed(2)}`, RIGHT, y, { align: 'right' });
    y += 6;
  });

  y += 5;
  pdf.setFontSize(9);
  pdf.text('PAYMENT DETAILS', LEFT, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  const paymentDetails = [
    'Payment term: 30 days',
    company.bankName ? `Bank: ${company.bankName}` : undefined,
    company.bankAccountName ? `Account name: ${company.bankAccountName}` : undefined,
    company.bankAccountNo ? `Account number: ${company.bankAccountNo}` : undefined,
  ].filter((line): line is string => Boolean(line));
  pdf.text(paymentDetails, LEFT, y);
  y += paymentDetails.length * 4 + 7;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Please arrange payment for the outstanding balance and quote the invoice number in your payment reference.', LEFT, y);

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(203, 213, 225);
    pdf.line(LEFT, 278, RIGHT, 278);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text('This is a computer-generated statement of account and is valid without a signature.', 105, 284, { align: 'center' });
    pdf.text(`Page ${page} of ${pages}`, RIGHT, 289, { align: 'right' });
  }

  return {
    filename: `${safeFilename(customer.companyName || customer.name)}-Statement-of-Account-${statementDate}.pdf`,
    mimeType: 'application/pdf',
    data: new Uint8Array(pdf.output('arraybuffer')),
  };
}

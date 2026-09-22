import type { Quotation, Invoice, DeliveryOrder } from '../types';
import type { DatabaseState } from './dbClient';

export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const revisionRoot = (quote: Quotation) => quote.revisionRootId || quote.id;
export const quotationVersions = (quotes: Quotation[], quote: Quotation) =>
  quotes.filter(q => revisionRoot(q) === revisionRoot(quote))
    .sort((a, b) => (b.revisionNumber || 0) - (a.revisionNumber || 0));
export const isLatestQuotation = (quotes: Quotation[], quote: Quotation) => quotationVersions(quotes, quote)[0]?.id === quote.id;

export function deleteQuotationVersion(state: DatabaseState, quotationId: string): DatabaseState {
  const target = uniqueRecord(state.quotations, quotationId, 'Quotation');
  return { ...state,
    quotations: state.quotations.filter(q => q.id !== target.id).map(q => q.revisionOfId === target.id
      ? { ...q, revisionOfId: target.revisionOfId } : q),
    deliveryOrders: state.deliveryOrders.filter(d => d.quotationId !== target.id),
    invoices: state.invoices.filter(i => i.quotationId !== target.id),
  };
}

export function effectiveQuotation(quote: Quotation, today = localDate()): Quotation {
  // Acceptance/issued documents do not expire just because the original offer date passed.
  if (!['Draft', 'Sent (Pending PO)', 'Expired'].includes(quote.status) || quote.poNumber || quote.invoiceId || quote.deliveryOrderId) return quote;
  const expired = /^\d{4}-\d{2}-\d{2}$/.test(quote.validUntil) && quote.validUntil < today;
  const status = expired ? 'Expired' : quote.status === 'Expired' ? 'Draft' : quote.status;
  return status === quote.status ? quote : { ...quote, status };
}

function uniqueRecord<T extends { id: string }>(records: T[], id: string, label: string): T {
  const matches = records.filter(record => record.id === id);
  if (matches.length !== 1) throw new Error(`${label} could not be identified uniquely. No records were changed.`);
  return matches[0];
}

export function markInvoicePaid(state: DatabaseState, invoiceId: string, now = new Date()): DatabaseState {
  const target = uniqueRecord(state.invoices, invoiceId, 'Invoice');
  if (state.quotations.filter(q => q.id === target.quotationId).length > 1)
    throw new Error('Linked quotation could not be identified uniquely. No records were changed.');
  if (target.status === 'Paid') return state;
  const timestamp = now.toISOString();
  const invoices = state.invoices.map(invoice => invoice.id === target.id
    ? { ...invoice, status: 'Paid' as const, paidAt: timestamp, updatedAt: timestamp } : invoice);
  const linked = invoices.filter(invoice => invoice.quotationId === target.quotationId);
  return { ...state, invoices, quotations: state.quotations.map(quote =>
    quote.id === target.quotationId && linked.every(invoice => invoice.status === 'Paid')
      ? { ...quote, status: 'Paid', updatedAt: timestamp } : quote) };
}

function nextNumber(prefix: string, existing: string[], now: Date) {
  const base = `${prefix}-${now.getFullYear()}-`;
  const highest = existing.filter(value => value.startsWith(base))
    .map(value => Number(value.slice(base.length))).filter(Number.isFinite);
  return `${base}${String(Math.max(0, ...highest) + 1).padStart(3, '0')}`;
}

export function issueDocumentPair(state: DatabaseState, quotationId: string, now = new Date()) {
  const quote = uniqueRecord(state.quotations, quotationId, 'Quotation');
  if (!isLatestQuotation(state.quotations, quote)) throw new Error('Open the latest quotation version before issuing documents.');
  if (['Expired', 'Cancelled'].includes(effectiveQuotation(quote, localDate(now)).status)) throw new Error('Revise this quotation before issuing documents.');
  const linkedDOs = state.deliveryOrders.filter(d => d.quotationId === quote.id);
  const linkedInvoices = state.invoices.filter(i => i.quotationId === quote.id);
  if (linkedDOs.length > 1 || linkedInvoices.length > 1) throw new Error('This quotation has multiple linked documents. Open the specific invoice or DO instead.');
  const timestamp = now.toISOString();
  const due = new Date(now); due.setDate(due.getDate() + 30);
  const deliveryOrder: DeliveryOrder = linkedDOs[0] || {
    id: crypto.randomUUID(), doNumber: nextNumber('DO', state.deliveryOrders.map(d => d.doNumber), now),
    quotationId: quote.id, quoteNumber: quote.quoteNumber, client: structuredClone(quote.client),
    deliveryDate: localDate(now), deliveryAddress: quote.client.address,
    items: quote.items.map(item => ({id: item.id, description: item.description, quantity: item.quantity, notes: item.notes || item.remark})),
    status: 'Pending Delivery', createdAt: timestamp, updatedAt: timestamp,
  };
  const invoice: Invoice = linkedInvoices[0] || {
    id: crypto.randomUUID(), invoiceNumber: nextNumber('INV', state.invoices.map(i => i.invoiceNumber), now),
    quotationId: quote.id, quoteNumber: quote.quoteNumber, poNumber: quote.poNumber,
    client: structuredClone(quote.client), date: localDate(now), dueDate: localDate(due),
    items: structuredClone(quote.items), subtotal: quote.subtotal, taxTotal: quote.taxTotal,
    discountTotal: quote.discountTotal, grandTotal: quote.grandTotal, currency: quote.currency,
    paymentTerms: '30 days', bankDetails: `${state.companyProfile.bankName} | Acc: ${state.companyProfile.bankAccountNo}`,
    status: 'Unpaid', createdAt: timestamp, updatedAt: timestamp,
  };
  const updated: Quotation = {...quote, deliveryOrderId: deliveryOrder.id, deliveryOrderNumber: deliveryOrder.doNumber,
    invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, status: invoice.status === 'Paid' ? 'Paid' : 'Invoice Issued', updatedAt: timestamp};
  return { deliveryOrder, invoice, quotation: updated, state: {...state,
    quotations: state.quotations.map(q => q.id === quote.id ? updated : q),
    deliveryOrders: linkedDOs.length ? state.deliveryOrders : [deliveryOrder, ...state.deliveryOrders],
    invoices: linkedInvoices.length ? state.invoices : [invoice, ...state.invoices],
  }};
}

export function reviseQuotation(state: DatabaseState, sourceId: string, now = new Date()) {
  const source = uniqueRecord(state.quotations, sourceId, 'Quotation');
  const latest = quotationVersions(state.quotations, source)[0];
  const revisionNumber = (latest.revisionNumber || 0) + 1;
  const base = latest.revisionBaseNumber || source.quoteNumber;
  const quoteNumber = `${base}-R${revisionNumber}`;
  if (state.quotations.some(q => q.quoteNumber === quoteNumber)) throw new Error('This revision number already exists. Review the quotation history first.');
  const valid = new Date(now); valid.setDate(valid.getDate() + 30);
  const quotation: Quotation = {
    ...structuredClone(latest), id: crypto.randomUUID(), quoteNumber, revisionRootId: revisionRoot(source),
    revisionOfId: latest.id, revisionBaseNumber: base, revisionNumber,
    date: localDate(now), validUntil: localDate(valid), status: 'Draft',
    poNumber: undefined, poReceivedDate: undefined, poEmailId: undefined, poEmailSnippet: undefined, poAttachments: undefined,
    poEmailSubject: undefined, poEmailSender: undefined, invoiceId: undefined, invoiceNumber: undefined,
    deliveryOrderId: undefined, deliveryOrderNumber: undefined, syncedToSheet: false,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  };
  return {quotation, state: {...state, quotations: [quotation, ...state.quotations]}};
}

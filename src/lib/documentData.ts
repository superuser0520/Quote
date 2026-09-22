import type { Quotation, DeliveryOrder, Invoice } from '../types';

// Render issued documents from their own saved records, even after a quote is revised.
export function documentQuotation(type: 'quotation' | 'do' | 'invoice', quotation: Quotation, deliveryOrder?: DeliveryOrder | null, invoice?: Invoice | null): Quotation {
  if (type === 'invoice' && invoice) return {...quotation,
    client: invoice.client, items: invoice.items, currency: invoice.currency,
    subtotal: invoice.subtotal, discountTotal: invoice.discountTotal, taxTotal: invoice.taxTotal,
    grandTotal: invoice.grandTotal, poNumber: invoice.poNumber || quotation.poNumber, quoteNumber: invoice.quoteNumber,
  };
  if (type === 'do' && deliveryOrder) return {...quotation,
    client: {...deliveryOrder.client, address: deliveryOrder.deliveryAddress}, quoteNumber: deliveryOrder.quoteNumber,
    items: deliveryOrder.items.map(item => ({...item, remark: item.notes, unitPrice: 0, total: 0, taxRate: 0, discount: 0})),
  };
  return quotation;
}

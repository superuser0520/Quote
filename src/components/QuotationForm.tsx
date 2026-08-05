import React, { useState } from 'react';
import { Quotation, LineItem, CompanyProfile, ClientDetails } from '../types';
import { Plus, Trash2, ArrowLeft, Save, Sparkles, Building, User, Mail, Phone, MapPin, Calendar, DollarSign } from 'lucide-react';

interface QuotationFormProps {
  initialQuotation?: Quotation | null;
  companyProfile: CompanyProfile;
  savedClients?: ClientDetails[];
  onSave: (quote: Quotation) => void;
  onCancel: () => void;
}

export const QuotationForm: React.FC<QuotationFormProps> = ({
  initialQuotation,
  companyProfile,
  savedClients = [],
  onSave,
  onCancel,
}) => {
  const isEditing = !!initialQuotation;

  const [quoteNumber, setQuoteNumber] = useState(
    initialQuotation?.quoteNumber || `QT-2026-${Math.floor(100 + Math.random() * 900)}`
  );

  const [date, setDate] = useState(
    initialQuotation?.date || new Date().toISOString().split('T')[0]
  );
  const [validUntil, setValidUntil] = useState(
    initialQuotation?.validUntil ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState(initialQuotation?.currency || 'MYR');

  const [client, setClient] = useState({
    name: initialQuotation?.client.name || '',
    companyName: initialQuotation?.client.companyName || '',
    email: initialQuotation?.client.email || '',
    phone: initialQuotation?.client.phone || '',
    address: initialQuotation?.client.address || '',
  });

  const [items, setItems] = useState<LineItem[]>(
    initialQuotation?.items || [
      {
        id: `item-${Date.now()}-1`,
        description: 'Professional Service / Product Item',
        quantity: 1,
        unitPrice: 1500,
        taxRate: 0,
        discount: 0,
        total: 1500,
      },
    ]
  );

  const [notes, setNotes] = useState(initialQuotation?.notes || companyProfile.defaultNotes || '');
  const [terms, setTerms] = useState(initialQuotation?.terms || companyProfile.defaultTerms || '');
  const [status, setStatus] = useState(initialQuotation?.status || 'Sent (Pending PO)');
  const [poNumber, setPoNumber] = useState(initialQuotation?.poNumber || '');
  const [poReceivedDate, setPoReceivedDate] = useState(
    initialQuotation?.poReceivedDate || new Date().toISOString().split('T')[0]
  );

  // Helper calculation
  const updateLineItem = (index: number, fields: Partial<LineItem>) => {
    const next = [...items];
    const item = { ...next[index], ...fields };

    const raw = item.quantity * item.unitPrice;
    const discountAmt = (raw * item.discount) / 100;
    const afterDiscount = raw - discountAmt;
    const taxAmt = (afterDiscount * item.taxRate) / 100;
    item.total = Number((afterDiscount + taxAmt).toFixed(2));

    next[index] = item;
    setItems(next);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}-${items.length + 1}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
        discount: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const discountTotal = items.reduce(
    (acc, item) => acc + (item.quantity * item.unitPrice * item.discount) / 100,
    0
  );
  const taxTotal = items.reduce(
    (acc, item) =>
      acc +
      ((item.quantity * item.unitPrice - (item.quantity * item.unitPrice * item.discount) / 100) *
        item.taxRate) /
        100,
    0
  );
  const grandTotal = Number((subtotal - discountTotal + taxTotal).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.name.trim()) {
      alert('Please enter client name');
      return;
    }

    const savedQuote: Quotation = {
      id: initialQuotation?.id || `q-${Date.now()}`,
      quoteNumber,
      client,
      date,
      validUntil,
      items,
      subtotal: Number(subtotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      grandTotal,
      currency,
      status: status as any,
      notes,
      terms,
      poNumber: poNumber.trim() || undefined,
      poReceivedDate: poNumber.trim() ? poReceivedDate : undefined,
      poEmailSnippet: initialQuotation?.poEmailSnippet,
      poEmailSubject: initialQuotation?.poEmailSubject,
      poEmailSender: initialQuotation?.poEmailSender,
      poEmailId: initialQuotation?.poEmailId,
      deliveryOrderId: initialQuotation?.deliveryOrderId,
      deliveryOrderNumber: initialQuotation?.deliveryOrderNumber,
      invoiceId: initialQuotation?.invoiceId,
      invoiceNumber: initialQuotation?.invoiceNumber,
      createdAt: initialQuotation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncedToSheet: false,
    };

    onSave(savedQuote);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to List
        </button>
        <h2 className="text-xl font-bold text-slate-900">
          {isEditing ? `Edit Quotation ${quoteNumber}` : 'Create New Quotation'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Document Header Meta Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="p-3 -mx-6 -mt-6 mb-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center px-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Quotation Builder
            </h3>
            <span className="text-xs font-mono font-semibold text-slate-400">Ref: {quoteNumber}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Quote Number
              </label>
              <input
                type="text"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Quote Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Valid Until
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-semibold text-slate-800"
              >
                <option value="USD">USD ($)</option>
                <option value="MYR">MYR (RM)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Client Information Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              Client Information
            </h3>
            <span className="text-[11px] text-slate-400">Recipient Details</span>
          </div>

          {savedClients.length > 0 && (
            <div className="mb-4">
              <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">
                Existing customer — auto-fill details
              </label>
              <select
                defaultValue=""
                onChange={(event) => {
                  const selected = savedClients[Number(event.target.value)];
                  if (selected) setClient({ ...selected });
                }}
                className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Select an existing customer...</option>
                {savedClients.map((savedClient, index) => (
                  <option key={`${savedClient.email}-${savedClient.companyName}-${index}`} value={index}>
                    {savedClient.companyName || savedClient.name}{savedClient.email ? ` — ${savedClient.email}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corp / John Doe"
                value={client.name}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Company Name
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corporation"
                value={client.companyName}
                onChange={(e) => setClient({ ...client, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Email Address (Used for Gmail PO matching)
              </label>
              <input
                type="email"
                placeholder="client@company.com"
                value={client.email}
                onChange={(e) => setClient({ ...client, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+1 555-0199"
                value={client.phone}
                onChange={(e) => setClient({ ...client, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Billing / Delivery Address
              </label>
              <textarea
                rows={2}
                placeholder="Full address details"
                value={client.address}
                onChange={(e) => setClient({ ...client, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Line Items Table
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 min-w-[180px]">Description</th>
                  <th className="py-2.5 px-3 w-16 text-center">Qty</th>
                  <th className="py-2.5 px-3 w-28 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 w-28 text-right text-amber-700">Unit Cost</th>
                  <th className="py-2.5 px-3 w-16 text-right">Disc %</th>
                  <th className="py-2.5 px-3 w-16 text-right">Tax %</th>
                  <th className="py-2.5 px-3 w-28 text-right">Total ({currency})</th>
                  <th className="py-2.5 px-3 min-w-[120px]">Remark</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="Item name / description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, { description: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                        required
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(index, { quantity: Math.max(1, Number(e.target.value)) })
                        }
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs text-center font-bold"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(index, { unitPrice: Number(e.target.value) })
                        }
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs text-right font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unitCost ?? ''}
                        onChange={(e) =>
                          updateLineItem(index, { unitCost: e.target.value ? Number(e.target.value) : undefined })
                        }
                        className="w-full px-2 py-1.5 border border-amber-200 bg-amber-50/30 text-amber-900 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs text-right font-mono"
                        title="Unit cost price for profit margin calculation"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) =>
                          updateLineItem(index, { discount: Number(e.target.value) })
                        }
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs text-right"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.taxRate}
                        onChange={(e) =>
                          updateLineItem(index, { taxRate: Number(e.target.value) })
                        }
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs text-right"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="Optional remark"
                        value={item.remark || ''}
                        onChange={(e) => updateLineItem(index, { remark: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs text-slate-600"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="mt-6 flex flex-col md:flex-row justify-between items-start border-t border-slate-100 pt-4 gap-4">
            <div className="text-xs text-slate-500 max-w-sm">
              <p className="font-bold text-slate-700 mb-1">Dynamic Calculations</p>
              Subtotal, discounts, and taxes update automatically as line items change.
            </div>
            <div className="w-full md:w-72 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{currency} {subtotal.toFixed(2)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount:</span>
                  <span className="font-mono">-{currency} {discountTotal.toFixed(2)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax Amount:</span>
                  <span className="font-mono">+{currency} {taxTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-2">
                <span>Grand Total:</span>
                <span className="font-mono text-indigo-600">{currency} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Notes / Delivery Remarks
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            ></textarea>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Terms & Payment Conditions
            </label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            ></textarea>
          </div>
          <div className="md:col-span-2 border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quotation Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Quotation['status'])}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Draft">Draft</option>
                <option value="Sent (Pending PO)">Sent (Pending PO)</option>
                <option value="PO Received">PO Received</option>
                <option value="DO Issued">DO Issued</option>
                <option value="Invoice Issued">Invoice Issued</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            {['PO Received', 'DO Issued', 'Invoice Issued', 'Paid'].includes(status) && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">PO Number</label>
                  <input
                    required
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="e.g. PO-2026-001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">PO Received Date</label>
                  <input
                    type="date"
                    required
                    value={poReceivedDate}
                    onChange={(e) => setPoReceivedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-lg shadow-md shadow-indigo-200 transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'Save Quotation Changes' : 'Generate Quotation'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

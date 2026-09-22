import React, { useState } from 'react';
import { Quotation, DeliveryOrder, Invoice, CompanyProfile, LineItem, QuotationStatus, ClientDetails } from '../types';
import {
  X,
  Plus,
  Trash2,
  FileText,
  Truck,
  Receipt,
  Save,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  PlusCircle,
  Tag,
  CheckCircle2,
  HelpCircle,
  Clock
} from 'lucide-react';

interface ManualRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyProfile: CompanyProfile;
  quotations: Quotation[];
  savedClients: ClientDetails[];
  onAddQuotation: (q: Quotation) => void;
  onAddDeliveryOrder: (doObj: DeliveryOrder) => void;
  onAddInvoice: (inv: Invoice) => void;
}

export const ManualRecordModal: React.FC<ManualRecordModalProps> = ({
  isOpen,
  onClose,
  companyProfile,
  quotations,
  savedClients,
  onAddQuotation,
  onAddDeliveryOrder,
  onAddInvoice,
}) => {
  const [docType, setDocType] = useState<'quotation' | 'do' | 'invoice'>('quotation');

  // Common Client Fields
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Common Doc Meta
  const [currency, setCurrency] = useState('MYR');
  const [docNumber, setDocNumber] = useState('');
  const [refQuoteNumber, setRefQuoteNumber] = useState('');
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().substring(0, 10));
  const [dueDateStr, setDueDateStr] = useState('');

  // Statuses
  const [quoteStatus, setQuoteStatus] = useState<QuotationStatus>('Paid');
  const [doStatus, setDoStatus] = useState<'Pending Delivery' | 'In Transit' | 'Delivered'>('Delivered');
  const [invoiceStatus, setInvoiceStatus] = useState<'Unpaid' | 'Partially Paid' | 'Paid'>('Paid');

  // DO Specific
  const [driverName, setDriverName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [trackingRef, setTrackingRef] = useState('');

  // Line Items
  const [items, setItems] = useState<
    {
      description: string;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      taxRate: number;
      discount: number;
      remark: string;
    }[]
  >([
    {
      description: 'Standard Service / Product Item',
      quantity: 1,
      unitPrice: 1000,
      unitCost: 600,
      taxRate: 0,
      discount: 0,
      remark: '',
    },
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        unitCost: 0,
        taxRate: 0,
        discount: 0,
        remark: '',
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const next = [...items];
    (next[idx] as any)[field] = val;
    setItems(next);
  };

  const calculateSubtotal = () =>
    items.reduce((acc, it) => acc + (it.quantity || 0) * (it.unitPrice || 0), 0);

  const calculateGrandTotal = () => {
    return items.reduce((acc, it) => {
      const lineSub = (it.quantity || 0) * (it.unitPrice || 0);
      const discAmt = (lineSub * (it.discount || 0)) / 100;
      const afterDisc = lineSub - discAmt;
      const taxAmt = (afterDisc * (it.taxRate || 0)) / 100;
      return acc + afterDisc + taxAmt;
    }, 0);
  };

  const selectLinkedQuotation = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    const quote = quotations.find((item) => item.id === quotationId);
    if (!quote) return;
    setRefQuoteNumber(quote.quoteNumber);
    setPoNumber(quote.poNumber || '');
    setCurrency(quote.currency);
    setClientName(quote.client.name);
    setCompanyName(quote.client.companyName);
    setClientEmail(quote.client.email);
    setClientPhone(quote.client.phone);
    setClientAddress(quote.client.address);
    setItems(quote.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitCost: item.unitCost || 0,
      taxRate: item.taxRate,
      discount: item.discount,
      remark: item.remark || item.notes || '',
    })));
  };

  const selectExistingCustomer = (index: string) => {
    const customer = savedClients[Number(index)];
    if (!customer) return;
    setClientName(customer.name);
    setCompanyName(customer.companyName);
    setClientEmail(customer.email);
    setClientPhone(customer.phone);
    setClientAddress(customer.address);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const clientObj = {
      name: clientName || 'Walk-in Client',
      companyName: companyName || 'Client Organization',
      email: clientEmail || 'client@example.com',
      phone: clientPhone || '+1 555-0192',
      address: clientAddress || 'Singapore',
    };

    const nowIso = new Date().toISOString();

    if (docType === 'quotation') {
      const formattedItems: LineItem[] = items.map((it, i) => {
        const lineSub = (it.quantity || 0) * (it.unitPrice || 0);
        const discAmt = (lineSub * (it.discount || 0)) / 100;
        const afterDisc = lineSub - discAmt;
        const taxAmt = (afterDisc * (it.taxRate || 0)) / 100;
        return {
          id: `item-manual-${Date.now()}-${i}`,
          description: it.description || 'Item Description',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          unitCost: Number(it.unitCost) || 0,
          taxRate: Number(it.taxRate) || 0,
          discount: Number(it.discount) || 0,
          remark: it.remark,
          total: Math.round((afterDisc + taxAmt) * 100) / 100,
        };
      });

      const subtotal = calculateSubtotal();
      const grandTotal = calculateGrandTotal();

      const newQuote: Quotation = {
        id: crypto.randomUUID(),
        quoteNumber: docNumber || `QT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        client: clientObj,
        date: dateStr || new Date().toISOString().substring(0, 10),
        validUntil: dueDateStr || new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
        items: formattedItems,
        subtotal,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal,
        currency,
        status: quoteStatus,
        poNumber: poNumber || undefined,
        poReceivedDate: poNumber ? dateStr : undefined,
        notes: companyProfile.defaultNotes || 'Thank you for your business.',
        terms: companyProfile.defaultTerms || 'Payment NET 30 Days.',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      onAddQuotation(newQuote);
    } else if (docType === 'do') {
      const doItems = items.map((it, i) => ({
        id: `item-do-manual-${Date.now()}-${i}`,
        description: it.description || 'Delivered Goods',
        quantity: Number(it.quantity) || 1,
        notes: it.remark || undefined,
      }));

      const newDO: DeliveryOrder = {
        id: crypto.randomUUID(),
        doNumber: docNumber || `DO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        quotationId: selectedQuotationId || `q-manual-ref-${Date.now()}`,
        quoteNumber: refQuoteNumber || 'MANUAL-REF',
        client: clientObj,
        deliveryDate: dateStr || new Date().toISOString().substring(0, 10),
        deliveryAddress: clientAddress || clientObj.address,
        driverName: driverName || undefined,
        vehicleNo: vehicleNo || undefined,
        trackingRef: trackingRef || undefined,
        items: doItems,
        status: doStatus,
        deliveredAt: doStatus === 'Delivered' ? nowIso : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      onAddDeliveryOrder(newDO);
    } else if (docType === 'invoice') {
      const formattedItems: LineItem[] = items.map((it, i) => {
        const lineSub = (it.quantity || 0) * (it.unitPrice || 0);
        const discAmt = (lineSub * (it.discount || 0)) / 100;
        const afterDisc = lineSub - discAmt;
        const taxAmt = (afterDisc * (it.taxRate || 0)) / 100;
        return {
          id: `item-inv-manual-${Date.now()}-${i}`,
          description: it.description || 'Item Description',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          unitCost: Number(it.unitCost) || 0,
          taxRate: Number(it.taxRate) || 0,
          discount: Number(it.discount) || 0,
          remark: it.remark,
          total: Math.round((afterDisc + taxAmt) * 100) / 100,
        };
      });

      const subtotal = calculateSubtotal();
      const grandTotal = calculateGrandTotal();

      const newInv: Invoice = {
        id: crypto.randomUUID(),
        invoiceNumber: docNumber || `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        quotationId: selectedQuotationId || `q-manual-ref-${Date.now()}`,
        quoteNumber: refQuoteNumber || 'MANUAL-REF',
        poNumber: poNumber || undefined,
        client: clientObj,
        date: dateStr || new Date().toISOString().substring(0, 10),
        dueDate: dueDateStr || new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
        items: formattedItems,
        subtotal,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal,
        currency,
        paymentTerms: 'NET 30 Days',
        bankDetails: `${companyProfile.bankName} | Acc: ${companyProfile.bankAccountNo}`,
        status: invoiceStatus,
        paidAt: invoiceStatus === 'Paid' ? nowIso : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      onAddInvoice(newInv);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">Manual Document Record Entry</h2>
              <p className="text-xs text-slate-400">
                Directly register historical or external Quotations, Delivery Orders, or Invoices.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Switcher */}
        <div className="flex bg-slate-100 p-2 border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => {
              setDocType('quotation');
              if (!docNumber) setDocNumber(`QT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              docType === 'quotation'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>1. Quotation Record</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDocType('do');
              if (!docNumber) setDocNumber(`DO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              docType === 'do'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 text-blue-500" />
            <span>2. Delivery Order (DO)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDocType('invoice');
              if (!docNumber) setDocNumber(`INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              docType === 'invoice'
                ? 'bg-white text-emerald-600 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-500" />
            <span>3. Invoice Record</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Document Header Fields */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
            {docType !== 'quotation' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Link to Existing Quotation:</label>
                <select
                  value={selectedQuotationId}
                  onChange={(e) => selectLinkedQuotation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No link — enter a quotation reference manually</option>
                  {quotations.map((quote) => (
                    <option key={quote.id} value={quote.id}>
                      {quote.quoteNumber} — {quote.client.companyName || quote.client.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Selecting a quotation copies its customer, PO and line items into this record.</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Document Number:
                </label>
                <input
                  type="text"
                  required
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder={
                    docType === 'quotation' ? 'QT-2026-001' : docType === 'do' ? 'DO-2026-001' : 'INV-2026-001'
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Date:</label>
                <input
                  type="date"
                  required
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {docType === 'quotation' ? 'Valid Until:' : docType === 'invoice' ? 'Due Date:' : 'DO Reference Quote:'}
                </label>
                {docType === 'do' ? (
                  <input
                    type="text"
                    value={refQuoteNumber}
                    onChange={(e) => setRefQuoteNumber(e.target.value)}
                    placeholder="e.g. QT-2026-001"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <input
                    type="date"
                    value={dueDateStr}
                    onChange={(e) => setDueDateStr(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            </div>

            {/* Status & PO controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200/80 pt-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status:</label>
                {docType === 'quotation' && (
                  <select
                    value={quoteStatus}
                    onChange={(e) => setQuoteStatus(e.target.value as QuotationStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent (Pending PO)">Sent (Pending PO)</option>
                    <option value="PO Received">PO Received</option>
                    <option value="DO Issued">DO Issued</option>
                    <option value="Invoice Issued">Invoice Issued</option>
                    <option value="Paid">Paid</option>
                  </select>
                )}

                {docType === 'do' && (
                  <select
                    value={doStatus}
                    onChange={(e) => setDoStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Pending Delivery">Pending Delivery</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                )}

                {docType === 'invoice' && (
                  <select
                    value={invoiceStatus}
                    onChange={(e) => setInvoiceStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PO Ref / PO Number:</label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="e.g. PO-88192"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Currency:</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="MYR">MYR (Malaysian Ringgit)</option>
                  <option value="USD">USD ($)</option>
                  <option value="SGD">SGD (S$)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Client Details Section */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>Client / Organization Information</span>
            </h3>

            {savedClients.length > 0 && (
              <div>
                <label className="block font-bold text-indigo-700 mb-1">Existing Customer - Auto-fill All Details:</label>
                <select
                  defaultValue=""
                  onChange={(e) => selectExistingCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select an existing customer...</option>
                  {savedClients.map((customer, index) => (
                    <option key={`${customer.email}-${customer.companyName}-${index}`} value={index}>
                      {customer.companyName || customer.name}{customer.email ? ` - ${customer.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Contact Person Name:</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Soo Chee Siong"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Company Name:</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Huat Construction Metal Works"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Client Email:</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="e.g. huatconstructionmetal@gmail.com"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Client Phone:</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="e.g. +60 12-789 9012"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 mb-1">Address / Delivery Address:</label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="No 5 Jalan Pulai 25, Taman Pulai Utama, 81300 Skudai, Johor"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* DO Specific Fields */}
          {docType === 'do' && (
            <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl space-y-3">
              <h3 className="font-extrabold text-blue-950 text-xs uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Logistics & Dispatch Information</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Driver / Carrier Name:</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Marcus Lee"
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Vehicle Plate Number:</label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="e.g. WX-8921-Z"
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Tracking Reference:</label>
                  <input
                    type="text"
                    value={trackingRef}
                    onChange={(e) => setTrackingRef(e.target.value)}
                    placeholder="e.g. TRK-881920"
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Line Items ({items.length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl flex items-center gap-1.5 border border-indigo-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 w-16 text-center">Qty</th>
                    <th className="py-2.5 px-3 w-24 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 w-24 text-right text-amber-700">Unit Cost</th>
                    <th className="py-2.5 px-3 w-24 text-right">Subtotal</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Line item description"
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-center font-bold"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-right font-mono"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) => handleItemChange(idx, 'unitCost', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-amber-200 bg-amber-50/50 rounded-lg text-right font-mono text-amber-900"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {currency} {((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total summary */}
            <div className="flex justify-end pt-2">
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-900 flex items-center gap-4">
                <span>Grand Total ({currency}):</span>
                <span className="text-base text-indigo-600 font-mono">
                  {currency} {calculateGrandTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md shadow-indigo-200 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Record to Database</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

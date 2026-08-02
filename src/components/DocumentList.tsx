import React, { useState } from 'react';
import { Quotation, DeliveryOrder, Invoice } from '../types';
import {
  FileText,
  Truck,
  Receipt,
  Mail,
  Plus,
  Search,
  CheckCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Eye,
  AlertCircle,
  DollarSign,
  TrendingUp,
  ChevronRight
} from 'lucide-react';

interface DocumentListProps {
  quotations: Quotation[];
  deliveryOrders: DeliveryOrder[];
  invoices: Invoice[];
  onSelectQuotation: (q: Quotation) => void;
  onNewQuotation: () => void;
  onOpenManualRecord: () => void;
  onGenerateDO: (q: Quotation) => void;
  onGenerateInvoice: (q: Quotation) => void;
  onCheckPOInEmail: (q?: Quotation) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  quotations,
  deliveryOrders,
  invoices,
  onSelectQuotation,
  onNewQuotation,
  onOpenManualRecord,
  onGenerateDO,
  onGenerateInvoice,
  onCheckPOInEmail,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'quotes' | 'dos' | 'invoices'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dashboard Stats
  const pendingQuotes = quotations.filter((q) => q.status === 'Sent (Pending PO)');
  const pendingPOValue = pendingQuotes.reduce((sum, q) => sum + q.grandTotal, 0);
  const poReceivedCount = quotations.filter((q) => q.status === 'PO Received').length;
  const invoicesCount = invoices.length;
  const totalQuoteValue = quotations.reduce((sum, q) => sum + q.grandTotal, 0);

  // Filtered Quotations
  const filteredQuotes = quotations.filter((q) => {
    const matchesSearch =
      q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.client.companyName && q.client.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.poNumber && q.poNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quotations */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Quotations</span>
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{quotations.length}</span>
            <span className="text-xs font-mono font-bold text-slate-600">
              ${totalQuoteValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Pending POs */}
        <div
          onClick={() => onCheckPOInEmail()}
          className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 shadow-xs hover:shadow-sm transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-600">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              Pending PO Inbox
            </span>
            <Mail className="w-5 h-5 text-amber-600 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-950">{pendingQuotes.length}</span>
            <span className="text-xs font-mono font-bold text-amber-900">
              ${pendingPOValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1 font-bold">
            <span>Check Gmail for PO matches</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition" />
          </p>
        </div>

        {/* Delivery Orders Issued */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DOs Issued</span>
            <Truck className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{deliveryOrders.length}</span>
            <span className="text-xs text-indigo-600 font-bold">Ready for Shipping</span>
          </div>
        </div>

        {/* Commercial Invoices */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invoices Created</span>
            <Receipt className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{invoicesCount}</span>
            <span className="text-xs text-emerald-600 font-bold">Billed Clients</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tab Filters */}
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg border border-slate-200/80">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                activeTab === 'all' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quotations ({quotations.length})
            </button>
            <button
              onClick={() => setActiveTab('dos')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                activeTab === 'dos' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Delivery Orders ({deliveryOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                activeTab === 'invoices' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Invoices ({invoices.length})
            </button>
          </div>

          {/* Search & Status Filters & Manual Add */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search quote #, client, PO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="Sent (Pending PO)">Sent (Pending PO)</option>
              <option value="PO Received">PO Received</option>
              <option value="DO Issued">DO Issued</option>
              <option value="Invoice Issued">Invoice Issued</option>
              <option value="Paid">Paid</option>
            </select>

            <button
              onClick={onOpenManualRecord}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs"
              title="Manually add historical or existing Quotation, DO, or Invoice"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Manual Add Record</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        {activeTab === 'all' || activeTab === 'quotes' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Quote Ref</th>
                  <th className="py-3 px-4">Client / Company</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status & PO Ref</th>
                  <th className="py-3 px-4 text-center">Quick Conversions</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No quotations match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                        {q.quoteNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{q.client.name}</div>
                        <div className="text-[11px] text-slate-400">{q.client.companyName || q.client.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{q.date}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {q.currency} {q.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                              q.status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : q.status === 'PO Received'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : q.status === 'Sent (Pending PO)'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {q.status}
                          </span>
                          {q.poNumber ? (
                            <span className="text-[10px] text-indigo-800 font-mono font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-indigo-600" />
                              PO: {q.poNumber}
                            </span>
                          ) : q.status === 'Sent (Pending PO)' ? (
                            <button
                              onClick={() => onCheckPOInEmail(q)}
                              className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-0.5 underline"
                            >
                              <Mail className="w-3 h-3 text-amber-600" />
                              Check PO Email
                            </button>
                          ) : null}
                        </div>
                      </td>
                      {/* Quick Convert Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onGenerateDO(q)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition shadow-2xs"
                            title="Generate Delivery Order (DO)"
                          >
                            <Truck className="w-3 h-3" />
                            <span>⚡ DO</span>
                          </button>
                          <button
                            onClick={() => onGenerateInvoice(q)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition shadow-2xs"
                            title="Generate Commercial Invoice"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>⚡ Invoice</span>
                          </button>
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onSelectQuotation(q)}
                          className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-bold text-xs transition inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View / Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'dos' ? (
          /* Delivery Orders list */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">DO Number</th>
                  <th className="py-3 px-4">Quote Ref</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Delivery Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveryOrders.map((doDoc) => (
                  <tr key={doDoc.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{doDoc.doNumber}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{doDoc.quoteNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{doDoc.client.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{doDoc.deliveryDate}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {doDoc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {quotations.find((q) => q.id === doDoc.quotationId) && (
                        <button
                          onClick={() => onSelectQuotation(quotations.find((q) => q.id === doDoc.quotationId)!)}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition"
                        >
                          View DO
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Invoices list */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4">Quote Ref</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">{inv.invoiceNumber}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{inv.quoteNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{inv.client.name}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {inv.currency} {inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {quotations.find((q) => q.id === inv.quotationId) && (
                        <button
                          onClick={() => onSelectQuotation(quotations.find((q) => q.id === inv.quotationId)!)}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition"
                        >
                          View Invoice
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

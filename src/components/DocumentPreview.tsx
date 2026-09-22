import React, { useState, useMemo } from 'react';
import { Quotation, DeliveryOrder, Invoice, CompanyProfile, QuotationStatus } from '../types';
import { documentQuotation } from '../lib/documentData';
import { numberToWords } from '../lib/numberToWords';
import { SendEmailModal } from './SendEmailModal';
import { createDocumentPdf } from '../lib/quotationPdf';
import {
  Download,
  Mail,
  Truck,
  Receipt,
  FileCheck,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Edit,
  Sparkles,
  ShieldCheck,
  Building,
  DollarSign,
  AlertCircle,
  Clock,
  Layers,
  XCircle,
  Check,
  Send
} from 'lucide-react';

interface DocumentPreviewProps {
  quotation: Quotation;
  deliveryOrder?: DeliveryOrder | null;
  invoice?: Invoice | null;
  companyProfile: CompanyProfile;
  accessToken?: string | null;
  onLoginRequest?: () => void;
  initialTab?: 'quotation' | 'do' | 'invoice';
  versions: Quotation[];
  isLatestVersion: boolean;
  onSelectVersion: (quotation: Quotation) => void;
  onGenerateDOAndInvoice: (quotation: Quotation) => void;
  onMarkAsPaid: (invoiceId: string) => void;
  onUpdateStatus: (quotation: Quotation, status: QuotationStatus, poNumber?: string) => void;
  onEditQuotation: (quotation: Quotation) => void;
  onBack: () => void;
  onCheckPOInEmail: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  quotation,
  deliveryOrder,
  invoice,
  companyProfile,
  accessToken,
  onLoginRequest,
  initialTab = 'quotation',
  versions,
  isLatestVersion,
  onSelectVersion,
  onGenerateDOAndInvoice,
  onMarkAsPaid,
  onUpdateStatus,
  onEditQuotation,
  onBack,
  onCheckPOInEmail,
}) => {
  const [activeTab, setActiveTab] = useState<'quotation' | 'do' | 'invoice'>(initialTab);
  const [poInput, setPoInput] = useState('');
  const [showPoModal, setShowPoModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const displayQuotation = documentQuotation(activeTab, quotation, deliveryOrder, invoice);

  // Payment Overdue Calculation
  const isInvoiceOverdue = useMemo(() => {
    if (!invoice || invoice.status === 'Paid') return false;
    const dueDateStr = invoice?.dueDate;
    if (!dueDateStr) return false;
    const dueDate = new Date(dueDateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today > dueDate;
  }, [invoice, quotation]);

  const daysOverdue = useMemo(() => {
    const dueDateStr = invoice?.dueDate;
    if (!dueDateStr) return 0;
    const dueDate = new Date(dueDateStr + 'T00:00:00');
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [invoice, quotation]);

  const handleManualPORecieved = () => {
    if (!poInput.trim()) return;
    onUpdateStatus(quotation, 'PO Received', poInput.trim());
    setShowPoModal(false);
    setPoInput('');
  };

  const handleDownloadPdf = () => {
    try {
      const attachment = createDocumentPdf(activeTab, quotation, companyProfile, deliveryOrder, invoice);
      const blob = new Blob([attachment.data], { type: attachment.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to generate this PDF.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="mb-4 p-4 bg-white border rounded-xl flex flex-wrap gap-3 items-center">
        <span className="text-sm font-bold">Quotation versions</span>
        {versions.map(version => <button key={version.id} onClick={() => onSelectVersion(version)}
          className={`text-xs px-3 py-2 rounded-lg border ${version.id === quotation.id ? 'bg-indigo-600 text-white' : 'text-indigo-700'}`}>
          {version.quoteNumber}{version.id === versions[0]?.id ? ' (latest)' : ''}
        </button>)}
        {!isLatestVersion && <p className="w-full text-xs text-amber-800">Earlier version preserved for reference. Open the latest version to send a quotation.</p>}
        {quotation.status === 'Expired' && <p className="w-full text-xs text-rose-700">This quotation expired after {quotation.validUntil}. Revise it to make a new offer.</p>}
      </div>
      {/* Top Controls Bar (Hidden during Print) */}
      <div className="print:hidden mb-6 bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            title="Back to List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-slate-900 tracking-tight">
                {activeTab === 'quotation' && `Quotation ${quotation.quoteNumber}`}
                {activeTab === 'do' && `Delivery Order ${deliveryOrder?.doNumber || 'Draft'}`}
                {activeTab === 'invoice' && `Invoice ${invoice?.invoiceNumber || 'Draft'}`}
              </h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-md font-bold border ${
                  quotation.status === 'Paid'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : quotation.status === 'Cancelled'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : isInvoiceOverdue
                    ? 'bg-red-100 text-red-700 border-red-300 animate-pulse'
                    : quotation.status === 'PO Received'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : quotation.status === 'Invoice Issued' || quotation.status === 'DO Issued'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {activeTab === 'invoice' && invoice ? (isInvoiceOverdue ? `OVERDUE (${daysOverdue}d)` : invoice.status) : quotation.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Client: <span className="text-slate-800 font-semibold">{quotation.client.name}</span> ({quotation.client.companyName || 'Individual'})
            </p>
          </div>
        </div>

        {/* Tab View Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('quotation')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'quotation' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quotation
          </button>
          <button
            disabled={!deliveryOrder}
            onClick={() => setActiveTab('do')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'do' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            DO
          </button>
          <button
            disabled={!invoice}
            onClick={() => setActiveTab('invoice')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'invoice' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Invoice
          </button>
        </div>

        {/* Quick Convert & Output Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isLatestVersion && !['Expired', 'Cancelled'].includes(quotation.status) && (
            <button onClick={() => onGenerateDOAndInvoice(quotation)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg">
              <Layers className="w-4 h-4" />
              {deliveryOrder && invoice ? 'Email DO + Invoice' : 'Issue & email DO + Invoice'}
            </button>
          )}

          {/* Mark Paid Button */}
          {invoice && invoice.status !== 'Paid' && (
            <button
              onClick={() => invoice && onMarkAsPaid(invoice.id)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-xs"
              title="Mark Invoice as Paid"
            >
              <CheckCircle className="w-4 h-4" />
              <span>✓ Mark as Paid</span>
            </button>
          )}

          {/* Status Quick Actions */}
          {isLatestVersion && quotation.status === 'Sent (Pending PO)' && (
            <button
              onClick={() => setShowPoModal(true)}
              className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-2.5 py-2 rounded-lg transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>PO Received</span>
            </button>
          )}

          {isLatestVersion && quotation.status !== 'Cancelled' && quotation.status !== 'Paid' && (
            <button
              onClick={() => onUpdateStatus(quotation, 'Cancelled')}
              className="flex items-center gap-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold px-2.5 py-2 rounded-lg transition"
              title="Cancel Quotation"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}

          {/* Email PO Scanner */}
          <button
            onClick={onCheckPOInEmail}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-3 py-2 rounded-lg transition"
            title="Check Gmail for PO email"
          >
            <Mail className="w-4 h-4 text-amber-600" />
            <span>Check PO</span>
          </button>

          {/* Quick Button: Send Email to Client */}
          <button
            disabled={activeTab === 'quotation' && (!isLatestVersion || quotation.status === 'Expired')}
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition shadow-xs active:scale-95"
            title="Send formatted document email to client"
          >
            <Send className="w-4 h-4" />
            <span>Send Email to Client</span>
          </button>

          {/* Clean PDF download */}
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition active:scale-95"
            title={`Download clean ${activeTab === 'do' ? 'Delivery Order' : activeTab === 'invoice' ? 'Invoice' : 'Quotation'} PDF`}
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          {/* Edit Quote */}
          {activeTab === 'quotation' && (
            <button
              onClick={() => onEditQuotation(quotation)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition"
              title="Create a new quotation revision"
            >
              <Edit className="w-4 h-4" /> Revise quotation
            </button>
          )}
        </div>
      </div>

      {/* Manual PO Number Modal */}
      {showPoModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-slate-900 text-base mb-1">Enter Purchase Order (PO) Ref</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the client's PO Number to confirm PO received for {quotation.quoteNumber}.
            </p>
            <input
              type="text"
              placeholder="e.g. PO-987452"
              value={poInput}
              onChange={(e) => setPoInput(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPoModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleManualPORecieved}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
              >
                Confirm PO Received
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Alert Banner for Invoice / Quote */}
      {isInvoiceOverdue && invoice && (
        <div className="print:hidden mb-6 bg-rose-50 border-2 border-rose-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h4 className="font-extrabold text-rose-950 text-sm flex items-center gap-2">
                <span>⚠️ INVOICE PAYMENT OVERDUE</span>
                <span className="bg-rose-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                  {daysOverdue} Days Overdue
                </span>
              </h4>
              <p className="text-xs text-rose-800 mt-0.5">
                Payment was expected within 1 month (Due: {invoice?.dueDate}). Click to update status once payment is received.
              </p>
            </div>
          </div>
          <button
            onClick={() => invoice && onMarkAsPaid(invoice.id)}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg shadow-sm flex items-center justify-center gap-2 transition shrink-0 active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            Mark as Paid
          </button>
        </div>
      )}

      {/* PO Email Notice Banner if PO is linked */}
      {quotation.poNumber && (
        <div className="print:hidden mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900">
            <p className="font-bold text-sm text-blue-950">
              Purchase Order Verified ({quotation.poNumber})
            </p>
            {quotation.poEmailSnippet && (
              <p className="mt-1 italic text-slate-600 bg-white/60 p-2 rounded border border-blue-100">
                "{quotation.poEmailSnippet}"
              </p>
            )}
            <p className="mt-1 text-slate-500">
              Sender: <span className="font-semibold text-slate-700">{quotation.poEmailSender || quotation.client.email}</span>
            </p>
          </div>
        </div>
      )}

      {/* Printable Document Paper Card */}
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 md:p-12 text-slate-800 print:shadow-none print:border-none print:p-0">
        
        {/* ==================== QUOTATION VIEW ==================== */}
        {activeTab === 'quotation' && (
          <div>
            {/* Document Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
              <div>
                {companyProfile.logoUrl && (
                  <img
                    src={companyProfile.logoUrl}
                    alt={companyProfile.name}
                    className="h-10 object-contain mb-2"
                  />
                )}
                <h1 className="text-lg font-bold text-slate-900">{companyProfile.name}</h1>
                <p className="text-xs text-slate-600 max-w-sm mt-0.5 leading-relaxed whitespace-pre-line">
                  {companyProfile.address}
                </p>
                <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
                  <p>Email: {companyProfile.email}</p>
                  <p>Phone: {companyProfile.phone}</p>
                  {companyProfile.taxId && <p>Tax ID: {companyProfile.taxId}</p>}
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold tracking-widest uppercase rounded mb-2">
                  QUOTATION
                </span>
                <p className="font-mono text-xl font-bold text-slate-900">Quotation #{quotation.quoteNumber}</p>
                <div className="text-xs text-slate-600 mt-2 space-y-1 font-medium">
                  <p>Issue Date: <span className="text-slate-900 font-semibold">{quotation.date}</span></p>
                  <p>Currency: <span className="text-slate-900 font-semibold">{quotation.currency}</span></p>
                  <p>Valid Until: <span className="text-slate-900 font-semibold">{quotation.validUntil}</span></p>
                  {quotation.poNumber && (
                    <p className="text-indigo-600 font-bold">PO Ref: {quotation.poNumber}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="bg-slate-50 rounded-lg p-5 mb-6 text-xs border border-slate-200">
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">To / Prepared For:</p>
                {quotation.client.companyName && (
                  <p className="font-bold text-sm text-slate-900">{quotation.client.companyName}</p>
                )}
                <p className="font-semibold text-slate-800">{quotation.client.name}</p>
                <p className="text-slate-600 mt-1 whitespace-pre-line">{quotation.client.address}</p>
              </div>
              <div className="space-y-1 text-slate-600 md:text-right">
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Contact Details:</p>
                <p>Email: {quotation.client.email || '-'}</p>
                <p>Phone: {quotation.client.phone || '-'}</p>
              </div>
            </div>

            {/* Items Table matching Google Doc Template: DESCRIPTION | QTY | UNIT PRICE | SUBTOTAL | Remark */}
            <table className="w-full text-left text-xs mb-6 border-collapse border border-slate-200">
              <thead>
                <tr className="border-b border-slate-300 text-slate-900 font-bold bg-slate-100 uppercase tracking-wider">
                  <th className="py-2.5 px-3 border-r border-slate-200">DESCRIPTION</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 w-16">QTY</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200 w-32">UNIT PRICE</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200 w-32">SUBTOTAL</th>
                  <th className="py-2.5 px-3 border-slate-200 w-28">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quotation.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 border-r border-slate-200 font-medium text-slate-900">
                      {idx + 1}. {item.description}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-center font-semibold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono text-slate-800">
                      {quotation.currency} {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                      {quotation.currency} {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-slate-500 italic">
                      {item.remark || item.notes || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total in Words & Totals Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-6">
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                  Amount in Words:
                </p>
                <p className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                  {numberToWords(quotation.grandTotal, quotation.currency)}
                </p>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-200 pt-3 md:pt-0 md:border-t-0">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>SUBTOTAL:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {quotation.currency} {quotation.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {quotation.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span className="font-mono">-{quotation.currency} {quotation.discountTotal.toFixed(2)}</span>
                  </div>
                )}
                {quotation.taxTotal > 0 && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Tax Amount:</span>
                    <span className="font-mono">+{quotation.currency} {quotation.taxTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t-2 border-slate-900 pt-2">
                  <span>Total:</span>
                  <span className="font-mono text-indigo-700">
                    {quotation.currency} {quotation.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms & Conditions matching Google Doc Template */}
            <div className="border-t border-slate-200 pt-6 text-xs text-slate-700 space-y-4">
              <div>
                <p className="font-bold text-slate-900 mb-1.5 uppercase tracking-wider">Terms & Conditions:</p>
                <p className="whitespace-pre-line leading-relaxed text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {quotation.terms || '1. This quotation is valid for 60 days.\n2. Payment Terms: NET 30 days after item receival\n3. Leadtime: 1 week upon date of PO receival'}
                </p>
              </div>

              {quotation.notes && (
                <div>
                  <p className="font-bold text-slate-900 mb-1 uppercase tracking-wider">Remarks / Notes:</p>
                  <p className="whitespace-pre-line text-slate-600">{quotation.notes}</p>
                </div>
              )}
            </div>

            {/* Computer-generated document notice */}
            <div className="mt-8 pt-5 border-t border-slate-200 text-center text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Document remark: This is a computer-generated document and is valid without a signature.</p>
              <p className="mt-1 text-[11px] text-slate-500">Issued electronically by {companyProfile.name}.</p>
            </div>
          </div>
        )}

        {/* ==================== DELIVERY ORDER (DO) VIEW ==================== */}
        {activeTab === 'do' && (
          <div>
            <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
              <div>
                {companyProfile.logoUrl && (
                  <img
                    src={companyProfile.logoUrl}
                    alt={companyProfile.name}
                    className="h-10 object-contain mb-2"
                  />
                )}
                <h1 className="text-lg font-bold text-slate-900">{companyProfile.name}</h1>
                <p className="text-xs text-slate-600 max-w-sm mt-0.5 leading-relaxed whitespace-pre-line">
                  {companyProfile.address}
                </p>
                <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
                  <p>Email: {companyProfile.email}</p>
                  <p>Phone: {companyProfile.phone}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold tracking-widest uppercase rounded mb-2">
                  DELIVERY ORDER
                </span>
                <p className="font-mono text-xl font-bold text-slate-900">
                  {deliveryOrder?.doNumber || `DO-${displayQuotation.quoteNumber}`}
                </p>
                <div className="text-xs text-slate-600 mt-2 space-y-1 font-medium">
                  <p>Ref Quotation: <span className="font-mono font-bold text-slate-900">#{displayQuotation.quoteNumber}</span></p>
                  <p>Issue Date: <span className="text-slate-900 font-semibold">{deliveryOrder?.deliveryDate || displayQuotation.date}</span></p>
                  <p>Currency: <span className="text-slate-900 font-semibold">{displayQuotation.currency}</span></p>
                </div>
              </div>
            </div>

            {/* Deliver To */}
            <div className="bg-slate-50 rounded-lg p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border border-slate-200">
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Deliver To:</p>
                {displayQuotation.client.companyName && (
                  <p className="font-bold text-sm text-slate-900">{displayQuotation.client.companyName}</p>
                )}
                <p className="font-semibold text-slate-800">{displayQuotation.client.name}</p>
                <p className="text-slate-600 mt-1 whitespace-pre-line">{displayQuotation.client.address}</p>
              </div>
            </div>

            {/* DO Items Table (NO PRICING AMOUNTS) */}
            <table className="w-full text-left text-xs mb-6 border-collapse border border-slate-200">
              <thead>
                <tr className="border-b border-slate-300 text-slate-900 font-bold bg-slate-100 uppercase tracking-wider">
                  <th className="py-2.5 px-3 border-r border-slate-200 w-12 text-center">NO.</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">DESCRIPTION</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 w-28">QTY ORDERED</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 w-28">QTY SHIPPED</th>
                  <th className="py-2.5 px-3 border-slate-200">REMARK / NOTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayQuotation.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 border-r border-slate-200 text-center font-mono text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 font-medium text-slate-900">
                      {item.description}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-center font-bold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-center font-bold text-indigo-700">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 text-slate-600 italic">
                      {item.remark || item.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Delivery Order Summary Box (NO PRICES) */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Item Lines:</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{displayQuotation.items.length} Line Items</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Quantity Shipped:</p>
                <p className="font-bold text-indigo-700 text-sm mt-0.5">
                  {displayQuotation.items.reduce((sum, item) => sum + item.quantity, 0)} Units
                </p>
              </div>
            </div>

            {/* Terms & Delivery Remarks */}
            <div className="border-t border-slate-200 pt-6 text-xs text-slate-700 space-y-4">
              <div>
                <p className="font-bold text-slate-900 mb-1.5 uppercase tracking-wider">Terms & Conditions:</p>
                <p className="whitespace-pre-line leading-relaxed text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {displayQuotation.terms || '1. This quotation is valid for 60 days.\n2. Payment Terms: NET 30 days after item receival\n3. Leadtime: 1 week upon date of PO receival'}
                </p>
              </div>
            </div>

            {/* Computer-generated document notice */}
            <div className="mt-8 pt-5 border-t border-slate-200 text-center text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Document remark: This is a computer-generated document and is valid without a signature.</p>
              <p className="mt-1 text-[11px] text-slate-500">Issued electronically by {companyProfile.name}.</p>
            </div>
          </div>
        )}

        {/* ==================== COMMERCIAL INVOICE VIEW ==================== */}
        {activeTab === 'invoice' && (
          <div>
            <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
              <div>
                {companyProfile.logoUrl && (
                  <img
                    src={companyProfile.logoUrl}
                    alt={companyProfile.name}
                    className="h-10 object-contain mb-2"
                  />
                )}
                <h1 className="text-lg font-bold text-slate-900">{companyProfile.name}</h1>
                <p className="text-xs text-slate-600 max-w-sm mt-0.5 leading-relaxed whitespace-pre-line">
                  {companyProfile.address}
                </p>
                <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
                  <p>Email: {companyProfile.email}</p>
                  <p>Phone: {companyProfile.phone}</p>
                  {companyProfile.taxId && <p>Tax ID: {companyProfile.taxId}</p>}
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold tracking-widest uppercase rounded mb-2">
                  INVOICE
                </span>
                <p className="font-mono text-xl font-bold text-slate-900">
                  {invoice?.invoiceNumber || `INV-${displayQuotation.quoteNumber}`}
                </p>
                <div className="text-xs text-slate-600 mt-2 space-y-1 font-medium">
                  <p>Issue Date: <span className="text-slate-900 font-semibold">{invoice?.date || displayQuotation.date}</span></p>
                  <p>Currency: <span className="text-slate-900 font-semibold">{displayQuotation.currency}</span></p>
                  <p>Payment Due: <span className="text-red-600 font-bold">{invoice?.dueDate || displayQuotation.validUntil}</span></p>
                  {displayQuotation.poNumber && <p className="text-indigo-600 font-bold">PO Ref: {displayQuotation.poNumber}</p>}
                </div>
              </div>
            </div>

            {/* Bill To & Payment Info */}
            <div className="bg-slate-50 rounded-lg p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border border-slate-200">
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Invoice To:</p>
                {displayQuotation.client.companyName && (
                  <p className="font-bold text-sm text-slate-900">{displayQuotation.client.companyName}</p>
                )}
                <p className="font-semibold text-slate-800">{displayQuotation.client.name}</p>
                <p className="text-slate-600 mt-1 whitespace-pre-line">{displayQuotation.client.address}</p>
              </div>
              <div className="space-y-1 text-slate-600 md:text-right">
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Bank Payment Details:</p>
                <p className="font-semibold text-slate-800">Payment Term: {invoice?.paymentTerms}</p>
                <p className="font-mono font-bold text-slate-900">{invoice?.bankDetails}</p>
              </div>
            </div>

            {/* Invoice Items Table matching Google Doc Template */}
            <table className="w-full text-left text-xs mb-6 border-collapse border border-slate-200">
              <thead>
                <tr className="border-b border-slate-300 text-slate-900 font-bold bg-slate-100 uppercase tracking-wider">
                  <th className="py-2.5 px-3 border-r border-slate-200">DESCRIPTION</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 w-16">QTY</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200 w-32">UNIT PRICE</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-200 w-32">SUBTOTAL</th>
                  <th className="py-2.5 px-3 border-slate-200 w-28">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayQuotation.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 border-r border-slate-200 font-medium text-slate-900">
                      {idx + 1}. {item.description}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-center font-semibold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono text-slate-800">
                      {displayQuotation.currency} {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                      {displayQuotation.currency} {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-slate-500 italic">
                      {item.remark || item.notes || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total in Words & Totals Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-6">
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                  Amount in Words:
                </p>
                <p className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                  {numberToWords(displayQuotation.grandTotal, displayQuotation.currency)}
                </p>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-200 pt-3 md:pt-0 md:border-t-0">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>SUBTOTAL:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {displayQuotation.currency} {displayQuotation.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {displayQuotation.taxTotal > 0 && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Tax Amount:</span>
                    <span className="font-mono">+{displayQuotation.currency} {displayQuotation.taxTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t-2 border-slate-900 pt-2">
                  <span>Total Amount Due:</span>
                  <span className="font-mono text-emerald-700">
                    {displayQuotation.currency} {displayQuotation.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Computer-generated document notice */}
            <div className="mt-8 pt-5 border-t border-slate-200 text-center text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Document remark: This is a computer-generated document and is valid without a signature.</p>
              <p className="mt-1 text-[11px] text-slate-500">Issued electronically by {companyProfile.name}.</p>
            </div>
          </div>
        )}

      </div>

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        quotation={quotation}
        deliveryOrder={deliveryOrder}
        invoice={invoice}
        companyProfile={companyProfile}
        accessToken={accessToken}
        onLoginRequest={onLoginRequest}
        defaultDocType={activeTab !== 'quotation' && deliveryOrder && invoice ? 'both' : activeTab}
        allowQuotation={isLatestVersion && quotation.status !== 'Expired'}
        onMarkAsEmailed={(q) => {
          if (q.status === 'Draft' || q.status === 'Sent (Pending PO)') {
            onUpdateStatus(q, 'Sent (Pending PO)');
          }
        }}
      />
    </div>
  );
};

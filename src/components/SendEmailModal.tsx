import React, { useState, useEffect } from 'react';
import { Quotation, DeliveryOrder, Invoice, CompanyProfile } from '../types';
import { sendGmailDirectly } from '../lib/gmail';
import { createDocumentPdf } from '../lib/quotationPdf';
import {
  Mail,
  X,
  Copy,
  ExternalLink,
  CheckCircle,
  FileText,
  Truck,
  Receipt,
  Send,
  Sparkles,
  Building,
  Loader2,
  AlertCircle,
  LogIn
} from 'lucide-react';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  deliveryOrder?: DeliveryOrder | null;
  invoice?: Invoice | null;
  companyProfile: CompanyProfile;
  accessToken?: string | null;
  onLoginRequest?: () => void;
  onMarkAsEmailed?: (q: Quotation) => void;
  defaultDocType?: 'quotation' | 'do' | 'invoice';
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  quotation,
  deliveryOrder,
  invoice,
  companyProfile,
  accessToken,
  onLoginRequest,
  onMarkAsEmailed,
  defaultDocType = 'quotation',
}) => {
  const [docType, setDocType] = useState<'quotation' | 'do' | 'invoice'>(defaultDocType);
  const [recipient, setRecipient] = useState(quotation.client.email || '');
  const [ccEmail, setCcEmail] = useState(companyProfile.email || '');
  const [customNote, setCustomNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentNotice, setSentNotice] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    setDocType(defaultDocType);
    setRecipient(quotation.client.email || '');
    setCcEmail(companyProfile.email || '');
    setSentNotice(false);
    setCopied(false);
    setIsSending(false);
    setSendSuccess(false);
    setSendError(null);
  }, [quotation, defaultDocType, companyProfile]);

  if (!isOpen) return null;

  // Build Subject
  const getSubject = () => {
    if (docType === 'do' && deliveryOrder) {
      return `Delivery Order ${deliveryOrder.doNumber} from ${companyProfile.name} (Ref: ${quotation.quoteNumber})`;
    }
    if (docType === 'invoice' && invoice) {
      return `Commercial Invoice ${invoice.invoiceNumber} from ${companyProfile.name} (Ref: ${quotation.quoteNumber})`;
    }
    return `Quotation ${quotation.quoteNumber} from ${companyProfile.name}`;
  };

  // Build Item Summary Table in Plain Text
  const itemsText = quotation.items
    .map(
      (item, idx) =>
        ` ${idx + 1}. ${item.description}\n    Qty: ${item.quantity} | Unit: ${quotation.currency} ${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} | Total: ${quotation.currency} ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    )
    .join('\n\n');

  // Build Full Email Body
  const getEmailBody = () => {
    const clientName = quotation.client.name || 'Valued Customer';
    const compName = companyProfile.name || 'Our Company';

    if (docType === 'do' && deliveryOrder) {
      return `Dear ${clientName},

Thank you for your business. Please find details for Delivery Order ${deliveryOrder.doNumber} below.

DELIVERY ORDER SUMMARY
--------------------------------------------------
DO Ref: ${deliveryOrder.doNumber}
Quotation Ref: ${quotation.quoteNumber}
Delivery Date: ${deliveryOrder.deliveryDate}
Shipment Address: ${deliveryOrder.deliveryAddress}

ITEMS INCLUDED:
${quotation.items.map((it, i) => ` ${i + 1}. ${it.description} (Qty: ${it.quantity})`).join('\n')}

${customNote ? `SPECIAL NOTE:\n${customNote}\n\n` : ''}Please acknowledge receipt of goods upon delivery.

Best regards,

${compName}
${companyProfile.phone ? `Phone: ${companyProfile.phone}` : ''}
${companyProfile.email ? `Email: ${companyProfile.email}` : ''}
${companyProfile.website ? `Website: ${companyProfile.website}` : ''}`;
    }

    if (docType === 'invoice' && invoice) {
      return `Dear ${clientName},

Please find Commercial Invoice ${invoice.invoiceNumber} for your recent order (Ref: ${quotation.quoteNumber}).

INVOICE SUMMARY
--------------------------------------------------
Invoice Number: ${invoice.invoiceNumber}
Quotation Ref: ${quotation.quoteNumber}
PO Number: ${quotation.poNumber || 'N/A'}
Date Issued: ${invoice.date}
Payment Due Date: ${invoice.dueDate}
Grand Total: ${invoice.currency} ${invoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}

PAYMENT DETAILS:
Bank Name: ${companyProfile.bankName || 'N/A'}
Account Name: ${companyProfile.bankAccountName || compName}
Account No: ${companyProfile.bankAccountNo || 'N/A'}
Payment Terms: ${invoice.paymentTerms || 'NET 30 Days'}

${customNote ? `NOTE:\n${customNote}\n\n` : ''}Kindly arrange payment within 1 month. Reply to this email with payment proof once processed.

Best regards,

${compName}
${companyProfile.phone ? `Phone: ${companyProfile.phone}` : ''}
${companyProfile.email ? `Email: ${companyProfile.email}` : ''}`;
    }

    // Default: Quotation
    return `Dear ${clientName},

Thank you for contacting ${compName}. We are pleased to present our official quotation (${quotation.quoteNumber}) for your review.

QUOTATION DETAILS:
--------------------------------------------------
Quotation Ref: ${quotation.quoteNumber}
Date: ${quotation.date}
Valid Until: ${quotation.validUntil}

ITEMIZED BREAKDOWN:
${itemsText}

--------------------------------------------------
GRAND TOTAL: ${quotation.currency} ${quotation.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
--------------------------------------------------

${customNote ? `NOTES FROM SENDER:\n${customNote}\n\n` : ''}TERMS & CONDITIONS:
${quotation.terms || companyProfile.defaultTerms}

To accept this quotation and issue a Purchase Order (PO), please reply directly to this email or send your PO ref.

Warm regards,

${compName}
${companyProfile.phone ? `Phone: ${companyProfile.phone}` : ''}
${companyProfile.email ? `Email: ${companyProfile.email}` : ''}
${companyProfile.website ? `Website: ${companyProfile.website}` : ''}`;
  };

  const subject = getSubject();
  const body = getEmailBody();

  // Create Mailto URL
  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?${
    ccEmail ? `cc=${encodeURIComponent(ccEmail)}&` : ''
  }subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const handleCopyBody = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleMarkEmailed = () => {
    if (onMarkAsEmailed) {
      onMarkAsEmailed(quotation);
    }
    setSentNotice(true);
    setTimeout(() => {
      setSentNotice(false);
      onClose();
    }, 1500);
  };

  const handleSendDirectGmail = async () => {
    if (!recipient) {
      setSendError('Please enter a recipient email address.');
      return;
    }

    if (!accessToken) {
      if (onLoginRequest) {
        onLoginRequest();
      } else {
        setSendError('Please sign in with Google to enable direct Gmail sending.');
      }
      return;
    }

    try {
      setIsSending(true);
      setSendError(null);
      const attachment = createDocumentPdf(docType, quotation, companyProfile, deliveryOrder, invoice);
      await sendGmailDirectly(accessToken, recipient, subject, body, ccEmail || undefined, attachment);

      setSendSuccess(true);
      if (onMarkAsEmailed) {
        onMarkAsEmailed(quotation);
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('Direct Gmail error:', err);
      setSendError(err.message || 'Failed to send email via Gmail API.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <span>Send Document Email to Client</span>
              </h2>
              <p className="text-xs text-slate-400">
                Client: <span className="text-indigo-300 font-semibold">{quotation.client.name}</span> ({quotation.quoteNumber})
              </p>
              <p className="text-[11px] text-emerald-300 mt-0.5">
                {docType === 'quotation' ? 'Quotation' : docType === 'do' ? 'Delivery Order' : 'Invoice'} PDF will be attached automatically
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

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Banners */}
          {sendSuccess && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 flex items-center gap-3 text-emerald-900 text-xs font-bold animate-in fade-in">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-extrabold text-emerald-950">Email Sent Successfully via Gmail API! 🎉</p>
                <p className="font-normal text-emerald-800 mt-0.5">
                  The email was sent directly to <strong>{recipient}</strong> with the clean{' '}
                  {docType === 'quotation' ? 'quotation' : docType === 'do' ? 'delivery order' : 'invoice'} PDF attached.
                </p>
              </div>
            </div>
          )}

          {sendError && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 flex items-start justify-between gap-3 text-rose-900 text-xs font-medium">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-950">Failed to send email directly</p>
                  <p className="text-rose-800 text-[11px] mt-0.5">{sendError}</p>
                </div>
              </div>
              {!accessToken && onLoginRequest && (
                <button
                  type="button"
                  onClick={onLoginRequest}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shrink-0 flex items-center gap-1.5 transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login Google</span>
                </button>
              )}
            </div>
          )}

          {/* Document Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Document to Send:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDocType('quotation')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  docType === 'quotation'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Quotation</span>
              </button>

              <button
                type="button"
                onClick={() => setDocType('do')}
                disabled={!deliveryOrder}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  docType === 'do'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                    : deliveryOrder
                    ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                }`}
                title={!deliveryOrder ? 'Generate DO first to send DO email' : ''}
              >
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>DO {deliveryOrder ? '' : '(Not generated)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setDocType('invoice')}
                disabled={!invoice}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  docType === 'invoice'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                    : invoice
                    ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                }`}
                title={!invoice ? 'Generate Invoice first to send Invoice email' : ''}
              >
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Invoice {invoice ? '' : '(Not generated)'}</span>
              </button>
            </div>
          </div>

          {/* Email Recipients */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Client Email (To):
              </label>
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="client@example.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CC Email (Your Company):
              </label>
              <input
                type="email"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="sales@company.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Custom Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Add Personal Note / Message (Optional):
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. As discussed over the phone, please review the revised pricing..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Subject Preview */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Subject:
            </label>
            <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-800">
              {subject}
            </div>
          </div>

          {/* Email Body Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Email Text Preview:
              </label>
              <button
                type="button"
                onClick={handleCopyBody}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Body'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={body}
              rows={8}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 leading-relaxed focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleMarkEmailed}
            className="w-full sm:w-auto text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 bg-white hover:bg-slate-100 px-3.5 py-2 rounded-lg transition"
          >
            {sentNotice ? '✓ Marked as Emailed' : 'Mark Status as Sent'}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <a
              href={mailtoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleMarkEmailed}
              className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              title="Open desktop mail app (e.g. Outlook/Apple Mail)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Mailto Link</span>
            </a>

            {accessToken ? (
              <button
                type="button"
                disabled={isSending || sendSuccess}
                onClick={handleSendDirectGmail}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-extrabold shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending via Gmail...</span>
                  </>
                ) : sendSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Sent Direct!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>⚡ Direct Send via Gmail</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onLoginRequest}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign in with Google to Send</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

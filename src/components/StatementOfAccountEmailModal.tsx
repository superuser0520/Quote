import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Download, Loader2, Mail, Send, X } from 'lucide-react';
import { ClientDetails, CompanyProfile, Invoice } from '../types';
import { sendGmailDirectly } from '../lib/gmail';
import { createStatementOfAccountPdf, invoiceDueStatus } from '../lib/statementOfAccountPdf';

interface StatementOfAccountEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoice: Invoice;
  outstandingInvoices: Invoice[];
  companyProfile: CompanyProfile;
  picOptions: ClientDetails[];
  accessToken?: string | null;
  onLoginRequest: () => void;
}

export const StatementOfAccountEmailModal: React.FC<StatementOfAccountEmailModalProps> = ({
  isOpen,
  onClose,
  selectedInvoice,
  outstandingInvoices,
  companyProfile,
  picOptions,
  accessToken,
  onLoginRequest,
}) => {
  const [recipient, setRecipient] = useState(selectedInvoice.client.email || '');
  const [ccEmail, setCcEmail] = useState(companyProfile.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const totals = useMemo(() => outstandingInvoices.reduce((map, invoice) => {
    map.set(invoice.currency, (map.get(invoice.currency) || 0) + invoice.grandTotal);
    return map;
  }, new Map<string, number>()), [outstandingInvoices]);

  useEffect(() => {
    const customer = selectedInvoice.client.companyName || selectedInvoice.client.name;
    const totalText = Array.from(totals.entries())
      .map(([currency, total]) => `${currency} ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
      .join(' / ');
    const invoiceSummary = outstandingInvoices
      .map((invoice) => `- ${invoice.invoiceNumber}: ${invoiceDueStatus(invoice)} | PO: ${invoice.poNumber || '-'} | PIC: ${invoice.client.name || '-'} (${invoice.client.email || '-'}) | ${invoice.currency} ${invoice.grandTotal.toFixed(2)}`)
      .join('\n');
    setRecipient(selectedInvoice.client.email || '');
    setCcEmail(companyProfile.email || '');
    setSubject(`Statement of Account - ${customer} - Outstanding Payment`);
    setBody(`Dear ${selectedInvoice.client.name || 'Sir / Madam'},

Please find attached the latest Statement of Account for ${customer}.

Our records show ${outstandingInvoices.length} outstanding invoice${outstandingInvoices.length === 1 ? '' : 's'} with a total balance of ${totalText}.

OUTSTANDING INVOICES
${invoiceSummary}

Kindly arrange payment for the outstanding balance at your earliest convenience. Please quote the relevant invoice number in the payment reference and share the payment advice once completed.

If payment has already been made, please disregard this reminder and send us the payment details so that we can update our records.

Payment term: 30 days
Bank: ${companyProfile.bankName || '-'}
Account name: ${companyProfile.bankAccountName || '-'}
Account number: ${companyProfile.bankAccountNo || '-'}

Thank you.

Best regards,
${companyProfile.name}
${companyProfile.email || ''}
${companyProfile.phone || ''}`);
    setSendError(null);
    setSent(false);
    setIsSending(false);
  }, [selectedInvoice, outstandingInvoices, companyProfile, totals]);

  if (!isOpen) return null;

  const attachment = () => createStatementOfAccountPdf(selectedInvoice.client, outstandingInvoices, companyProfile);

  const handleDownload = () => {
    try {
      const file = attachment();
      const url = URL.createObjectURL(new Blob([file.data], { type: file.mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Unable to generate the Statement of Account.');
    }
  };

  const handleSend = async () => {
    if (!recipient.trim()) {
      setSendError('Please select a PIC or enter the recipient email address.');
      return;
    }
    if (!accessToken) {
      onLoginRequest();
      return;
    }
    try {
      setIsSending(true);
      setSendError(null);
      await sendGmailDirectly(accessToken, recipient.trim(), subject, body, ccEmail.trim() || undefined, attachment());
      setSent(true);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Failed to send the Statement of Account.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center"><Mail className="w-5 h-5" /></div>
            <div>
              <h2 className="font-bold">Send Statement of Account</h2>
              <p className="text-xs text-slate-300">{selectedInvoice.client.companyName || selectedInvoice.client.name} - PDF attached automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {sent && <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-3 font-bold flex gap-2"><CheckCircle className="w-5 h-5" />SOA sent successfully to {recipient}.</div>}
          {sendError && <div className="bg-red-50 border border-red-300 text-red-900 rounded-xl p-3 flex gap-2"><AlertCircle className="w-5 h-5 shrink-0" />{sendError}</div>}

          {picOptions.length > 0 && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Customer PIC</label>
              <select
                defaultValue=""
                onChange={(event) => {
                  const pic = picOptions[Number(event.target.value)];
                  if (pic) setRecipient(pic.email);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Select an existing PIC...</option>
                {picOptions.map((pic, index) => <option key={`${pic.email}-${index}`} value={index}>{pic.name} - {pic.email}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Recipient Email</label>
              <input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="pic@customer.com" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">CC Email</label>
              <input type="email" value={ccEmail} onChange={(e) => setCcEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Message</label>
            <textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono leading-relaxed" />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between gap-3">
          <button onClick={handleDownload} className="px-4 py-2 bg-white border border-slate-300 rounded-lg font-bold text-xs flex items-center gap-2"><Download className="w-4 h-4" />Download SOA</button>
          {accessToken ? (
            <button disabled={isSending || sent} onClick={handleSend} className="px-5 py-2 bg-indigo-600 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-2">
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{isSending ? 'Sending...' : 'Send SOA via Gmail'}
            </button>
          ) : (
            <button onClick={onLoginRequest} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs">Sign in with Google to Send</button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Quotation, GmailEmailMessage } from '../types';
import { checkPOEmailsInGmail } from '../lib/gmail';
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  X,
  FileText,
  ShieldCheck,
  AlertCircle,
  Search,
  ArrowRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface POEmailCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  pendingQuotes: Quotation[];
  onConfirmPO: (quote: Quotation, poNumber: string, emailDetails: GmailEmailMessage) => void;
  onLoginRequest: () => void;
}

export const POEmailCheckerModal: React.FC<POEmailCheckerModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  pendingQuotes,
  onConfirmPO,
  onLoginRequest,
}) => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<GmailEmailMessage[]>([]);
  const [selectedMsg, setSelectedMsg] = useState<GmailEmailMessage | null>(null);
  const [customPONumber, setCustomPONumber] = useState('');
  const [targetQuoteId, setTargetQuoteId] = useState<string>('');

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const emailList = await checkPOEmailsInGmail(accessToken, pendingQuotes);
      setMessages(emailList);
      if (emailList.length > 0) {
        setSelectedMsg(emailList[0]);
        // extract PO pattern if present
        const poMatch = emailList[0].snippet.match(/PO[-#\s]?([A-Z0-9-]+)/i) || emailList[0].subject.match(/PO[-#\s]?([A-Z0-9-]+)/i);
        setCustomPONumber(poMatch ? `PO-${poMatch[1]}` : `PO-${Math.floor(1000 + Math.random() * 9000)}`);
        
        // Match target quote
        if (emailList[0].matchingQuoteNumber) {
          const matched = pendingQuotes.find((q) => q.quoteNumber === emailList[0].matchingQuoteNumber);
          if (matched) setTargetQuoteId(matched.id);
        } else if (pendingQuotes.length > 0) {
          setTargetQuoteId(pendingQuotes[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch PO emails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEmails();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectMessage = (msg: GmailEmailMessage) => {
    setSelectedMsg(msg);
    const poMatch = msg.snippet.match(/PO[-#\s]?([A-Z0-9-]+)/i) || msg.subject.match(/PO[-#\s]?([A-Z0-9-]+)/i);
    setCustomPONumber(poMatch ? `PO-${poMatch[1]}` : `PO-${Math.floor(1000 + Math.random() * 9000)}`);

    if (msg.matchingQuoteNumber) {
      const matched = pendingQuotes.find((q) => q.quoteNumber === msg.matchingQuoteNumber);
      if (matched) setTargetQuoteId(matched.id);
    }
  };

  const handleApplyPO = () => {
    if (!targetQuoteId) {
      alert('Please select a Quotation to apply this Purchase Order to.');
      return;
    }
    const q = pendingQuotes.find((item) => item.id === targetQuoteId);
    if (!q || !selectedMsg) return;

    onConfirmPO(q, customPONumber || 'PO-CONFIRMED', selectedMsg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Gmail Purchase Order Scanner
              </h3>
              <p className="text-xs text-slate-400">
                Detect incoming PO emails for pending Quotations & update status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Auth Banner */}
          {!accessToken && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 text-xs text-blue-900">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-blue-950">Connect Gmail with Google Sign-In</p>
                  <p className="text-slate-600 mt-0.5">
                    Sign in with Google to perform live scanning of incoming emails for Purchase Orders (`https://www.googleapis.com/auth/gmail.readonly`).
                  </p>
                </div>
              </div>
              <button
                onClick={onLoginRequest}
                className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
              >
                Sign In with Google
              </button>
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">
              Scanning <span className="font-bold text-slate-900">{pendingQuotes.length}</span> pending quotations for PO emails.
            </div>
            <button
              onClick={fetchEmails}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Scanning Inbox...' : 'Refresh Scan'}</span>
            </button>
          </div>

          {/* Email Match Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[300px]">
            {/* Email List Column */}
            <div className="md:col-span-5 border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-slate-50">
              <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                Detected Emails ({messages.length})
              </div>
              <div className="divide-y divide-slate-200 flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                    <Mail className="w-8 h-8 text-slate-300 mx-auto" />
                    <p>No new PO emails detected in inbox.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => handleSelectMessage(msg)}
                      className={`p-3 text-xs cursor-pointer transition ${
                        selectedMsg?.id === msg.id
                          ? 'bg-white border-l-4 border-amber-500 shadow-sm'
                          : 'hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 truncate max-w-[140px]">
                          {msg.senderName || msg.senderEmail}
                        </span>
                        <span className="text-[10px] text-slate-400">{msg.date}</span>
                      </div>
                      <p className="font-semibold text-slate-800 line-clamp-1 mb-1">{msg.subject}</p>
                      <p className="text-slate-500 line-clamp-2 text-[11px]">{msg.snippet}</p>
                      
                      {msg.matchingQuoteNumber && (
                        <div className="mt-2 inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-amber-600" />
                          Matches Quote: {msg.matchingQuoteNumber}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Email Details & Action Column */}
            <div className="md:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              {selectedMsg ? (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      Email Preview
                    </span>
                    <h4 className="font-bold text-base text-slate-900 mt-2">{selectedMsg.subject}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      From: <span className="text-slate-800 font-medium">{selectedMsg.senderName}</span> &lt;{selectedMsg.senderEmail}&gt;
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedMsg.snippet}
                  </div>

                  {/* Matching Section */}
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
                    <h5 className="font-bold text-xs text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      Link PO to Pending Quotation
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Select Target Quotation
                        </label>
                        <select
                          value={targetQuoteId}
                          onChange={(e) => setTargetQuoteId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                        >
                          {pendingQuotes.map((q) => (
                            <option key={q.id} value={q.id}>
                              {q.quoteNumber} - {q.client.name} ({q.currency} {q.grandTotal})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          PO Ref Number
                        </label>
                        <input
                          type="text"
                          value={customPONumber}
                          onChange={(e) => setCustomPONumber(e.target.value)}
                          placeholder="e.g. PO-9821"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Select an email on the left to preview details and confirm PO.
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyPO}
                  disabled={!selectedMsg || !targetQuoteId}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm transition active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm PO Received & Update Status</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

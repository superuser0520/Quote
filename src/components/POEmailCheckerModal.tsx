import React, { useRef, useState } from 'react';
import { GmailEmailMessage, Quotation } from '../types';
import { checkPOEmailsInGmail } from '../lib/gmail';
import { Mail, RefreshCw, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  pendingQuotes: Quotation[];
  linkedMessageIds: string[];
  onImport: (emails: GmailEmailMessage[]) => Promise<{ linked: number; alreadyLinked: number; review: {email: GmailEmailMessage; reason: string}[] }>;
  onConfirmPO: (quote: Quotation, poNumber: string, email: GmailEmailMessage) => Promise<void>;
  onLoginRequest: () => void;
}

export function POEmailCheckerModal({ isOpen, onClose, accessToken, pendingQuotes, linkedMessageIds, onImport, onConfirmPO, onLoginRequest }: Props) {
  const [review, setReview] = useState<{email: GmailEmailMessage; reason: string}[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [poNumber, setPONumber] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const busy = useRef(false);
  const currentToken = useRef(accessToken);
  currentToken.current = accessToken;
  const [resultToken, setResultToken] = useState<string | null>(null);
  const visible = resultToken === accessToken && accessToken ? review.filter(r => !linkedMessageIds.includes(r.email.id)) : [];
  const selected = visible.find(r => r.email.id === selectedId);
  const quote = pendingQuotes.find(q => q.id === quoteId);

  const refresh = async () => {
    if (busy.current || !accessToken) return;
    busy.current = true; setLoading(true); setError(''); setSummary('');
    const token = accessToken;
    try {
      const emails = await checkPOEmailsInGmail(token, pendingQuotes);
      if (token !== currentToken.current) return;
      const result = await onImport(emails);
      setReview(result.review); setResultToken(token); setSelectedId(''); setQuoteId(''); setPONumber('');
      setSummary(`${result.linked} PO${result.linked === 1 ? '' : 's'} linked and saved, ${result.alreadyLinked} already linked, ${result.review.length} need review. Last refreshed: ${new Date().toLocaleTimeString()}.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not refresh Gmail.'); }
    finally { busy.current = false; setLoading(false); }
  };
  const confirm = async () => {
    if (!selected || !quote || !poNumber.trim() || busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try {
      await onConfirmPO(quote, poNumber.trim(), selected.email);
      setReview(rows => rows.filter(row => row.email.id !== selected.email.id));
      setSelectedId(''); setSummary('PO linked, PDF saved and quotation updated.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save PO.'); }
    finally { busy.current = false; setLoading(false); }
  };

  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="po-title" className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex gap-3 items-center"><Mail className="text-amber-400"/><div><h2 id="po-title" className="font-bold">Gmail Purchase Orders</h2><p className="text-xs text-slate-400">Refresh to link matching POs and save their PDFs</p></div></div>
        <button aria-label="Close PO inbox" onClick={onClose} disabled={loading}><X/></button>
      </header>
      <div className="p-6 overflow-y-auto space-y-4">
        {(!accessToken || error.includes('Sign in')) && <div className="p-4 bg-blue-50 rounded-xl flex items-center justify-between gap-4">
          <p className="text-sm">Connect Gmail to fetch purchase orders. Reconnect if access expires.</p>
          <button onClick={onLoginRequest} disabled={loading} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm whitespace-nowrap">Sign In with Google</button>
        </div>}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <p className="text-xs text-slate-500 max-w-lg">Matching POs will be linked to their quotations, marked PO Received, and saved with the original PDF. Existing issued and paid statuses are kept.</p>
          <button onClick={() => void refresh()} disabled={loading || !accessToken} className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>{loading ? 'Fetching and saving...' : 'Refresh POs'}</button>
        </div>
        {summary && resultToken === accessToken && <p role="status" className="p-3 bg-green-50 text-green-900 rounded-lg text-sm">{summary}</p>}
        {error && <p role="alert" className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">{error}</p>}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <h3 className="px-4 py-3 text-xs font-bold bg-slate-100">Needs review ({visible.length})</h3>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-200">
              {!visible.length && <p className="p-6 text-sm text-slate-500">{loading ? 'Checking emails and saving matching POs...' : summary && resultToken === accessToken ? 'No unmatched POs to review.' : 'Click Refresh POs to check Gmail.'}</p>}
              {visible.map(({email: m, reason}) => <button key={m.id} disabled={loading} onClick={() => { setSelectedId(m.id); setPONumber(m.poNumber || ''); setQuoteId(''); }} className={`block w-full text-left p-4 text-xs ${selectedId === m.id ? 'bg-amber-50 border-l-4 border-amber-500' : 'hover:bg-white'}`}>
                <div className="flex justify-between gap-2 mb-1"><strong>{m.senderName || m.senderEmail}</strong><span>{m.date}</span></div>
                <p className="font-semibold break-words">{m.subject}</p><p className="mt-2 text-amber-800">{reason}</p>
              </button>)}
            </div>
          </div>
          <div className="border border-slate-200 rounded-xl p-5 space-y-4 min-w-0">
            {selected ? <>
              <h3 className="font-bold break-words">{selected.email.subject}</h3><p className="text-xs text-slate-500 break-all">From: {selected.email.senderEmail}</p>
              <p className="text-xs bg-slate-50 p-3 rounded-lg">{selected.email.snippet}</p>
              <a className="text-xs text-blue-700 underline" href={`https://mail.google.com/mail/u/0/#all/${selected.email.id}`} target="_blank" rel="noreferrer">Open original email and attachments in Gmail</a>
              {!!selected.email.quotationReferences?.length && <p className="text-xs">Quotation references: {selected.email.quotationReferences.join(', ')}</p>}
              {selected.email.attachmentWarning && <p className="text-xs text-amber-800">{selected.email.attachmentWarning}</p>}
              <p className="text-xs break-all">PDFs to save: {selected.email.poPdfData?.map(f => f.filename).join(', ') || 'No readable PDF — retry refresh or check Gmail.'}</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-semibold">Select Target Quotation<select disabled={loading} value={quoteId} onChange={e => setQuoteId(e.target.value)} className="block w-full border rounded-lg p-2 mt-1 bg-white"><option value="">Select a quotation to confirm</option>{pendingQuotes.map(q => <option key={q.id} value={q.id}>{q.quoteNumber} — {q.client.name} ({q.currency} {q.grandTotal})</option>)}</select></label>
                <label className="block text-xs font-semibold">PO Ref Number<input disabled={loading} value={poNumber} onChange={e => setPONumber(e.target.value)} placeholder="Enter the PO number" className="block w-full border rounded-lg p-2 mt-1 font-mono"/></label>
              </div>
            </> : <p className="text-sm text-slate-500 py-12 text-center">Clear matches are saved automatically when you refresh. Select an unmatched email here to review it.</p>}
          </div>
        </div>
        <footer className="flex justify-end gap-3 border-t pt-4">
          <button onClick={onClose} disabled={loading} className="border rounded-lg px-4 py-2 text-sm">Close</button>
          <button disabled={loading || !accessToken || !selected || !quote || !poNumber.trim() || !selected.email.poPdfData?.length} onClick={() => void confirm()} className="bg-amber-500 disabled:opacity-40 rounded-lg px-4 py-2 text-sm font-bold">Link PO & Save PDF</button>
        </footer>
      </div>
    </section>
  </div>;
}

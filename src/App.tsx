import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Quotation,
  DeliveryOrder,
  Invoice,
  CompanyProfile,
  ClientDetails,
  GmailEmailMessage,
} from './types';
import {
  loadQuotations,
  loadDeliveryOrders,
  loadInvoices,
  loadCompanyProfile,
} from './lib/storage';
import { fetchServerDatabase, saveServerDatabase, cacheDatabase, pendingDatabase, DatabaseState } from './lib/dbClient';
import { effectiveQuotation, localDate, issueDocumentPair, markInvoicePaid, reviseQuotation, quotationVersions, isLatestQuotation } from './lib/workflows';
import { SendEmailModal } from './components/SendEmailModal';
import { outstandingInvoicesForCustomer } from './lib/statementOfAccountPdf';
import { initAuth, googleSignIn, logout } from './lib/firebase';

import { Header } from './components/Header';
import { DocumentList } from './components/DocumentList';
import { QuotationForm } from './components/QuotationForm';
import { DocumentPreview } from './components/DocumentPreview';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { POEmailCheckerModal } from './components/POEmailCheckerModal';
import { CompanyProfileModal } from './components/CompanyProfileModal';
import { RaspberryPiGuideModal } from './components/RaspberryPiGuideModal';
import { ManualRecordModal } from './components/ManualRecordModal';
import { StatementOfAccountEmailModal } from './components/StatementOfAccountEmailModal';

import { CheckCircle2, AlertCircle, Mail, FileText, TrendingUp, Server, Database } from 'lucide-react';

export default function App() {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  // App data state
  const [storedQuotations, setQuotations] = useState<Quotation[]>([]);
  const [today, setToday] = useState(localDate);
  const quotations = useMemo(() => storedQuotations.map(q => effectiveQuotation(q, today)), [storedQuotations, today]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(loadCompanyProfile());

  // Navigation & view state
  const [view, setView] = useState<'list' | 'analytics' | 'create' | 'edit' | 'preview'>('list');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const selectedQuote = quotations.find(q => q.id === selectedQuoteId) || null;
  const setSelectedQuote = (q: Quotation | null) => setSelectedQuoteId(q?.id || null);
  const [selectedDocument, setSelectedDocument] = useState<{type: 'quotation' | 'do' | 'invoice'; id?: string}>({type: 'quotation'});
  const [pairEmail, setPairEmail] = useState<{quoteId: string; doId: string; invoiceId: string} | null>(null);
  const [saveStatus, setSaveStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading');
  const currentDatabase = useRef<DatabaseState>({quotations: [], deliveryOrders: [], invoices: [], companyProfile});
  const mutationVersion = useRef(0);
  const issuing = useRef(false);

  // Modal open states
  const [isPOCheckerOpen, setIsPOCheckerOpen] = useState(false);
  const [isCompanyProfileOpen, setIsCompanyProfileOpen] = useState(false);
  const [isPiGuideOpen, setIsPiGuideOpen] = useState(false);
  const [isManualRecordOpen, setIsManualRecordOpen] = useState(false);
  const [soaInvoice, setSoaInvoice] = useState<Invoice | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const applyDatabase = (db: DatabaseState) => {
    currentDatabase.current = db;
    setQuotations(db.quotations);
    setDeliveryOrders(db.deliveryOrders);
    setInvoices(db.invoices);
    setCompanyProfile(db.companyProfile);
  };

  const syncAndSaveData = (
    quotes = currentDatabase.current.quotations,
    dos = currentDatabase.current.deliveryOrders,
    invs = currentDatabase.current.invoices,
    prof = currentDatabase.current.companyProfile
  ) => {
    const db = {quotations: quotes, deliveryOrders: dos, invoices: invs, companyProfile: prof};
    applyDatabase(db);
    const version = ++mutationVersion.current;
    setSaveStatus('saving');
    return saveServerDatabase(db).then(saved => {
      if (mutationVersion.current === version) setSaveStatus(saved ? 'saved' : 'error');
      return saved;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const initial = pendingDatabase() || {
      quotations: loadQuotations(), deliveryOrders: loadDeliveryOrders(),
      invoices: loadInvoices(), companyProfile: loadCompanyProfile(),
    };
    applyDatabase(initial);
    const version = mutationVersion.current;
    if (pendingDatabase()) {
      setSaveStatus('error');
    } else {
      fetchServerDatabase().then(db => {
        if (cancelled || mutationVersion.current !== version) return;
        if (db) {
          applyDatabase(db);
          try { cacheDatabase(db); } catch { /* Server state is already loaded. */ }
        }
        setSaveStatus(db ? 'saved' : 'error');
      });
    }
    const unsubscribe = initAuth(
      (currentUser, token) => {setUser(currentUser); setAccessToken(token); setNeedsAuth(false);},
      () => setNeedsAuth(true)
    );
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  useEffect(() => {
    const refreshDate = () => setToday(localDate());
    const timer = window.setInterval(refreshDate, 30000);
    window.addEventListener('focus', refreshDate);
    return () => {window.clearInterval(timer); window.removeEventListener('focus', refreshDate);};
  }, []);

  // Google Login Handler
  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setNeedsAuth(false);
        showToast(`Signed in as ${res.user.email}`);
      }
    } catch (err) {
      console.error('Login error:', err);
      const code = (err as { code?: string })?.code;
      const message = code === 'auth/unauthorized-domain'
        ? 'Google sign-in is blocked for this address. Add your HTTPS domain in Firebase Authorized domains.'
        : code === 'auth/popup-blocked'
        ? 'The sign-in popup was blocked by your browser. Allow popups and try again.'
        : code === 'auth/popup-closed-by-user'
        ? 'Google sign-in was cancelled.'
        : `Google sign-in failed${code ? ` (${code})` : ''}.`;
      showToast(message, 'info');
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    showToast('Signed out of Google Account', 'info');
  };

  // Save / Update Quotation
  const handleSaveQuotation = (quote: Quotation) => {
    let updatedQuotes: Quotation[];
    const exists = quotations.some((q) => q.id === quote.id);
    if (exists) {
      updatedQuotes = quotations.map((q) => (q.id === quote.id ? quote : q));
    } else {
      updatedQuotes = [quote, ...quotations];
    }

    setQuotations(updatedQuotes);

    syncAndSaveData(updatedQuotes);

    setSelectedQuote(quote);
    setView('preview');
    showToast(`Quotation ${quote.quoteNumber} saved.`);
  };

  // Manual Add Handlers
  const handleAddManualQuotation = (newQuote: Quotation) => {
    const updated = [newQuote, ...quotations];
    setQuotations(updated);

    syncAndSaveData(updated);
    setSelectedQuote(newQuote);
    setView('preview');
    showToast(`Manual Quotation ${newQuote.quoteNumber} saved!`);
  };

  const handleAddManualDO = (newDO: DeliveryOrder) => {
    const updated = [newDO, ...deliveryOrders];
    const updatedQuotes = quotations.map((quote) => quote.id === newDO.quotationId
      ? { ...quote, deliveryOrderId: newDO.id, deliveryOrderNumber: newDO.doNumber, status: quote.status === 'Paid' || quote.status === 'Invoice Issued' ? quote.status : 'DO Issued' as const, updatedAt: new Date().toISOString() }
      : quote);
    setDeliveryOrders(updated);
    setQuotations(updatedQuotes);


    syncAndSaveData(updatedQuotes, updated);
    setView('list');
    showToast(`Manual Delivery Order ${newDO.doNumber} registered!`);
  };

  const handleAddManualInvoice = (newInv: Invoice) => {
    const updated = [newInv, ...invoices];
    const updatedQuotes = quotations.map((quote) => quote.id === newInv.quotationId
      ? { ...quote, invoiceId: newInv.id, invoiceNumber: newInv.invoiceNumber, poNumber: newInv.poNumber || quote.poNumber, status: updated.filter(inv => inv.quotationId === quote.id).every(inv => inv.status === 'Paid') ? 'Paid' as const : 'Invoice Issued' as const, updatedAt: new Date().toISOString() }
      : quote);
    setInvoices(updated);
    setQuotations(updatedQuotes);


    syncAndSaveData(updatedQuotes, deliveryOrders, updated);
    setView('list');
    showToast(`Manual Invoice ${newInv.invoiceNumber} registered!`);
  };

  const handleGenerateStatementOfAccount = (selectedInvoice: Invoice) => {
    const outstanding = outstandingInvoicesForCustomer(selectedInvoice, invoices);
    if (outstanding.length === 0) {
      window.alert('This customer has no outstanding invoices.');
      return;
    }
    setSoaInvoice(selectedInvoice);
  };

  const handleDeleteQuotation = (quote: Quotation) => {
    const linkedDOs = deliveryOrders.filter((item) => item.quotationId === quote.id);
    const linkedInvoices = invoices.filter((item) => item.quotationId === quote.id);
    const linkedMessage = linkedDOs.length || linkedInvoices.length
      ? ` This also deletes ${linkedDOs.length} linked delivery order(s) and ${linkedInvoices.length} linked invoice(s).`
      : '';
    if (!window.confirm(`Delete quotation ${quote.quoteNumber}?${linkedMessage} This cannot be undone.`)) return;

    const updatedQuotes = quotations.filter((item) => item.id !== quote.id);
    const updatedDOs = deliveryOrders.filter((item) => item.quotationId !== quote.id);
    const updatedInvoices = invoices.filter((item) => item.quotationId !== quote.id);
    setQuotations(updatedQuotes);
    setDeliveryOrders(updatedDOs);
    setInvoices(updatedInvoices);



    syncAndSaveData(updatedQuotes, updatedDOs, updatedInvoices);
    showToast(`Quotation ${quote.quoteNumber} deleted.`, 'info');
  };

  const handleDeleteDeliveryOrder = (deliveryOrder: DeliveryOrder) => {
    if (!window.confirm(`Delete delivery order ${deliveryOrder.doNumber}? This cannot be undone.`)) return;
    const updatedDOs = deliveryOrders.filter((item) => item.id !== deliveryOrder.id);
    setDeliveryOrders(updatedDOs);

    syncAndSaveData(quotations, updatedDOs, invoices);
    showToast(`Delivery order ${deliveryOrder.doNumber} deleted.`, 'info');
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    const updatedInvoices = invoices.filter((item) => item.id !== invoice.id);
    setInvoices(updatedInvoices);

    syncAndSaveData(quotations, deliveryOrders, updatedInvoices);
    showToast(`Invoice ${invoice.invoiceNumber} deleted.`, 'info');
  };

  const handleMarkDeliveryOrderDelivered = (deliveryOrder: DeliveryOrder) => {
    const timestamp = new Date().toISOString();
    const updatedDOs: DeliveryOrder[] = deliveryOrders.map((item) =>
      item.id === deliveryOrder.id
        ? { ...item, status: 'Delivered', deliveredAt: timestamp, updatedAt: timestamp }
        : item
    );
    setDeliveryOrders(updatedDOs);

    syncAndSaveData(quotations, updatedDOs, invoices);
    showToast(`Delivery order ${deliveryOrder.doNumber} marked as delivered.`);
  };

  const handleGenerateDOAndInvoice = async (q: Quotation) => {
    if (issuing.current) return;
    issuing.current = true;
    try {
      const result = issueDocumentPair(currentDatabase.current, q.id);
      const saved = await syncAndSaveData(result.state.quotations, result.state.deliveryOrders, result.state.invoices);
      setSelectedQuote(result.quotation);
      setSelectedDocument({type: 'invoice', id: result.invoice.id});
      setView('preview');
      if (saved) {
        setPairEmail({quoteId: result.quotation.id, doId: result.deliveryOrder.id, invoiceId: result.invoice.id});
      } else {
        showToast('Documents are prepared, but the server save failed. Retry saving before sending.', 'info');
      }
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to issue documents.', 'info'); }
    finally { issuing.current = false; }
  };

  const handleMarkAsPaid = (invoiceId: string) => {
    try {
      const updated = markInvoicePaid(currentDatabase.current, invoiceId);
      syncAndSaveData(updated.quotations, updated.deliveryOrders, updated.invoices);
      const invoice = updated.invoices.find(item => item.id === invoiceId)!;
      showToast('Payment recorded for ' + invoice.invoiceNumber + '.');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to record payment.', 'info'); }
  };

  const handleReviseQuotation = (q: Quotation) => {
    try {
      const result = reviseQuotation(currentDatabase.current, q.id);
      syncAndSaveData(result.state.quotations);
      setSelectedQuote(result.quotation);
      setSelectedDocument({type: 'quotation'});
      setView('edit');
      showToast('Created draft revision ' + result.quotation.quoteNumber + '. Earlier versions are preserved.');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to revise quotation.', 'info'); }
  };

  // Direct Status Update (Pending PO / PO Received / Cancelled)
  const handleUpdateQuotationStatus = (q: Quotation, status: Quotation['status'], poNumber?: string) => {
    const updatedQ: Quotation = {
      ...q,
      status,
      ...(poNumber ? { poNumber, poReceivedDate: new Date().toISOString().split('T')[0] } : {}),
      updatedAt: new Date().toISOString(),
    };

    const updatedQuotes = quotations.map((item) => (item.id === q.id ? updatedQ : item));
    setQuotations(updatedQuotes);

    setSelectedQuote(updatedQ);

    syncAndSaveData(updatedQuotes);
    showToast(`Status updated to "${status}" for ${q.quoteNumber}`);
  };

  // Email PO Confirmation Handler
  const handleConfirmPOFromEmail = (
    quote: Quotation,
    poNumber: string,
    emailDetails: GmailEmailMessage
  ) => {
    const updatedQ: Quotation = {
      ...quote,
      poNumber,
      poReceivedDate: new Date().toISOString().split('T')[0],
      poEmailSnippet: emailDetails.snippet,
      poEmailSubject: emailDetails.subject,
      poEmailSender: emailDetails.senderEmail,
      poEmailId: emailDetails.id,
      status: 'PO Received',
      updatedAt: new Date().toISOString(),
    };

    const updatedQuotes = quotations.map((q) => (q.id === quote.id ? updatedQ : q));
    setQuotations(updatedQuotes);


    if (selectedQuote?.id === quote.id) {
      setSelectedQuote(updatedQ);
    }

    syncAndSaveData(updatedQuotes);
    showToast(`PO ${poNumber} linked to Quote ${quote.quoteNumber}! Status updated to PO Received.`);
  };

  // Company profile save
  const handleSaveCompanyProfile = (prof: CompanyProfile) => {
    setCompanyProfile(prof);

    syncAndSaveData(quotations, deliveryOrders, invoices, prof);
    showToast('Company profile updated.');
  };

  // Filter pending PO count
  const pendingPOCount = quotations.filter((q) => q.status === 'Sent (Pending PO)' && isLatestQuotation(quotations, q)).length;
  // Build a reusable customer database from every persisted document type.
  // Email is the strongest identity; company/contact names cover records without email.
  const savedClients: ClientDetails[] = Array.from<ClientDetails>(
    [...quotations, ...deliveryOrders, ...invoices].reduce((clients, document) => {
      const customer = document.client;
      const key = customer.email.trim().toLowerCase() ||
        `${customer.companyName.trim().toLowerCase()}|${customer.name.trim().toLowerCase()}`;
      const previous = clients.get(key);
      clients.set(key, previous
        ? {
            name: customer.name || previous.name,
            companyName: customer.companyName || previous.companyName,
            email: customer.email || previous.email,
            phone: customer.phone || previous.phone,
            address: customer.address || previous.address,
          }
        : customer);
      return clients;
    }, new Map<string, ClientDetails>()).values()
  ).sort((a, b) => (a.companyName || a.name).localeCompare(b.companyName || b.name));

  const linkedDOs = selectedQuote ? deliveryOrders.filter(d => d.quotationId === selectedQuote.id) : [];
  const linkedInvoices = selectedQuote ? invoices.filter(inv => inv.quotationId === selectedQuote.id) : [];
  const activeDO = linkedDOs.find(d => selectedDocument.type === 'do' && d.id === selectedDocument.id)
    || (linkedDOs.length === 1 ? linkedDOs[0] : null);
  const activeInvoice = linkedInvoices.find(inv => selectedDocument.type === 'invoice' && inv.id === selectedDocument.id)
    || (linkedInvoices.length === 1 ? linkedInvoices[0] : null);

  const handleImportDatabase = (imported: {
    quotations?: Quotation[];
    deliveryOrders?: DeliveryOrder[];
    invoices?: Invoice[];
    companyProfile?: CompanyProfile;
  }) => {
    if (imported.quotations) {
      setQuotations(imported.quotations);

    }
    if (imported.deliveryOrders) {
      setDeliveryOrders(imported.deliveryOrders);

    }
    if (imported.invoices) {
      setInvoices(imported.invoices);

    }
    if (imported.companyProfile) {
      setCompanyProfile(imported.companyProfile);

    }
    const merged = {...currentDatabase.current, ...Object.fromEntries(Object.entries(imported).filter(([, value]) => value !== undefined))};
    syncAndSaveData(merged.quotations, merged.deliveryOrders, merged.invoices, merged.companyProfile);
    showToast('Database imported.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-12 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <Header
        user={user}
        accessToken={accessToken}
        needsAuth={needsAuth}
        activeView={view}
        onSelectView={(v) => setView(v)}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenNewQuote={() => {
          setSelectedQuote(null);
          setView('create');
        }}
        onOpenCompanyProfile={() => setIsCompanyProfileOpen(true)}
        onOpenEmailChecker={() => setIsPOCheckerOpen(true)}
        onOpenPiGuide={() => setIsPiGuideOpen(true)}
        pendingPOCount={pendingPOCount}
      />

      <div role="status" className="px-6 py-2 text-xs bg-slate-100 text-slate-700">
        {saveStatus === 'loading' ? 'Loading saved records…' : saveStatus === 'saving' ? 'Saving changes…' : saveStatus === 'saved' ? 'All changes saved to server.' : 'Server save is unavailable. Keep this page open or retry saving; any browser backup is retained.'}
        {saveStatus === 'error' && <button className="ml-3 underline font-bold" onClick={() => syncAndSaveData()}>Retry save</button>}
      </div>

      {/* Main View Area */}
      <main className="flex-1 pb-12" inert={saveStatus === 'loading'}>
        {view === 'list' && (
          <DocumentList
            quotations={quotations}
            deliveryOrders={deliveryOrders}
            invoices={invoices}
            onSelectQuotation={(q) => {
              setSelectedQuote(q);
              setSelectedDocument({type: 'quotation'});
              setView('preview');
            }}
            onNewQuotation={() => {
              setSelectedQuote(null);
              setView('create');
            }}
            onOpenManualRecord={() => setIsManualRecordOpen(true)}
            onGenerateDOAndInvoice={handleGenerateDOAndInvoice}
            onMarkInvoicePaid={handleMarkAsPaid}
            onReviseQuotation={handleReviseQuotation}
            onSelectInvoice={(inv) => {
              setSelectedQuoteId(inv.quotationId);
              setSelectedDocument({type: 'invoice', id: inv.id});
              setView('preview');
            }}
            onSelectDeliveryOrder={(doc) => {
              setSelectedQuoteId(doc.quotationId);
              setSelectedDocument({type: 'do', id: doc.id});
              setView('preview');
            }}
            onCheckPOInEmail={(q) => {
              if (q) setSelectedQuote(q);
              setIsPOCheckerOpen(true);
            }}
            onDeleteQuotation={handleDeleteQuotation}
            onDeleteDeliveryOrder={handleDeleteDeliveryOrder}
            onDeleteInvoice={handleDeleteInvoice}
            onGenerateStatementOfAccount={handleGenerateStatementOfAccount}
            onMarkDeliveryOrderDelivered={handleMarkDeliveryOrderDelivered}
          />
        )}

        {view === 'analytics' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <AnalyticsDashboard
              quotations={quotations}
              invoices={invoices}
              currency="MYR"
              onOpenPiGuide={() => setIsPiGuideOpen(true)}
            />
          </div>
        )}

        {view === 'create' && (
          <QuotationForm
            companyProfile={companyProfile}
            savedClients={savedClients}
            onSave={handleSaveQuotation}
            onCancel={() => setView('list')}
          />
        )}

        {view === 'edit' && selectedQuote && (
          <QuotationForm
            initialQuotation={selectedQuote}
            companyProfile={companyProfile}
            savedClients={savedClients}
            onSave={handleSaveQuotation}
            onCancel={() => setView('preview')}
          />
        )}

        {view === 'preview' && selectedQuote && (
          <DocumentPreview
            quotation={selectedQuote}
            deliveryOrder={activeDO}
            invoice={activeInvoice}
            companyProfile={companyProfile}
            accessToken={accessToken}
            onLoginRequest={handleLogin}
            key={selectedQuote.id + selectedDocument.type + (selectedDocument.id || '')}
            initialTab={selectedDocument.type}
            versions={quotationVersions(quotations, selectedQuote)}
            isLatestVersion={isLatestQuotation(quotations, selectedQuote)}
            onSelectVersion={(q) => {setSelectedQuote(q); setSelectedDocument({type: 'quotation'});}}
            onGenerateDOAndInvoice={handleGenerateDOAndInvoice}
            onMarkAsPaid={handleMarkAsPaid}
            onUpdateStatus={handleUpdateQuotationStatus}
            onEditQuotation={handleReviseQuotation}
            onBack={() => setView('list')}
            onCheckPOInEmail={() => setIsPOCheckerOpen(true)}
          />
        )}
      </main>

      {/* Bottom Geometric Balance Status Footer (Hidden during Print) */}
      <footer className="h-8 bg-slate-900 text-[10px] text-slate-400 flex items-center justify-between px-6 shrink-0 print:hidden border-t border-slate-800">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            SYSTEM: ONLINE
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <button
            onClick={() => setIsPiGuideOpen(true)}
            className="flex items-center gap-1 font-mono text-emerald-400 hover:underline"
          >
            <Server className="w-3 h-3" />
            <span>PI SELF-HOST READY</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-slate-400 hidden md:inline">
            CLIENT MAIL DISPATCH: READY
          </span>
          <span className="text-slate-500 font-mono">
            SooQuoting v2.5
          </span>
        </div>
      </footer>

      {pairEmail && (() => {
        const quote = quotations.find(q => q.id === pairEmail.quoteId);
        const deliveryOrder = deliveryOrders.find(d => d.id === pairEmail.doId);
        const invoice = invoices.find(i => i.id === pairEmail.invoiceId);
        return quote && deliveryOrder && invoice ? <SendEmailModal
          isOpen onClose={() => setPairEmail(null)} quotation={quote}
          deliveryOrder={deliveryOrder} invoice={invoice} companyProfile={companyProfile}
          accessToken={accessToken} onLoginRequest={handleLogin} defaultDocType="both"
        /> : null;
      })()}

      {/* Modals */}
      <POEmailCheckerModal
        isOpen={isPOCheckerOpen}
        onClose={() => setIsPOCheckerOpen(false)}
        accessToken={accessToken}
        pendingQuotes={quotations.filter((q) => q.status === 'Sent (Pending PO)' && isLatestQuotation(quotations, q))}
        onConfirmPO={handleConfirmPOFromEmail}
        onLoginRequest={handleLogin}
      />

      <CompanyProfileModal
        isOpen={isCompanyProfileOpen}
        onClose={() => setIsCompanyProfileOpen(false)}
        companyProfile={companyProfile}
        onSave={handleSaveCompanyProfile}
      />

      <RaspberryPiGuideModal
        isOpen={isPiGuideOpen}
        onClose={() => setIsPiGuideOpen(false)}
        quotations={quotations}
        deliveryOrders={deliveryOrders}
        invoices={invoices}
        companyProfile={companyProfile}
        onImportData={handleImportDatabase}
      />

      <ManualRecordModal
        isOpen={isManualRecordOpen}
        onClose={() => setIsManualRecordOpen(false)}
        companyProfile={companyProfile}
        quotations={quotations}
        savedClients={savedClients}
        onAddQuotation={handleAddManualQuotation}
        onAddDeliveryOrder={handleAddManualDO}
        onAddInvoice={handleAddManualInvoice}
      />

      {soaInvoice && (
        <StatementOfAccountEmailModal
          isOpen={Boolean(soaInvoice)}
          onClose={() => setSoaInvoice(null)}
          selectedInvoice={soaInvoice}
          outstandingInvoices={outstandingInvoicesForCustomer(soaInvoice, invoices)}
          companyProfile={companyProfile}
          picOptions={savedClients.filter((client) =>
            (client.companyName || client.email || client.name).trim().toLowerCase() ===
            (soaInvoice.client.companyName || soaInvoice.client.email || soaInvoice.client.name).trim().toLowerCase()
          )}
          accessToken={accessToken}
          onLoginRequest={handleLogin}
        />
      )}
    </div>
  );
}

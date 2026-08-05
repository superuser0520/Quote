import React, { useState, useEffect } from 'react';
import {
  Quotation,
  DeliveryOrder,
  Invoice,
  CompanyProfile,
  GmailEmailMessage,
} from './types';
import {
  loadQuotations,
  saveQuotations,
  loadDeliveryOrders,
  saveDeliveryOrders,
  loadInvoices,
  saveInvoices,
  loadCompanyProfile,
  saveCompanyProfile,
} from './lib/storage';
import { fetchServerDatabase, saveServerDatabase } from './lib/dbClient';
import { initAuth, googleSignIn, logout, getAccessToken } from './lib/firebase';

import { Header } from './components/Header';
import { DocumentList } from './components/DocumentList';
import { QuotationForm } from './components/QuotationForm';
import { DocumentPreview } from './components/DocumentPreview';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { POEmailCheckerModal } from './components/POEmailCheckerModal';
import { CompanyProfileModal } from './components/CompanyProfileModal';
import { RaspberryPiGuideModal } from './components/RaspberryPiGuideModal';
import { ManualRecordModal } from './components/ManualRecordModal';

import { CheckCircle2, AlertCircle, Mail, FileText, TrendingUp, Server, Database } from 'lucide-react';

export default function App() {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  // App data state
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(loadCompanyProfile());

  // Navigation & view state
  const [view, setView] = useState<'list' | 'analytics' | 'create' | 'edit' | 'preview'>('list');
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);

  // Modal open states
  const [isPOCheckerOpen, setIsPOCheckerOpen] = useState(false);
  const [isCompanyProfileOpen, setIsCompanyProfileOpen] = useState(false);
  const [isPiGuideOpen, setIsPiGuideOpen] = useState(false);
  const [isManualRecordOpen, setIsManualRecordOpen] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync state to Raspberry Pi database & browser storage
  const syncAndSaveData = (
    quotes = quotations,
    dos = deliveryOrders,
    invs = invoices,
    prof = companyProfile
  ) => {
    saveServerDatabase({
      quotations: quotes,
      deliveryOrders: dos,
      invoices: invs,
      companyProfile: prof,
    });
  };

  // Initialize data on mount - load from Raspberry Pi Server DB or fallback to LocalStorage
  useEffect(() => {
    // 1. Initial fallback load from local storage
    const initialQuotes = loadQuotations();
    const initialDOs = loadDeliveryOrders();
    const initialInvoices = loadInvoices();
    const initialProf = loadCompanyProfile();

    setQuotations(initialQuotes);
    setDeliveryOrders(initialDOs);
    setInvoices(initialInvoices);
    setCompanyProfile(initialProf);

    // 2. Fetch latest data from Raspberry Pi server backend DB
    fetchServerDatabase().then((db) => {
      if (db) {
        setQuotations(db.quotations);
        setDeliveryOrders(db.deliveryOrders);
        setInvoices(db.invoices);
        setCompanyProfile(db.companyProfile);
        showToast('Connected & synced with Raspberry Pi Database!', 'info');
      }
    });

    // Firebase Auth listener
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );

    return () => unsubscribe();
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
    saveQuotations(updatedQuotes);
    syncAndSaveData(updatedQuotes);

    setSelectedQuote(quote);
    setView('preview');
    showToast(`Quotation ${quote.quoteNumber} saved & synced to Pi DB!`);
  };

  // Manual Add Handlers
  const handleAddManualQuotation = (newQuote: Quotation) => {
    const updated = [newQuote, ...quotations];
    setQuotations(updated);
    saveQuotations(updated);
    syncAndSaveData(updated);
    setSelectedQuote(newQuote);
    setView('preview');
    showToast(`Manual Quotation ${newQuote.quoteNumber} saved!`);
  };

  const handleAddManualDO = (newDO: DeliveryOrder) => {
    const updated = [newDO, ...deliveryOrders];
    setDeliveryOrders(updated);
    saveDeliveryOrders(updated);
    syncAndSaveData(quotations, updated);
    setView('list');
    showToast(`Manual Delivery Order ${newDO.doNumber} registered!`);
  };

  const handleAddManualInvoice = (newInv: Invoice) => {
    const updated = [newInv, ...invoices];
    setInvoices(updated);
    saveInvoices(updated);
    syncAndSaveData(quotations, deliveryOrders, updated);
    setView('list');
    showToast(`Manual Invoice ${newInv.invoiceNumber} registered!`);
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
    saveQuotations(updatedQuotes);
    saveDeliveryOrders(updatedDOs);
    saveInvoices(updatedInvoices);
    syncAndSaveData(updatedQuotes, updatedDOs, updatedInvoices);
    showToast(`Quotation ${quote.quoteNumber} deleted.`, 'info');
  };

  const handleDeleteDeliveryOrder = (deliveryOrder: DeliveryOrder) => {
    if (!window.confirm(`Delete delivery order ${deliveryOrder.doNumber}? This cannot be undone.`)) return;
    const updatedDOs = deliveryOrders.filter((item) => item.id !== deliveryOrder.id);
    setDeliveryOrders(updatedDOs);
    saveDeliveryOrders(updatedDOs);
    syncAndSaveData(quotations, updatedDOs, invoices);
    showToast(`Delivery order ${deliveryOrder.doNumber} deleted.`, 'info');
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    const updatedInvoices = invoices.filter((item) => item.id !== invoice.id);
    setInvoices(updatedInvoices);
    saveInvoices(updatedInvoices);
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
    saveDeliveryOrders(updatedDOs);
    syncAndSaveData(quotations, updatedDOs, invoices);
    showToast(`Delivery order ${deliveryOrder.doNumber} marked as delivered.`);
  };

  // Quick Convert: Generate Delivery Order (DO)
  const handleGenerateDO = (q: Quotation) => {
    const existingDO = deliveryOrders.find((d) => d.quotationId === q.id);
    let targetDO: DeliveryOrder;

    if (existingDO) {
      targetDO = existingDO;
    } else {
      const newDONumber = `DO-2026-${Math.floor(100 + Math.random() * 900)}`;
      targetDO = {
        id: `do-${Date.now()}`,
        doNumber: newDONumber,
        quotationId: q.id,
        quoteNumber: q.quoteNumber,
        client: q.client,
        deliveryDate: new Date().toISOString().split('T')[0],
        deliveryAddress: q.client.address,
        items: q.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          notes: 'Standard Delivery Item',
        })),
        status: 'Pending Delivery',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedDOs = [targetDO, ...deliveryOrders];
      setDeliveryOrders(updatedDOs);
      saveDeliveryOrders(updatedDOs);

      // Update Quotation Status if needed
      const updatedQ: Quotation = {
        ...q,
        deliveryOrderId: targetDO.id,
        deliveryOrderNumber: targetDO.doNumber,
        status: q.status === 'Sent (Pending PO)' ? 'DO Issued' : q.status,
        updatedAt: new Date().toISOString(),
      };

      const updatedQuotes = quotations.map((item) => (item.id === q.id ? updatedQ : item));
      setQuotations(updatedQuotes);
      saveQuotations(updatedQuotes);
      setSelectedQuote(updatedQ);

      syncAndSaveData(updatedQuotes, updatedDOs);
      showToast(`Generated Delivery Order ${newDONumber} for ${q.quoteNumber}!`);
    }

    setSelectedQuote(q);
    setView('preview');
  };

  // Quick Convert: Generate Invoice from Quotation
  const handleGenerateInvoice = (q: Quotation) => {
    const existingInv = invoices.find((inv) => inv.quotationId === q.id);
    let targetInv: Invoice;

    if (existingInv) {
      targetInv = existingInv;
    } else {
      const newInvNumber = `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
      targetInv = {
        id: `inv-${Date.now()}`,
        invoiceNumber: newInvNumber,
        quotationId: q.id,
        quoteNumber: q.quoteNumber,
        poNumber: q.poNumber,
        client: q.client,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: q.items,
        subtotal: q.subtotal,
        taxTotal: q.taxTotal,
        discountTotal: q.discountTotal,
        grandTotal: q.grandTotal,
        currency: q.currency,
        paymentTerms: q.terms || companyProfile.defaultTerms,
        bankDetails: `${companyProfile.bankName} | Acc: ${companyProfile.bankAccountNo}`,
        status: 'Unpaid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedInvoices = [targetInv, ...invoices];
      setInvoices(updatedInvoices);
      saveInvoices(updatedInvoices);

      const updatedQ: Quotation = {
        ...q,
        invoiceId: targetInv.id,
        invoiceNumber: targetInv.invoiceNumber,
        status: 'Invoice Issued',
        updatedAt: new Date().toISOString(),
      };

      const updatedQuotes = quotations.map((item) => (item.id === q.id ? updatedQ : item));
      setQuotations(updatedQuotes);
      saveQuotations(updatedQuotes);
      setSelectedQuote(updatedQ);

      syncAndSaveData(updatedQuotes, deliveryOrders, updatedInvoices);
      showToast(`Generated Invoice ${newInvNumber} for ${q.quoteNumber}!`);
    }

    setSelectedQuote(q);
    setView('preview');
  };

  // Quick Convert: Generate DO & Invoice Together
  const handleGenerateDOAndInvoice = (q: Quotation) => {
    let targetDO = deliveryOrders.find((d) => d.quotationId === q.id);
    let updatedDOs = [...deliveryOrders];
    if (!targetDO) {
      const newDONumber = `DO-2026-${Math.floor(100 + Math.random() * 900)}`;
      targetDO = {
        id: `do-${Date.now()}`,
        doNumber: newDONumber,
        quotationId: q.id,
        quoteNumber: q.quoteNumber,
        client: q.client,
        deliveryDate: new Date().toISOString().split('T')[0],
        deliveryAddress: q.client.address,
        items: q.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          notes: item.notes || item.remark || 'Standard Delivery Item',
        })),
        status: 'Pending Delivery',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedDOs = [targetDO, ...deliveryOrders];
      setDeliveryOrders(updatedDOs);
      saveDeliveryOrders(updatedDOs);
    }

    let targetInv = invoices.find((inv) => inv.quotationId === q.id);
    let updatedInvoices = [...invoices];
    if (!targetInv) {
      const newInvNumber = `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
      targetInv = {
        id: `inv-${Date.now()}`,
        invoiceNumber: newInvNumber,
        quotationId: q.id,
        quoteNumber: q.quoteNumber,
        poNumber: q.poNumber,
        client: q.client,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: q.items,
        subtotal: q.subtotal,
        taxTotal: q.taxTotal,
        discountTotal: q.discountTotal,
        grandTotal: q.grandTotal,
        currency: q.currency,
        paymentTerms: q.terms || companyProfile.defaultTerms,
        bankDetails: `${companyProfile.bankName} | Acc: ${companyProfile.bankAccountNo}`,
        status: 'Unpaid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedInvoices = [targetInv, ...invoices];
      setInvoices(updatedInvoices);
      saveInvoices(updatedInvoices);
    }

    const updatedQ: Quotation = {
      ...q,
      deliveryOrderId: targetDO.id,
      deliveryOrderNumber: targetDO.doNumber,
      invoiceId: targetInv.id,
      invoiceNumber: targetInv.invoiceNumber,
      status: 'Invoice Issued',
      updatedAt: new Date().toISOString(),
    };

    const updatedQuotes = quotations.map((item) => (item.id === q.id ? updatedQ : item));
    setQuotations(updatedQuotes);
    saveQuotations(updatedQuotes);
    setSelectedQuote(updatedQ);

    showToast(`Generated DO (${targetDO.doNumber}) & Invoice (${targetInv.invoiceNumber}) together!`);
    setView('preview');
  };

  // Mark Payment Received / Paid
  const handleMarkAsPaid = (q: Quotation) => {
    // Update linked invoice status
    let updatedInvoices = [...invoices];
    const linkedInv = invoices.find((inv) => inv.quotationId === q.id || inv.id === q.invoiceId);
    if (linkedInv) {
      updatedInvoices = invoices.map((inv) =>
        inv.id === linkedInv.id
          ? { ...inv, status: 'Paid', paidAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : inv
      );
      setInvoices(updatedInvoices);
      saveInvoices(updatedInvoices);
    }

    // Update quotation status
    const updatedQ: Quotation = {
      ...q,
      status: 'Paid',
      updatedAt: new Date().toISOString(),
    };

    const updatedQuotes = quotations.map((item) => (item.id === q.id ? updatedQ : item));
    setQuotations(updatedQuotes);
    saveQuotations(updatedQuotes);
    setSelectedQuote(updatedQ);

    showToast(`Payment received for ${q.quoteNumber}! Marked as PAID.`, 'success');
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
    saveQuotations(updatedQuotes);
    setSelectedQuote(updatedQ);

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
    saveQuotations(updatedQuotes);

    if (selectedQuote?.id === quote.id) {
      setSelectedQuote(updatedQ);
    }

    showToast(`PO ${poNumber} linked to Quote ${quote.quoteNumber}! Status updated to PO Received.`);
  };

  // Company profile save
  const handleSaveCompanyProfile = (prof: CompanyProfile) => {
    setCompanyProfile(prof);
    saveCompanyProfile(prof);
    syncAndSaveData(quotations, deliveryOrders, invoices, prof);
    showToast('Company profile saved to the Raspberry Pi database!');
  };

  // Filter pending PO count
  const pendingPOCount = quotations.filter((q) => q.status === 'Sent (Pending PO)').length;
  const savedClients = Array.from(
    new Map(
      quotations.map((quote) => [
        `${quote.client.email.toLowerCase()}|${quote.client.companyName.toLowerCase()}|${quote.client.name.toLowerCase()}`,
        quote.client,
      ])
    ).values()
  );

  // Active delivery order & invoice for preview
  const activeDO = selectedQuote
    ? deliveryOrders.find((d) => d.quotationId === selectedQuote.id)
    : null;
  const activeInvoice = selectedQuote
    ? invoices.find((inv) => inv.quotationId === selectedQuote.id)
    : null;

  const handleImportDatabase = (imported: {
    quotations?: Quotation[];
    deliveryOrders?: DeliveryOrder[];
    invoices?: Invoice[];
    companyProfile?: CompanyProfile;
  }) => {
    if (imported.quotations) {
      setQuotations(imported.quotations);
      saveQuotations(imported.quotations);
    }
    if (imported.deliveryOrders) {
      setDeliveryOrders(imported.deliveryOrders);
      saveDeliveryOrders(imported.deliveryOrders);
    }
    if (imported.invoices) {
      setInvoices(imported.invoices);
      saveInvoices(imported.invoices);
    }
    if (imported.companyProfile) {
      setCompanyProfile(imported.companyProfile);
      saveCompanyProfile(imported.companyProfile);
    }
    showToast('Database imported successfully!');
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

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {view === 'list' && (
          <DocumentList
            quotations={quotations}
            deliveryOrders={deliveryOrders}
            invoices={invoices}
            onSelectQuotation={(q) => {
              setSelectedQuote(q);
              setView('preview');
            }}
            onNewQuotation={() => {
              setSelectedQuote(null);
              setView('create');
            }}
            onOpenManualRecord={() => setIsManualRecordOpen(true)}
            onGenerateDO={handleGenerateDO}
            onGenerateInvoice={handleGenerateInvoice}
            onCheckPOInEmail={(q) => {
              if (q) setSelectedQuote(q);
              setIsPOCheckerOpen(true);
            }}
            onDeleteQuotation={handleDeleteQuotation}
            onDeleteDeliveryOrder={handleDeleteDeliveryOrder}
            onDeleteInvoice={handleDeleteInvoice}
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
            onGenerateDO={handleGenerateDO}
            onGenerateInvoice={handleGenerateInvoice}
            onGenerateDOAndInvoice={handleGenerateDOAndInvoice}
            onMarkAsPaid={handleMarkAsPaid}
            onUpdateStatus={handleUpdateQuotationStatus}
            onEditQuotation={(q) => {
              setSelectedQuote(q);
              setView('edit');
            }}
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
            QuoteXpress Pro v2.5
          </span>
        </div>
      </footer>

      {/* Modals */}
      <POEmailCheckerModal
        isOpen={isPOCheckerOpen}
        onClose={() => setIsPOCheckerOpen(false)}
        accessToken={accessToken}
        pendingQuotes={quotations.filter((q) => q.status === 'Sent (Pending PO)')}
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
        onAddQuotation={handleAddManualQuotation}
        onAddDeliveryOrder={handleAddManualDO}
        onAddInvoice={handleAddManualInvoice}
      />
    </div>
  );
}

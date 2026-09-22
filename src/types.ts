export type DocumentType = 'Quotation' | 'DeliveryOrder' | 'Invoice';

export type QuotationStatus = 'Draft' | 'Sent (Pending PO)' | 'PO Received' | 'DO Issued' | 'Invoice Issued' | 'Paid' | 'Cancelled' | 'Expired';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number; // Cost price per unit for profit calculation
  taxRate: number; // e.g. 6 for 6%
  discount: number; // percentage or fixed amount
  notes?: string;
  remark?: string;
  total: number;
}

export interface ClientDetails {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
}

export interface Quotation {
  id: string;
  revisionRootId?: string;
  revisionOfId?: string;
  revisionBaseNumber?: string;
  revisionNumber?: number;
  quoteNumber: string; // e.g. QT-2026-001
  client: ClientDetails;
  date: string;
  validUntil: string;
  items: LineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  currency: string; // e.g. USD, MYR, EUR, SGD
  status: QuotationStatus;
  notes: string;
  terms: string;
  
  // Linked Document References
  poNumber?: string;
  poReceivedDate?: string;
  poEmailSnippet?: string;
  poEmailSubject?: string;
  poEmailSender?: string;
  poEmailId?: string;
  poAttachments?: { id: string; filename: string }[];
  
  deliveryOrderId?: string;
  deliveryOrderNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  
  createdAt: string;
  updatedAt: string;
  syncedToSheet?: boolean;
}

export interface DeliveryOrder {
  id: string;
  doNumber: string; // e.g. DO-2026-001
  quotationId: string;
  quoteNumber: string;
  client: ClientDetails;
  deliveryDate: string;
  deliveryAddress: string;
  driverName?: string;
  vehicleNo?: string;
  trackingRef?: string;
  items: {
    id: string;
    description: string;
    quantity: number;
    notes?: string;
  }[];
  recipientName?: string;
  recipientSignature?: string;
  deliveredAt?: string;
  status: 'Pending Delivery' | 'In Transit' | 'Delivered' | 'Returned';
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-001
  quotationId: string;
  quoteNumber: string;
  poNumber?: string;
  client: ClientDetails;
  date: string;
  dueDate: string;
  items: LineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  currency: string;
  paymentTerms: string;
  bankDetails: string;
  status: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue';
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfile {
  name: string;
  logoUrl?: string;
  address: string;
  email: string;
  phone: string;
  taxId: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  defaultTerms: string;
  defaultNotes: string;
}

export interface GmailEmailMessage {
  id: string;
  threadId: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  snippet: string;
  date: string;
  matchingQuoteNumber?: string;
  hasPOKeywords?: boolean;
  poNumber?: string;
  quotationReferences?: string[];
  attachmentWarning?: string;
  poPdfData?: { filename: string; data: string }[];
  autoMatchEligible?: boolean;
  attachments?: { filename: string; mimeType: string; attachmentId?: string; data?: string }[];
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetTitle: string;
  lastSyncedAt?: string;
}

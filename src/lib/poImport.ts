import type { GmailEmailMessage, Quotation } from '../types';
import { isLatestQuotation } from './workflows';

export interface POImportPlan { email: GmailEmailMessage; quoteId: string }
export function planPOImports(quotes: Quotation[], emails: GmailEmailMessage[]) {
  const plans: POImportPlan[] = [];
  const review: { email: GmailEmailMessage; reason: string }[] = [];
  let alreadyLinked = 0;
  for (const email of emails) {
    if (quotes.some(q => q.poEmailId === email.id && q.poAttachments?.length)) { alreadyLinked++; continue; }
    if (!email.poNumber || !email.poPdfData?.length || email.attachmentWarning) {
      review.push({ email, reason: 'A readable PO PDF and a real PO number are required.' }); continue;
    }
    if (!email.autoMatchEligible) { review.push({ email, reason: 'Review this sender and PO format before linking.' }); continue; }
    const candidates = quotes.filter(q => email.quotationReferences?.includes(q.quoteNumber.toUpperCase()));
    if (candidates.length !== 1 || email.quotationReferences?.length !== 1) {
      review.push({ email, reason: 'No unique quotation reference found in your records.' }); continue;
    }
    const quote = candidates[0];
    if (!isLatestQuotation(quotes, quote) || ['Draft', 'Expired', 'Cancelled'].includes(quote.status)) {
      review.push({ email, reason: 'Quotation is not a current pending or accepted quotation.' }); continue;
    }
    if ((quote.poNumber && quote.poNumber !== email.poNumber) || quotes.some(q => q.id !== quote.id && q.poNumber === email.poNumber)) {
      review.push({ email, reason: 'The PO conflicts with an existing quotation link.' }); continue;
    }
    // Reissued or competing orders must be reviewed together, never pick the first email.
    if (emails.some(other => other.id !== email.id && (other.poNumber === email.poNumber || other.quotationReferences?.includes(quote.quoteNumber.toUpperCase()))
      && !quotes.some(q => q.poEmailId === other.id && q.poAttachments?.length))) {
      review.push({ email, reason: 'Multiple PO emails refer to this PO or quotation. Review the latest version.' }); continue;
    }
    if (quote.poAttachments?.length && quote.poNumber === email.poNumber) {
      review.push({ email, reason: 'A different email is already saved for this PO. Review this possible amendment in Gmail.' }); continue;
    }
    plans.push({ email, quoteId: quote.id });
  }
  return { plans, review, alreadyLinked };
}

export function linkPO(quote: Quotation, email: GmailEmailMessage, files: NonNullable<Quotation['poAttachments']>): Quotation {
  if (!email.poNumber || !files.length) throw new Error('PO number and saved PDF are required.');
  return { ...quote, poNumber: email.poNumber, poEmailId: email.id,
    poEmailSubject: email.subject, poEmailSender: email.senderEmail, poEmailSnippet: email.snippet,
    poAttachments: files, poReceivedDate: quote.poReceivedDate || new Date().toISOString().slice(0, 10),
    status: quote.status === 'Sent (Pending PO)' ? 'PO Received' : quote.status,
    updatedAt: new Date().toISOString() };
}

export async function savePOPdfs(email: GmailEmailMessage): Promise<NonNullable<Quotation['poAttachments']>> {
  if (!email.poPdfData?.length) throw new Error('A readable PO PDF is required before linking.');
  const files: NonNullable<Quotation['poAttachments']> = [];
  for (const pdf of email.poPdfData) {
    const response = await fetch('/api/po-files', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pdf), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Could not save the PO PDF. No quotation status was changed. Retry refresh.');
    const result = await response.json();
    files.push({ id: result.id, filename: pdf.filename });
  }
  return files;
}

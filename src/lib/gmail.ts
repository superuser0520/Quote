import { PO_QUERY, extractPONumber, quotationReferences, matchQuotation } from './poMatching';
import { Quotation, GmailEmailMessage } from '../types';

/**
 * Gmail API utility for sending emails directly and scanning incoming PO emails.
 */

interface GmailAttachment {
  filename: string;
  mimeType: string;
  data: Uint8Array;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function createMimeMessage(to: string, subject: string, bodyText: string, cc?: string, attachment?: GmailAttachment | GmailAttachment[]): string {
  if (/[\r\n]/.test(to + (cc || ''))) throw new Error('Invalid email address.');
  const attachments = attachment ? (Array.isArray(attachment) ? attachment : [attachment]) : [];
  const nl = '\r\n';
  const boundary = `quotexpress-${Date.now()}`;
  const headers = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : '',
    `Subject: =?utf-8?B?${bytesToBase64(new TextEncoder().encode(subject))}?=`,
    `MIME-Version: 1.0`,
    attachments.length ? `Content-Type: multipart/mixed; boundary="${boundary}"` : `Content-Type: text/plain; charset=utf-8`,
  ].filter(Boolean);

  let content = bodyText;
  if (attachments.length) {
    content = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit', '', bodyText, '',
      ...attachments.flatMap(file => [
        `--${boundary}`,
        `Content-Type: ${file.mimeType}; name="${file.filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${file.filename}"`, '',
        bytesToBase64(file.data).match(/.{1,76}/g)?.join(nl) || '',
      ]),
      `--${boundary}--`,
    ].join(nl);
  }
  const fullMessage = headers.join(nl) + nl + nl + content;

  // Convert string to UTF-8 array then to base64url string
  const utf8Encoder = new TextEncoder();
  const utf8Bytes = utf8Encoder.encode(fullMessage);
  
  // Convert byte array to binary string safely
  let binaryStr = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binaryStr += String.fromCharCode(utf8Bytes[i]);
  }

  // Base64url encode
  return btoa(binaryStr)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendGmailDirectly(
  accessToken: string,
  to: string,
  subject: string,
  bodyText: string,
  cc?: string,
  attachment?: GmailAttachment | GmailAttachment[]
): Promise<{ id: string; threadId: string }> {
  if (!accessToken) {
    throw new Error('Not authenticated with Google. Please log in with Google to send emails directly.');
  }

  const rawMessage = createMimeMessage(to, subject, bodyText, cc, attachment);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawMessage,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const errorMsg = errorJson.error?.message || `Gmail API error (status ${response.status})`;
    throw new Error(errorMsg);
  }

  return await response.json();
}

interface MimePart {
  filename?: string;
  mimeType?: string;
  body?: { data?: string; attachmentId?: string };
  parts?: MimePart[];
}

function flattenParts(part: MimePart): MimePart[] {
  return [part, ...(part.parts || []).flatMap(flattenParts)];
}

export function decodeGmailBytes(data: string): Uint8Array {
  return Uint8Array.from(atob(data.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}

async function gmailGet(token: string, resource: string) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${resource}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('Gmail access expired or was denied. Sign in with Google again.');
    throw new Error(`Gmail scan failed (${response.status}). Please retry.`);
  }
  return response.json();
}

export async function getPOAttachment(token: string, messageId: string, file: NonNullable<GmailEmailMessage['attachments']>[number]) {
  const data = file.data || (await gmailGet(token, `messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(file.attachmentId!)}`)).data;
  if (!data) throw new Error('The attachment could not be downloaded.');
  return decodeGmailBytes(data);
}

export function createPOScanner(readPdf: (data: Uint8Array) => Promise<string>) {
  let cachedToken: string | null = null;
  const cache = new Map<string, GmailEmailMessage>();
  return async (accessToken: string | null, pendingQuotes: Quotation[]): Promise<GmailEmailMessage[]> => {
    if (cachedToken !== accessToken) { cache.clear(); cachedToken = accessToken; }
    if (!accessToken) return [];
    const ids = new Set<string>();
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({ q: PO_QUERY, maxResults: '100' });
      if (pageToken) params.set('pageToken', pageToken);
      const page = await gmailGet(accessToken, `messages?${params}`);
      for (const item of page.messages || []) ids.add(item.id);
      pageToken = page.nextPageToken;
    } while (pageToken);
    const messages: GmailEmailMessage[] = [];
    for (const id of ids) {
      let message = cache.get(id);
      if (!message) {
        const raw = await gmailGet(accessToken, `messages/${encodeURIComponent(id)}?format=full`);
        const header = (name: string) => (raw.payload?.headers || []).find((h: {name: string}) => h.name.toLowerCase() === name)?.value || '';
        const subject = header('subject');
        const from = header('from');
        const senderEmail = (from.match(/<([^>]+)>/)?.[1] || from).trim();
        const parts = flattenParts(raw.payload || {});
        const attachments = parts.filter(p => p.filename && (p.body?.attachmentId || p.body?.data)).map(p => ({
          filename: p.filename!, mimeType: p.mimeType || 'application/octet-stream', attachmentId: p.body?.attachmentId, data: p.body?.data,
        }));
        const body = parts.filter(p => /^text\//.test(p.mimeType || '') && !p.filename && p.body?.data)
          .map(p => new TextDecoder().decode(decodeGmailBytes(p.body!.data!))).join('\n').replace(/<[^>]*>/g, ' ');
        let text = [subject, body, ...attachments.map(a => a.filename)].join('\n');
        const shimano = /@(?:[\w-]+\.)?shimano\.com\.sg$/i.test(senderEmail)
          && /\bSMN2100PPE\s+1040340\s+PON\d{10}\b/i.test(subject);
        if (!shimano && !/\bpurchase\s+order\b|\bPO\b/i.test(subject + ' ' + body)) continue;
        let attachmentWarning: string | undefined;
        const poPdfData: { filename: string; data: string }[] = [];
        const subjectPO = extractPONumber(subject);
        for (const file of attachments.filter(a => /\.pdf$/i.test(a.filename))) {
          try {
            const bytes = await getPOAttachment(accessToken, id, file);
            const pdfText = await readPdf(bytes.slice());
            const documentPO = extractPONumber(pdfText);
            if (shimano && (!documentPO || documentPO !== subjectPO)) {
              attachmentWarning = 'The PDF PO number does not match the email. Review the original before linking.';
            }
            text += '\n' + pdfText;
            poPdfData.push({ filename: file.filename, data: bytesToBase64(bytes) });
          }
          catch (error) {
            if (error instanceof Error && /Gmail/.test(error.message)) throw error;
            attachmentWarning = 'Could not read a PDF attachment. Open the original and select the quotation manually.';
          }
        }
        const refs = quotationReferences(text);
        message = { id, threadId: raw.threadId || id, subject, senderEmail,
          senderName: from.split('<')[0].replace(/"/g, '').trim(), snippet: raw.snippet || '',
          date: new Date(Number(raw.internalDate)).toLocaleDateString(), poNumber: extractPONumber(text),
          quotationReferences: refs, attachments, attachmentWarning, poPdfData, autoMatchEligible: shimano };
        if (!attachmentWarning) cache.set(id, message);
      }
      messages.push({ ...message, matchingQuoteNumber: matchQuotation(message.quotationReferences || [], pendingQuotes) });
    }
    for (const key of cache.keys()) if (!ids.has(key)) cache.delete(key);
    return messages;
  };
}

const scanPOEmails = createPOScanner(async data => (await import('./poPdf')).readPOPdf(data));
export const checkPOEmailsInGmail = scanPOEmails;

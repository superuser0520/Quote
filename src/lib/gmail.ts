import { Quotation, GmailEmailMessage } from '../types';

/**
 * Gmail API utility for sending emails directly and scanning incoming PO emails.
 */

function createMimeMessage(to: string, subject: string, bodyText: string, cc?: string): string {
  const nl = '\r\n';
  const headers = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : '',
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
  ].filter(Boolean);

  const fullMessage = headers.join(nl) + nl + nl + bodyText;

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
  cc?: string
): Promise<{ id: string; threadId: string }> {
  if (!accessToken) {
    throw new Error('Not authenticated with Google. Please log in with Google to send emails directly.');
  }

  const rawMessage = createMimeMessage(to, subject, bodyText, cc);

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

export async function checkPOEmailsInGmail(
  accessToken: string | null,
  pendingQuotes: Quotation[]
): Promise<GmailEmailMessage[]> {
  if (!accessToken) {
    return [
      {
        id: 'msg-sample-01',
        threadId: 'thread-sample-01',
        senderName: 'Acme Corp Procurement',
        senderEmail: pendingQuotes[0]?.client.email || 'purchasing@acmecorp.com',
        subject: `Re: Quotation ${pendingQuotes[0]?.quoteNumber || 'QT-2026-001'} - Purchase Order Enclosed (PO-88219)`,
        snippet: `Dear Sales Team, We accept Quotation ${pendingQuotes[0]?.quoteNumber || 'QT-2026-001'}. Please find attached Purchase Order Ref PO-88219. Please proceed with DO delivery.`,
        date: new Date().toLocaleDateString(),
        matchingQuoteNumber: pendingQuotes[0]?.quoteNumber || 'QT-2026-001',
      },
    ];
  }

  try {
    const query = encodeURIComponent('PO OR "Purchase Order" OR Quotation');
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Gmail API error: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.messages || data.messages.length === 0) {
      return [];
    }

    const emailMessages: GmailEmailMessage[] = [];

    for (const item of data.messages) {
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!msgRes.ok) continue;

      const msgData = await msgRes.json();
      const headers = msgData.payload?.headers || [];
      const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

      const snippet = msgData.snippet || '';

      let matchingQuoteNumber: string | undefined;
      for (const q of pendingQuotes) {
        if (subjectHeader.includes(q.quoteNumber) || snippet.includes(q.quoteNumber)) {
          matchingQuoteNumber = q.quoteNumber;
          break;
        }
      }

      emailMessages.push({
        id: msgData.id,
        threadId: msgData.threadId || msgData.id,
        senderName: fromHeader.split('<')[0].replace(/"/g, '').trim(),
        senderEmail: fromHeader.includes('<') ? fromHeader.split('<')[1].replace('>', '').trim() : fromHeader,
        subject: subjectHeader,
        snippet,
        date: dateHeader ? new Date(dateHeader).toLocaleDateString() : 'Today',
        matchingQuoteNumber,
      });
    }

    return emailMessages;
  } catch (err) {
    console.warn('Gmail API search error:', err);
    return [];
  }
}

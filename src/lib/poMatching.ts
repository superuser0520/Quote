// Verified against Shimano's SAP-generated PO emails for vendor 1040340.
export const PO_QUERY = '-in:spam -in:trash -in:sent {subject:SMN2100PPE "purchase order" subject:PO}';

export function extractPONumber(text: string): string | undefined {
  return text.match(/(?:^|[\s_])PON(\d{10})(?=[\s_.]|$)/i)?.[1]
    || text.match(/\bPurchase\s+Order\s*(?:Number|No\.?|Ref\.?)?\s*[:#-]?\s*(\d[\w-]*)/i)?.[1]
    || text.match(/\bPO\s*[-:#]\s*(\d[\w-]*)/i)?.[1];
}

export function quotationReferences(text: string): string[] {
  const modern = text.match(/\bQT-\d{4}-\d+(?:-R\d+)?\b/gi) || [];
  const legacy = [...text.matchAll(/Quotation\s*(?:no\.?|number|ref\.?)\s*[:#]?\s*(\d{8,})\b/gi)].map(m => m[1]);
  return [...new Set([...modern, ...legacy].map(v => v.toUpperCase()))];
}

export function matchQuotation(references: string[], quotes: { quoteNumber: string }[]): string | undefined {
  const matches = quotes.filter(q => references.includes(q.quoteNumber.toUpperCase()));
  return matches.length === 1 ? matches[0].quoteNumber : undefined;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveQuotation, issueDocumentPair, markInvoicePaid, markInvoiceUnpaid, reviseQuotation, quotationVersions, isLatestQuotation, quotationPaymentStatus } from '../src/lib/workflows';
import { documentQuotation } from '../src/lib/documentData';
import { createDocumentPdf } from '../src/lib/quotationPdf';
import { sendGmailDirectly } from '../src/lib/gmail';
import { saveServerDatabase, pendingDatabase } from '../src/lib/dbClient';
import type { DatabaseState } from '../src/lib/dbClient';
import type { Quotation } from '../src/types';
import { deleteQuotationVersion } from '../src/lib/workflows';

const now = new Date(2026, 8, 22, 12);
test('deleting revisions keeps other versions and promotes the previous latest', () => {
  const first = reviseQuotation(fixture(), 'q-a', now);
  const second = reviseQuotation(first.state, first.quotation.id, now);
  const deletedMiddle = deleteQuotationVersion(second.state, first.quotation.id);
  assert.equal(deletedMiddle.quotations.find(q => q.id === second.quotation.id)?.revisionOfId, 'q-a');
  assert.equal(isLatestQuotation(deletedMiddle.quotations, second.quotation), true);
  const deletedLatest = deleteQuotationVersion(second.state, second.quotation.id);
  assert.equal(isLatestQuotation(deletedLatest.quotations, first.quotation), true);
  assert.ok(deletedLatest.quotations.some(q => q.id === 'q-a'));
  assert.ok(deletedLatest.quotations.some(q => q.id === 'q-b'));
});

test('marking a paid invoice unpaid clears payment and reopens the quotation invoice status', () => {
  const state = fixture();
  const issued = issueDocumentPair(state, 'q-a', now).state;
  const paid = markInvoicePaid(issued, issued.invoices[0].id, now);
  assert.equal(paid.invoices[0].status, 'Paid');
  assert.equal(paid.quotations.find(q => q.id === 'q-a')?.status, 'Paid');
  const unpaid = markInvoiceUnpaid(paid, paid.invoices[0].id, now);
  assert.equal(unpaid.invoices[0].status, 'Unpaid');
  assert.equal(unpaid.invoices[0].paidAt, undefined);
  assert.equal(unpaid.quotations.find(q => q.id === 'q-a')?.status, 'Invoice Issued');
});

test('PO payment analytics follows the latest linked invoice status', () => {
  const state = issueDocumentPair(fixture(), 'q-a', now).state;
  const original = state.invoices[0];
  const olderPaid = {...original, id: 'older', status: 'Paid' as const, updatedAt: '2026-09-20T00:00:00.000Z'};
  const latestUnpaid = {...original, id: 'latest', status: 'Unpaid' as const, updatedAt: '2026-09-21T00:00:00.000Z'};
  assert.equal(quotationPaymentStatus({...state.quotations[0], status:'Paid'}, [olderPaid, latestUnpaid]), 'Unpaid');
  assert.equal(quotationPaymentStatus(state.quotations[0], [latestUnpaid, {...olderPaid, updatedAt:'2026-09-22T00:00:00.000Z'}]), 'Paid');
});
function fixture(): DatabaseState {
  const quote: Quotation = {
    id: 'q-a', quoteNumber: 'QT-2026-001', client: {name:'Alice', companyName:'Buyer', email:'alice@example.com',phone:'',address:'Buyer address'},
    date:'2026-09-01',validUntil:'2026-09-22',
    items:[{id:'item-a',description:'Original item',quantity:2,unitPrice:50,taxRate:0,discount:0,total:100}],
    subtotal:100,taxTotal:0,discountTotal:0,grandTotal:100,currency:'MYR',status:'Sent (Pending PO)',notes:'',terms:'',
    createdAt:now.toISOString(),updatedAt:now.toISOString()
  };
  return {quotations:[quote, {...structuredClone(quote), id:'q-b',quoteNumber:'QT-2026-002'}],deliveryOrders:[],invoices:[],
    companyProfile:{name:'Seller',address:'Seller address',email:'seller@example.com',phone:'',taxId:'',bankName:'Bank',bankAccountNo:'123',bankAccountName:'Seller',defaultTerms:'',defaultNotes:''}};
}

test('expiry starts after valid-until day and does not expire accepted, issued, paid or cancelled quotations', () => {
  const quote = fixture().quotations[0];
  assert.equal(effectiveQuotation(quote, '2026-09-22').status, 'Sent (Pending PO)');
  assert.equal(effectiveQuotation(quote, '2026-09-23').status, 'Expired');
  for (const status of ['PO Received','DO Issued','Invoice Issued','Paid','Cancelled'] as const)
    assert.equal(effectiveQuotation({...quote,status}, '2026-09-23').status, status);
  assert.equal(effectiveQuotation({...quote,poNumber:'PO-1'}, '2026-09-23').status, quote.status);
  assert.equal(effectiveQuotation({...quote,invoiceId:'i-1'}, '2026-09-23').status, quote.status);
  assert.equal(effectiveQuotation({...quote,status:'Expired',validUntil:'2026-10-01'}, '2026-09-23').status, 'Draft');
});

test('one issuance creates and links both documents; repeated clicks reuse them', () => {
  const original = fixture();
  const result = issueDocumentPair(original,'q-a',now);
  assert.equal(result.state.invoices.length,1);
  assert.equal(result.state.deliveryOrders.length,1);
  assert.equal(result.quotation.invoiceId,result.invoice.id);
  assert.equal(result.quotation.deliveryOrderId,result.deliveryOrder.id);
  assert.equal(result.quotation.status,'Invoice Issued');
  const again = issueDocumentPair(result.state,'q-a',now);
  assert.equal(again.invoice.id,result.invoice.id);
  assert.equal(again.deliveryOrder.id,result.deliveryOrder.id);
  assert.equal(original.invoices.length,0);
  const other = issueDocumentPair(again.state,'q-b',now);
  assert.notEqual(other.invoice.invoiceNumber,result.invoice.invoiceNumber);
  assert.notEqual(other.deliveryOrder.doNumber,result.deliveryOrder.doNumber);
});

test('issuance fills missing half and preserves paid invoice', () => {
  const result = issueDocumentPair(fixture(),'q-a',now);
  const state = markInvoicePaid({...result.state,deliveryOrders:[]},result.invoice.id,now);
  const pair = issueDocumentPair(state,'q-a',now);
  assert.equal(pair.invoice.id,result.invoice.id);
  assert.equal(pair.invoice.status,'Paid');
  assert.equal(pair.quotation.status,'Paid');
  assert.equal(pair.state.deliveryOrders.length,1);
});

test('expired offers and ambiguous legacy document pairs cannot be issued', () => {
  assert.throws(()=>issueDocumentPair(fixture(),'q-a',new Date(2026,8,23)), /Revise/);
  const pair=issueDocumentPair(fixture(),'q-a',now);
  assert.throws(()=>issueDocumentPair({...pair.state,invoices:[pair.invoice,{...pair.invoice,id:'another'}]},'q-a',now),/multiple/);
});

test('payment targets the selected invoice ID, not the first linked invoice or a stale quote link', () => {
  const a=issueDocumentPair(fixture(),'q-a',now);
  const b=issueDocumentPair(a.state,'q-b',now);
  const second={...a.invoice,id:'second-a',invoiceNumber:'INV-2026-099'};
  const state={...b.state,invoices:[...b.state.invoices,second],
    quotations:b.state.quotations.map(q=>q.id==='q-a'?{...q,invoiceId:b.invoice.id}:q)};
  const updated=markInvoicePaid(state,second.id,now);
  assert.equal(updated.invoices.find(i=>i.id===second.id)?.status,'Paid');
  assert.equal(updated.invoices.find(i=>i.id===a.invoice.id)?.status,'Unpaid');
  assert.equal(updated.invoices.find(i=>i.id===b.invoice.id)?.status,'Unpaid');
  assert.equal(updated.quotations.find(q=>q.id==='q-a')?.status,'Invoice Issued');
  assert.equal(updated.quotations.find(q=>q.id==='q-b')?.status,'Invoice Issued');
  const fullyPaid=markInvoicePaid(updated,a.invoice.id,now);
  assert.equal(fullyPaid.quotations.find(q=>q.id==='q-a')?.status,'Paid');
  assert.equal(fullyPaid.quotations.find(q=>q.id==='q-b')?.status,'Invoice Issued');
  assert.equal(markInvoicePaid(fullyPaid,a.invoice.id,now),fullyPaid);
  assert.equal(state.invoices.find(i=>i.id===second.id)?.status,'Unpaid');
});

test('duplicate invoice IDs fail safely instead of marking multiple invoices paid', () => {
  const pair=issueDocumentPair(fixture(),'q-a',now);
  assert.throws(()=>markInvoicePaid({...pair.state,invoices:[pair.invoice,{...pair.invoice,quotationId:'q-b'}]},pair.invoice.id),/uniquely/);
  assert.throws(()=>markInvoicePaid(pair.state,'missing'),/uniquely/);
});

test('revision R1/R2 preserves earlier versions, resets workflow and never changes issued documents', () => {
  const issued=issueDocumentPair(fixture(),'q-a',now);
  const original=structuredClone(issued.state);
  const r1=reviseQuotation(issued.state,'q-a',now);
  assert.equal(r1.quotation.quoteNumber,'QT-2026-001-R1');
  assert.equal(r1.quotation.status,'Draft');
  assert.equal(r1.quotation.invoiceId,undefined);
  assert.equal(r1.quotation.poNumber,undefined);
  assert.notEqual(r1.quotation.id,'q-a');
  assert.deepEqual(r1.state.quotations.find(q=>q.id==='q-a'),original.quotations.find(q=>q.id==='q-a'));
  assert.deepEqual(r1.state.invoices,original.invoices);
  r1.quotation.items[0].unitPrice=999;
  assert.equal(issued.invoice.items[0].unitPrice,50);
  const r2=reviseQuotation(r1.state,'q-a',now);
  assert.equal(r2.quotation.quoteNumber,'QT-2026-001-R2');
  assert.equal(r2.quotation.revisionOfId,r1.quotation.id);
  assert.equal(quotationVersions(r2.state.quotations,r2.quotation).length,3);
  assert.equal(isLatestQuotation(r2.state.quotations,r1.quotation),false);
  assert.throws(()=>issueDocumentPair(r2.state,'q-a',now),/latest/);
});

test('rendering issued documents uses their saved items, client and totals', () => {
  const pair=issueDocumentPair(fixture(),'q-a',now);
  const changed={...pair.quotation,client:{...pair.quotation.client,name:'Wrong name'},items:[{...pair.quotation.items[0],description:'Changed quote',unitPrice:999,total:1998}],grandTotal:1998};
  const invoice=documentQuotation('invoice',changed,pair.deliveryOrder,pair.invoice);
  const delivery=documentQuotation('do',changed,pair.deliveryOrder,pair.invoice);
  assert.equal(invoice.grandTotal,100);
  assert.equal(invoice.client.name,'Alice');
  assert.equal(invoice.items[0].description,'Original item');
  assert.equal(documentQuotation('invoice', {...changed, poNumber:'4503155546'}, pair.deliveryOrder, {...pair.invoice, poNumber:undefined}).poNumber, '4503155546');
  assert.equal(delivery.items[0].description,'Original item');
  const pdf=createDocumentPdf('invoice',changed,pair.state.companyProfile,pair.deliveryOrder,pair.invoice);
  const text=Buffer.from(pdf.data).toString('latin1');
  assert.match(text,/Original item/);
  assert.doesNotMatch(text,/Changed quote|1998\.00|Wrong name/);
  const poPdf=createDocumentPdf('invoice',{...changed,poNumber:'4503155546'},pair.state.companyProfile,pair.deliveryOrder,{...pair.invoice,poNumber:undefined});
  assert.match(Buffer.from(poPdf.data).toString('latin1'),/PO reference: 4503155546/);
});

test('combined email sends exactly one Gmail request with two independent PDF attachments', async t => {
  const requests: any[]=[];
  t.mock.method(globalThis,'fetch',async (url:any,init:any)=>{requests.push({url,init});return new Response(JSON.stringify({id:'mail',threadId:'thread'}));});
  await sendGmailDirectly('test-token','alice@example.com','DO + Invoice','Both attached',undefined,[
    {filename:'DO-001.pdf',mimeType:'application/pdf',data:new TextEncoder().encode('delivery-content')},
    {filename:'INV-001.pdf',mimeType:'application/pdf',data:new TextEncoder().encode('invoice-content')},
  ]);
  assert.equal(requests.length,1);
  const mime=Buffer.from(JSON.parse(requests[0].init.body).raw,'base64url').toString();
  assert.equal((mime.match(/Content-Disposition: attachment/g)||[]).length,2);
  assert.match(mime,/DO-001.pdf/); assert.match(mime,/INV-001.pdf/);
  assert.match(mime,new RegExp(Buffer.from('delivery-content').toString('base64')));
  assert.match(mime,new RegExp(Buffer.from('invoice-content').toString('base64')));
});

test('single attachment remains supported and invalid recipient headers are rejected',async t=>{
  let mime='';
  t.mock.method(globalThis,'fetch',async (_:any,init:any)=>{mime=Buffer.from(JSON.parse(init.body).raw,'base64url').toString();return new Response('{}');});
  await sendGmailDirectly('test','alice@example.com','SOA','body',undefined,{filename:'SOA.pdf',mimeType:'application/pdf',data:new Uint8Array([1,2])});
  assert.equal((mime.match(/Content-Disposition: attachment/g)||[]).length,1);
  await assert.rejects(()=>sendGmailDirectly('test','bad\r\nBcc: other@example.com','subject','body'),/Invalid email/);
});

function storage(t: any) {
  const map=new Map<string,string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>map.set(key,value),removeItem:(key:string)=>map.delete(key)
  }});
  t.after(() => {if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete (globalThis as any).localStorage;});
}

test('failed saves retain a complete pending database across reload',async t=>{
  storage(t);
  t.mock.method(globalThis,'fetch',async()=>new Response('unavailable',{status:503}));
  const pair=issueDocumentPair(fixture(),'q-a',now);
  const paid=markInvoicePaid(pair.state,pair.invoice.id,now);
  assert.equal(await saveServerDatabase(paid),false);
  assert.equal(pendingDatabase()?.invoices[0].status,'Paid');
});

test('saves are ordered and an earlier success never clears a newer pending snapshot',async t=>{
  storage(t);
  const requests: any[]=[];
  let release: (value:Response)=>void=()=>{};
  t.mock.method(globalThis,'fetch',async (_:any,init:any)=>{
    requests.push(JSON.parse(init.body));
    if(requests.length===1) return new Promise<Response>(resolve=>{release=resolve;});
    return new Response('{}');
  });
  const first=fixture(), second={...fixture(),invoices:[],quotations:[]};
  const p1=saveServerDatabase(first);
  const p2=saveServerDatabase(second);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests.length,1);
  assert.equal(pendingDatabase()?.quotations.length,0);
  release(new Response('{}'));
  assert.equal(await p1,true); assert.equal(await p2,true);
  assert.equal(requests.length,2);
  assert.equal(requests[1].quotations.length,0);
  assert.equal(pendingDatabase(),null);
});

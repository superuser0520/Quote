import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { poFilesRouter } from '../poFiles';
import { extractPONumber, quotationReferences, matchQuotation } from '../src/lib/poMatching';
import { createPOScanner } from '../src/lib/gmail';
import { linkPO, planPOImports } from '../src/lib/poImport';
import type { GmailEmailMessage, Quotation } from '../src/types';

const quote = {id: 'q1', quoteNumber: 'QT-2026-221', status: 'Sent (Pending PO)'} as Quotation;
const email: GmailEmailMessage = {id: 'm1', threadId: 't1', subject: 'SMN2100PPE 1040340 PON4503155546 2609182302', senderName:'Song Fang', senderEmail:'SongFang@shimano.com.sg', snippet:'Purchase order', date:'2026-09-18', poNumber:'4503155546', quotationReferences:['QT-2026-221'], autoMatchEligible:true, poPdfData:[{filename:'po.pdf',data:Buffer.from('%PDF-1.7 test').toString('base64')}]};

test('extract real Shimano number and exact quotation references without guessing', () => {
  assert.equal(extractPONumber(email.subject), '4503155546');
  assert.equal(extractPONumber('2100PPE_1040340_PON4503155546_2609182302.pdf'), '4503155546');
  assert.equal(extractPONumber('purchase order (PO). Please proceed.'), undefined);
  assert.deepEqual(quotationReferences('Quotation no.: QT-2026-221 Quotation no: 30072601 QT-2026-221'), ['QT-2026-221','30072601']);
  assert.equal(matchQuotation(['QT-2026-221-R1'], [quote]), undefined);
});

test('refresh links once, stores PDF references, and preserves issued status', () => {
  assert.equal(planPOImports([quote], [email]).plans.length, 1);
  const linked = linkPO(quote, email, [{id:'hash',filename:'po.pdf'}]);
  assert.equal(linked.status, 'PO Received');
  assert.equal(linked.poNumber, '4503155546');
  const restored = JSON.parse(JSON.stringify(linked));
  assert.equal(restored.poAttachments[0].filename, 'po.pdf');
  assert.equal(planPOImports([restored], [email]).alreadyLinked, 1);
  assert.equal(planPOImports([restored], [email]).plans.length, 0);
  assert.equal(planPOImports([restored], [{...email,id:'amended'}]).review.length, 1);
  assert.equal(linkPO({...quote,status:'Paid'}, email, [{id:'hash',filename:'po.pdf'}]).status, 'Paid');
});

test('ambiguous, missing PDF, duplicate, conflicting and noncurrent matches need review', () => {
  for (const msg of [ {...email,poPdfData:[]}, {...email,quotationReferences:[]}, {...email,autoMatchEligible:false}, {...email,quotationReferences:['QT-2026-221','QT-2026-222']} ]) {
    assert.equal(planPOImports([quote],[msg]).plans.length,0);
  }
  assert.equal(planPOImports([quote], [email,{...email,id:'m2'}]).plans.length,0);
  assert.equal(planPOImports([{...quote,poNumber:'different'}],[email]).plans.length,0);
  for (const status of ['Draft','Expired','Cancelled'] as const) assert.equal(planPOImports([{...quote,status}],[email]).plans.length,0);
});

test('scanner paginates, reads nested PDF, reuses cache, and surfaces expired Gmail access', async () => {
  const original = globalThis.fetch;
  let reads = 0;
  const pdf = Buffer.from('%PDF-test').toString('base64url');
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/messages')) return Response.json(url.searchParams.has('pageToken') ? {messages:[{id:'m1'}]} : {messages:[],nextPageToken:'page2'});
    if (url.pathname.endsWith('/attachments/a1')) return Response.json({data:pdf});
    reads++;
    return Response.json({id:'m1',internalDate:'1790087025000',payload:{headers:[{name:'Subject',value:email.subject},{name:'From',value:'SONG FANG <SongFang@shimano.com.sg>'}],parts:[{mimeType:'multipart/mixed',parts:[{filename:'po.pdf',mimeType:'application/pdf',body:{attachmentId:'a1'}}]}]}});
  };
  try {
    const scanner = createPOScanner(async () => 'PURCHASE ORDER Number : 4503155546 Quotation no.: QT-2026-221');
    assert.deepEqual(await scanner(null,[quote]), []);
    const first = await scanner('token',[quote]);
    assert.equal(first[0].poNumber, email.poNumber);
    assert.equal(first[0].matchingQuoteNumber, quote.quoteNumber);
    assert.equal(first[0].poPdfData?.length,1);
    assert.equal((await scanner('token',[]))[0].matchingQuoteNumber, undefined);
    assert.equal(reads,1);
    globalThis.fetch = async () => new Response('',{status:401});
    await assert.rejects(scanner('token',[quote]), /Sign in with Google again/);
  } finally { globalThis.fetch = original; }
});

test('PDF storage survives a new router instance and rejects invalid uploads and path IDs', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(),'quote-po-test-'));
  const app = express(); app.use(express.json()); app.use('/files',poFilesRouter(directory));
  const server = app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve => server.once('listening',resolve));
  const address = server.address() as {port:number};
  const base = `http://127.0.0.1:${address.port}/files`;
  try {
    const upload = () => fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(email.poPdfData![0])});
    const result = await (await upload()).json();
    assert.match(result.id,/^[a-f0-9]{64}$/);
    assert.equal((await (await upload()).json()).id,result.id);
    assert.equal(fs.readdirSync(path.join(directory,'po-files')).length,1);
    app.use('/restored',poFilesRouter(directory));
    const downloaded = await fetch(`http://127.0.0.1:${address.port}/restored/${result.id}`);
    assert.equal(await downloaded.text(),'%PDF-1.7 test');
    assert.equal((await fetch(`${base}/invalid`)).status,400);
    assert.equal((await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:'bad.pdf',data:'aGVsbG8='})})).status,400);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(directory,{recursive:true,force:true});
  }
});

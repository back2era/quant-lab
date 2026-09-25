import test from 'node:test';
import assert from 'node:assert/strict';
import {selectQuotes,quoteStatus} from '../lib/quote-state.mjs';
import {collectQuotes} from '../lib/live.mjs';
const now=Date.parse('2026-09-25T10:00:00Z');
const asset={symbol:'MSFT',market:'US',currency:'USD',price:510,quoteAt:'2026-09-24T20:00:00Z'};
const old={symbol:'MSFT',currency:'USD',price:490,at:'2026-09-08T20:00:01Z',closePrice:489,closeAt:'2026-09-08T20:00:00Z'};
test('new daily close replaces obsolete trade cache without pretending to be a fresh trade',()=>{
 const q=selectQuotes([asset],[[old]],now)[0];
 assert.equal(q.price,510);assert.equal(q.at,asset.quoteAt);assert.equal(q.kind,'close');
 assert.equal(q.closeAt,asset.quoteAt);assert.equal(quoteStatus(q,{errors:[]},now).label,'收盘价备用');
});
test('current trade and most recent completed close are selected independently',()=>{
 const fresh={...old,price:513,at:'2026-09-25T09:00:00Z'};
 const q=selectQuotes([asset],[[fresh],[old]],now)[0];
 assert.equal(q.price,513);assert.equal(q.closePrice,510);assert.equal(q.closeAt,asset.quoteAt);
 assert.equal(q.at,fresh.at);assert.equal(q.kind,'trade');
});
test('invalid, future and untracked quotes cannot override valid prices',()=>{
 const q=selectQuotes([asset],[[{...old,currency:'HKD',at:'2026-09-25T09:00:00Z'},{...old,price:999,at:'2026-09-26T09:00:00Z'},{...old,symbol:'GONE'}]],now);
 assert.equal(q.length,1);assert.equal(q[0].price,510);
 assert.equal(quoteStatus(old,{errors:[]},now).label,'陈旧缓存');
});
test('Yahoo rate limit halts its queue and respects Retry-After across calls while crypto still updates',async()=>{
 const stocks=Array.from({length:20},(_,i)=>({...asset,symbol:'S'+i}));let yahoo=0,crypto=0;
 const fetcher=async url=>{if(url.includes('coinbase')){crypto++;return new Response(JSON.stringify({price:'10',time:new Date(now).toISOString()}));}yahoo++;return new Response('',{status:429,headers:{'Retry-After':'1800'}});};
 const specs=[...stocks,{symbol:'BTC-USD',market:'CRYPTO',currency:'USD'}];
 const first=await collectQuotes(specs,{fetcher,now:()=>now});
 assert.ok(yahoo<=4,'must stop the remaining Yahoo queue');assert.equal(crypto,1);
 assert.ok(first.cooldowns.yahoo>=now+1800000);assert.equal(first.quotes.length,1);
 const second=await collectQuotes(specs,{fetcher,now:()=>now+60000,cooldowns:first.cooldowns});
 assert.equal(crypto,2);assert.ok(yahoo<=4);assert.equal(second.errors.length,20);
});

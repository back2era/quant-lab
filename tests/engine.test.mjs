import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAccount, scoreAsset, applyCycle, tradeFee, parseFundamentals } from '../lib/engine.mjs';

const at = '2026-09-07T12:00:00.000Z';
const asset = {symbol:'MSFT',name:'微软',market:'US',currency:'USD',lot:1,price:100,quoteAt:'2026-09-04T20:00:00Z',momentum:0.2,ma200:80,volatility:0.2,bars:[],actions:[],fundamentals:{filed:'2026-08-01',end:'2026-06-30',revenue:200,previousRevenue:150,income:40,eps:4,assets:300,liabilities:100,source:'https://www.sec.gov/'}};
const dataset = (assets=[asset])=>({asOf:at,fx:{USD:7,HKD:0.9,CNY:1,date:'2026-09-04'},assets,errors:[],benchmarks:[]});
test('new account has only CNY cash and no invented history',()=>{const a=initialAccount(at);assert.equal(a.cash,200000);assert.deepEqual(a.trades,[]);assert.equal(a.snapshots[0].equity,200000)});
test('missing fundamentals cannot generate an equity buy even with strong momentum',()=>{assert.equal(scoreAsset({...asset,fundamentals:null},at).eligible,false)});
test('strong verified financials and trend qualify',()=>{assert.equal(scoreAsset(asset,at).score,100);assert.equal(scoreAsset(asset,at).eligible,true)});
test('future filing is rejected',()=>{assert.equal(scoreAsset({...asset,fundamentals:{...asset.fundamentals,filed:'2027-01-01'}},at).eligible,false)});
test('US fee and HK stamp duty are charged',()=>{assert.equal(tradeFee('US',1000,'BUY'),1);assert.equal(tradeFee('HK',10000,'BUY'),28)});
test('first signal is queued, never filled at already known close',()=>{const a=applyCycle(initialAccount(at),dataset(),at);assert.equal(a.trades.length,0);assert.equal(a.orders.filter(x=>x.status==='PENDING').length,1);assert.equal(a.cash,200000)});
test('same data cannot duplicate a decision',()=>{let a=applyCycle(initialAccount(at),dataset(),at);a=applyCycle(a,dataset(),at);assert.equal(a.orders.length,1);assert.equal(a.trades.length,0)});
test('next complete session buys within budget, includes fees and FX',()=>{let a=applyCycle(initialAccount(at),dataset(),at);const next='2026-09-09T01:00:00Z';const b={...asset,price:101,quoteAt:'2026-09-08T20:00:00Z',bars:[{openAt:'2026-09-08T13:30:00Z',closeAt:'2026-09-08T20:00:00Z',close:101,volume:100000}]};a=applyCycle(a,{...dataset([b]),asOf:next,fx:{USD:7,HKD:0.9,CNY:1,date:'2026-09-08'}},next);assert.equal(a.trades.length,1);assert.equal(a.positions[0].quantity,42);assert.equal(a.cash,170261.47);assert.ok(a.cash>=140000);const once=a.cash;a=applyCycle(a,{...dataset([b]),asOf:next},next);assert.equal(a.cash,once);assert.equal(a.trades.length,1)});
test('stale FX prevents fill',()=>{let a=applyCycle(initialAccount(at),dataset(),at);const later='2026-09-09T01:00:00Z';a=applyCycle(a,{...dataset([{...asset,bars:[{openAt:'2026-09-08T13:30:00Z',closeAt:'2026-09-08T20:00:00Z',close:101,volume:1}]}]),fx:{USD:7,CNY:1,HKD:0.9,date:'2026-08-01'}},later);assert.equal(a.trades.length,0)});
test('paused account produces no new buy',()=>{const a=initialAccount(at);a.paused=true;assert.equal(applyCycle(a,dataset(),at).orders.length,0)});
test('SEC parser ignores later restatements not available as of decision',()=>{const entry=(end,val,filed)=>({start:end.slice(0,4)+'-01-01',end,val,filed,form:'10-K',fp:'FY'});const j={facts:{'us-gaap':{Revenues:{units:{USD:[entry('2024-12-31',100,'2025-02-01'),entry('2025-12-31',120,'2026-02-01'),entry('2025-12-31',999,'2027-02-01')]}},NetIncomeLoss:{units:{USD:[entry('2025-12-31',30,'2026-02-01')]}},EarningsPerShareDiluted:{units:{'USD/shares':[entry('2025-12-31',3,'2026-02-01')]}}}}};const f=parseFundamentals(j,at,'x');assert.equal(f.revenue,120);assert.equal(f.previousRevenue,100);assert.equal(f.income,30)});


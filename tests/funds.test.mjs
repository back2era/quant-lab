import test from 'node:test';import assert from 'node:assert/strict';import {scoreAsset} from '../lib/engine.mjs';import {FUNDS} from '../lib/funds.mjs';
const now='2026-09-09T12:00:00Z';const a={...FUNDS[0],price:100,quoteAt:'2026-09-08T20:00:00Z',ma200:90,momentum:.1,volatility:.2};
test('verified ETF uses trend model without company earnings',()=>{assert.equal(scoreAsset(a,now).eligible,true);assert.equal(scoreAsset(a,now).score,100)});
test('label alone cannot bypass company financial validation',()=>{assert.equal(scoreAsset({...a,symbol:'UNVERIFIED'},now).eligible,false)});
test('ETF missing volatility or failed source cannot open',()=>{assert.equal(scoreAsset({...a,volatility:null},now).eligible,false);assert.equal(scoreAsset({...a,cached:true},now).eligible,false)});

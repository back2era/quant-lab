import test from 'node:test';
import assert from 'node:assert/strict';
import {exposure,accrue,buyingRoom} from '../lib/margin.mjs';
test('short proceeds offset a signed liability rather than create profit',()=>{const s={cash:300000,positions:[{quantity:-100,markPrice:1000,markFx:1}]};assert.equal(exposure(s).equity,200000);assert.equal(exposure(s).restricted,100000);assert.equal(buyingRoom(s,'SHORT'),0)});
test('finance interest excludes restricted short proceeds and cannot double charge time',()=>{const s={cash:0,positions:[{quantity:200,markPrice:1000,markFx:1},{quantity:-50,markPrice:1000,markFx:1}],financing:{lastAt:'2026-01-01',total:0,interest:0,borrow:0}};accrue(s,'2026-01-02');assert.ok(Math.abs(s.financing.total-9000/365)<1e-8);const c=s.cash;accrue(s,'2026-01-02');assert.equal(s.cash,c)});
test('maintenance breach blocks new exposure',()=>{const s={cash:-150000,positions:[{quantity:200,markPrice:1000,markFx:1}]};assert.equal(exposure(s).marginCall,true);assert.equal(buyingRoom(s,'BUY'),0)});

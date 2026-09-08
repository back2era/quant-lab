import {UNIVERSE,BENCHMARKS} from './data.mjs';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const positive=n=>finite(n)&&n>0;
function requireThat(ok,message){if(!ok)throw new Error(message);}
export function validateSnapshot(value,now){
 const cutoff=Date.parse(now),observed=Date.parse(value?.asOf);
 requireThat(Number.isFinite(observed)&&observed<=cutoff&&cutoff-observed<=3*86400000,'采集时间无效或过旧');
 const timestamp=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&Date.parse(s)<=observed;
 const numeric=n=>n==null||finite(n);
 let fx=null;
 if(value.fx!=null){const f=value.fx;requireThat(f.CNY===1&&positive(f.USD)&&f.USD<100&&positive(f.HKD)&&f.HKD<100&&timestamp(f.date),'汇率无效');fx={CNY:1,USD:f.USD,HKD:f.HKD,date:f.date,source:'https://frankfurter.dev/v1/'};}
 function asset(a,spec){
  requireThat(a&&a.symbol===spec.symbol&&a.currency===spec.currency&&a.market===spec.market&&(!spec.lot||a.lot===spec.lot),'标的身份或交易单位无效');
  requireThat(a.price==null||positive(a.price),'价格无效');
  requireThat(Array.isArray(a.bars)&&a.bars.length<=260,'日线数量无效');let last=-Infinity;
  const bars=a.bars.map(b=>{requireThat(timestamp(b.openAt)&&timestamp(b.closeAt)&&Date.parse(b.closeAt)>Date.parse(b.openAt)&&Date.parse(b.openAt)>last&&positive(b.close)&&finite(b.volume)&&b.volume>=0,'日线时间或数值无效');last=Date.parse(b.openAt);return {openAt:b.openAt,closeAt:b.closeAt,close:b.close,volume:b.volume};});
  if(a.price!=null)requireThat(timestamp(a.quoteAt)&&bars.length>0&&a.quoteAt===bars.at(-1).closeAt&&Math.abs(a.price-bars.at(-1).close)<1e-6,'最近行情与日线不一致');
  requireThat([a.change,a.momentum,a.ma200,a.volatility].every(numeric),'指标必须是有限数字');
  const actions=(a.actions||[]).map(e=>{requireThat(timestamp(e.at)&&((e.type==='split'&&positive(e.ratio)&&e.ratio<10000)||(e.type==='dividend'&&positive(e.amount))),'公司行动数据无效');return e.type==='split'?{type:e.type,at:e.at,ratio:e.ratio}:{type:e.type,at:e.at,amount:e.amount};});
  let f=null;
  if(a.fundamentals!=null){const x=a.fundamentals;requireThat(spec.cik&&timestamp(x.filed)&&timestamp(x.end)&&timestamp(x.checkedAt)&&[x.revenue,x.previousRevenue,x.income,x.eps,x.assets,x.liabilities].every(numeric),'财报时间或数值无效');f={filed:x.filed,end:x.end,checkedAt:x.checkedAt,revenue:x.revenue,previousRevenue:x.previousRevenue,income:x.income,eps:x.eps,assets:x.assets,liabilities:x.liabilities,accession:typeof x.accession==='string'?x.accession.slice(0,50):null,source:'https://www.sec.gov/edgar/browse/?CIK='+spec.cik};}
  return {...spec,price:a.price??null,quoteAt:a.quoteAt??null,change:a.change??null,momentum:a.momentum??null,ma200:a.ma200??null,volatility:a.volatility??null,bars,actions,sparkline:bars.slice(-40).map(b=>b.close),fundamentals:f,cached:!!a.cached,source:'https://finance.yahoo.com/quote/'+encodeURIComponent(spec.symbol)+'/'};
 }
 requireThat(Array.isArray(value.assets)&&value.assets.length===UNIVERSE.length&&new Set(value.assets.map(a=>a.symbol)).size===UNIVERSE.length,'观察标的数量无效');
 const assets=UNIVERSE.map(s=>asset(value.assets.find(a=>a.symbol===s.symbol),s));
 requireThat(Array.isArray(value.benchmarks)&&value.benchmarks.length<=3&&new Set(value.benchmarks.map(a=>a.symbol)).size===value.benchmarks.length,'基准数量无效');
 const benchmarks=value.benchmarks.map(a=>{const spec=BENCHMARKS.find(b=>b.symbol===a.symbol);requireThat(spec,'未知基准');return asset(a,spec);});
 requireThat(Array.isArray(value.errors)&&value.errors.length<=60,'数据错误记录无效');
 return {asOf:value.asOf,fx,assets,benchmarks,errors:value.errors.map(x=>String(x).slice(0,300)),transport:'desktop'};
}

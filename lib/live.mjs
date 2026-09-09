import {parseChart} from './data.mjs';
export async function collectQuotes(specs){
 const errors=[],quotes=[];let cursor=0;
 async function worker(){while(cursor<specs.length){const s=specs[cursor++];try{let price,at,source,close={};
 if(s.market==='CRYPTO'){source='https://api.exchange.coinbase.com/products/'+encodeURIComponent(s.symbol)+'/ticker';const r=await fetch(source,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();price=Number(j.price);at=j.time;}
 else {source='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(s.symbol)+'?range=1y&interval=1d&events=div,splits';const r=await fetch(source,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json(),m=j.chart?.result?.[0]?.meta;if(m?.currency!==s.currency)throw Error('币种不匹配');price=m.regularMarketPrice;at=new Date(m.regularMarketTime*1000).toISOString();const completed=parseChart(j,s,new Date().toISOString());close={closePrice:completed.price,closeAt:completed.quoteAt};}
 if(!(price>0)||!Number.isFinite(price)||!Number.isFinite(Date.parse(at))||Date.parse(at)>Date.now()+60000)throw Error('报价无效');quotes.push({symbol:s.symbol,price,at,currency:s.currency,...close,source:s.market==='CRYPTO'?'Coinbase 现货':'Yahoo · 可能延迟',delayGuaranteed:false});
 }catch(e){errors.push(s.symbol+'：'+e.message);}}}
 await Promise.all([worker(),worker(),worker(),worker()]);return {asOf:new Date().toISOString(),quotes,errors};
}

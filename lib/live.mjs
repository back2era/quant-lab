import {parseChart} from './data.mjs';
export async function collectQuotes(specs,{fetcher=fetch,now=Date.now,cooldowns={}}={}){
 const errors=[],quotes=[],next={...cooldowns};let cursor=0;
 async function worker(){while(cursor<specs.length){const s=specs[cursor++],provider=s.market==='CRYPTO'?'coinbase':'yahoo';
  if(next[provider]>now()){errors.push(s.symbol+'：数据源限流，等待重试至 '+new Date(next[provider]).toISOString());continue;}
  try{
   const url=provider==='coinbase'?'https://api.exchange.coinbase.com/products/'+encodeURIComponent(s.symbol)+'/ticker':'https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(s.symbol)+'?range=1mo&interval=1d&events=div,splits';
   const r=await fetcher(url,{signal:AbortSignal.timeout(8000)});
   if(r.status===429){const retry=r.headers.get('retry-after'),seconds=Number(retry);const retryAt=retry&&Number.isFinite(seconds)?now()+seconds*1000:Date.parse(retry);next[provider]=Math.max(next[provider]||0,now()+5*60000,Number.isFinite(retryAt)?retryAt:0);throw Error('HTTP 429 · 数据源限流，已暂停重试');}
   if(!r.ok)throw Error('HTTP '+r.status);
   const j=await r.json();let price,at,close={};
   if(provider==='coinbase'){price=Number(j.price);at=j.time;}
   else {const m=j.chart?.result?.[0]?.meta;if(m?.currency!==s.currency)throw Error('币种不匹配');price=m.regularMarketPrice;at=new Date(m.regularMarketTime*1000).toISOString();
    // A valid last trade remains useful even if the daily series is unavailable.
    try{const completed=parseChart(j,s,new Date(now()).toISOString());close={closePrice:completed.price,closeAt:completed.quoteAt};}catch{}
   }
   if(!(price>0)||!Number.isFinite(price)||!Number.isFinite(Date.parse(at))||Date.parse(at)>now()+1000)throw Error('报价无效');
   quotes.push({symbol:s.symbol,price,at,currency:s.currency,...close,kind:'trade',source:provider==='coinbase'?'Coinbase 现货':'Yahoo · 可能延迟',delayGuaranteed:false});
  }catch(e){errors.push(s.symbol+'：'+e.message);}
 }}
 await Promise.all([worker(),worker(),worker(),worker()]);
 return {asOf:new Date(now()).toISOString(),quotes,errors,cooldowns:next};
}

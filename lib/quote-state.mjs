const positive=n=>Number.isFinite(n)&&n>0;
const validTime=(s,now)=>Number.isFinite(Date.parse(s))&&Date.parse(s)<=now+1000;
// Compare market timestamps, never the time a cache was read or uploaded.
export function selectQuotes(assets,groups=[],now=Date.now()){
 return assets.flatMap(a=>{
  const candidates=groups.flat().filter(q=>q.symbol===a.symbol&&q.currency===a.currency&&positive(q.price)&&validTime(q.at,now));
  const closes=candidates.filter(q=>positive(q.closePrice)&&validTime(q.closeAt,now)).map(q=>({price:q.closePrice,at:q.closeAt}));
  if(positive(a.price)&&validTime(a.quoteAt,now))closes.push({price:a.price,at:a.quoteAt});
  closes.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));const close=closes[0];
  if(close)candidates.push({symbol:a.symbol,currency:a.currency,price:close.price,at:close.at,kind:'close',source:'Yahoo · 完整日线收盘'});
  candidates.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||(a.kind==='close'?1:0)-(b.kind==='close'?1:0));
  const q=candidates[0];if(!q)return [];
  return [{...q,kind:q.kind==='close'?'close':'trade',...(close?{closePrice:close.price,closeAt:close.at}:{})}];
 });
}
export function quoteStatus(q,live,now=Date.now()){
 if(!q)return {label:'暂无报价',tone:'amber'};
 const age=now-Date.parse(q.at);
 if(!Number.isFinite(age)||age>3*86400000)return {label:'陈旧缓存',tone:'amber'};
 if(q.kind==='close')return {label:'收盘价备用',tone:'amber'};
 if(live.errors?.some(e=>e.startsWith(q.symbol+'：')))return {label:'保留上次报价',tone:'amber'};
 return {label:age>20*60000?'最后成交 · 非实时':'最新成交 · 可能延迟',tone:age>20*60000?'':'green'};
}
export function financialStatus(a){
 if(a.market==='CRYPTO')return '趋势模型 · 不使用财报';
 if(a.kind==='ETF')return 'ETF趋势模型';
 if(a.fundamentals)return '财报已接入 · 有效性见评分';
 if(a.market==='A'||a.market==='HK')return '财报源未接入';
 return a.cik?'SEC财报读取失败或指标不足':'未匹配可用财报源';
}

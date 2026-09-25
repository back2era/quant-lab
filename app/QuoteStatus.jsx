import {quoteStatus} from '../lib/quote-state.mjs';
const time=s=>s?new Date(s).toLocaleString('zh-CN',{timeZone:'Asia/Hong_Kong',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'尚无记录';
export function QuoteCell({quote,live}){
 const status=quoteStatus(quote,live);
 return <>{quote?<>{quote.price.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})} {quote.currency}<small>{time(quote.at)}</small><small>{quote.source}</small></>:<span className="muted">—</span>}<small><span className={'tag '+status.tone}>{status.label}</span></small></>;
}
export function QuoteHealth({live,assets}){
 const counts={trade:0,close:0,old:0,missing:0};
 for(const a of assets){const q=live.quotes.find(q=>q.symbol===a.symbol),status=quoteStatus(q,live);if(!q)counts.missing++;else if(status.label==='陈旧缓存')counts.old++;else if(q.kind==='close')counts.close++;else counts.trade++;}
 const groups=new Map(),other=[];
 for(const error of live.errors){
  if(!/HTTP 429|数据源限流/.test(error)){other.push(error);continue;}
  const symbol=error.split('：')[0],crypto=assets.some(a=>a.symbol===symbol&&a.market==='CRYPTO'),key=crypto?'coinbase':'yahoo';
  if(!groups.has(key))groups.set(key,{name:crypto?'Coinbase 加密货币行情':'Yahoo 股票行情',symbols:new Set(),until:0});
  const group=groups.get(key);group.symbols.add(symbol);
  const stamp=error.match(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/)?.[0];
  group.until=Math.max(group.until,live.cooldowns?.[key]||live.webCooldowns?.[key]||0,Date.parse(stamp)||0);
 }
 return <div className="quote-health"><p>成交报价 {counts.trade} · 收盘价备用 {counts.close} · 陈旧缓存 {counts.old} · 暂无报价 {counts.missing}</p><p className="note">每60秒检查更新。来源 {live.transport||'读取中'} · 最近采集尝试 {time(live.asOf)}（北京时间）。价格时间以各行标注为准，公共行情可能延迟。</p>{[...groups].map(([key,g])=><div className="source-warning" key={key}><b>{g.name}暂时限制请求 · 影响{g.symbols.size}个标的</b><p>同一个数据源返回了“请求过多”（429）。限流期间显示原时间的可用报价或备用收盘价。</p><p>{g.until>Date.now()?<>预计 {time(g.until)}（北京时间）之后再次尝试，届时能否恢复取决于数据源。</>:'等待下一轮重试，恢复时间取决于数据源。'}</p><details><summary>查看受影响的标的</summary><p className="affected-symbols">{[...g.symbols].join('、')}</p></details></div>)}{other.length>0&&<details><summary className="warning">其他采集提示（{other.length}项）</summary>{other.map((e,i)=><p key={i}>{e.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g,s=>time(s)+'（北京时间）')}</p>)}</details>}</div>;
}

import {quoteStatus} from '../lib/quote-state.mjs';
const time=s=>s?new Date(s).toLocaleString('zh-CN',{timeZone:'Asia/Hong_Kong',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'尚无记录';
export function QuoteCell({quote,live}){
 const status=quoteStatus(quote,live);
 return <>{quote?<>{quote.price.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})} {quote.currency}<small>{time(quote.at)}</small><small>{quote.source}</small></>:<span className="muted">—</span>}<small><span className={'tag '+status.tone}>{status.label}</span></small></>;
}
export function QuoteHealth({live,assets}){
 const counts={trade:0,close:0,old:0,missing:0};
 for(const a of assets){const q=live.quotes.find(q=>q.symbol===a.symbol),status=quoteStatus(q,live);if(!q)counts.missing++;else if(status.label==='陈旧缓存')counts.old++;else if(q.kind==='close')counts.close++;else counts.trade++;}
 return <div className="quote-health"><p>成交报价 {counts.trade} · 收盘价备用 {counts.close} · 陈旧缓存 {counts.old} · 暂无报价 {counts.missing}</p><p className="note">每60秒检查更新；限流时等待重试。报价来源 {live.transport||'读取中'} · 最近采集尝试 {time(live.asOf)}。价格时间以各行标注为准，公共行情可能延迟。</p>{live.errors.length>0&&<details><summary className="warning">数据源限制与错误详情（{live.errors.length}项）</summary><p>更新失败的标的保留原始时间，较新的完整日线收盘价可作为备用展示。</p>{live.errors.map((e,i)=><p key={i}>{e}</p>)}</details>}</div>;
}

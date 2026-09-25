import {exposure} from './margin.mjs';
import {selectQuotes} from './quote-state.mjs';
const valid=n=>Number.isFinite(n)&&n>0;
export function monitor(account,live,now=Date.now()){
 if(!account)return null;let quoted=0,oldest=null;
 const quotes=selectQuotes(account.data?.assets||account.positions,[live.quotes||[]],now);
 const positions=account.positions.map(p=>{const q=quotes.find(q=>q.symbol===p.symbol),stamp=Date.parse(q?.at);const usable=q?.currency===p.currency&&valid(q.price)&&Number.isFinite(stamp)&&stamp<=now+1000&&now-stamp<=7*86400000;if(usable){quoted++;oldest=oldest==null?stamp:Math.min(oldest,stamp);}const fx=account.data?.fx?.[p.currency],fxAt=Date.parse(account.data?.fx?.date);const freshFx=valid(fx)&&fxAt<=now&&now-fxAt<=7*86400000;return {...p,markPrice:usable?q.price:p.markPrice,markFx:freshFx?fx:p.markFx,quoteMissing:!usable,quoteKind:q?.kind,fxStale:!freshFx};});
 const risk=exposure({...account,positions});const latest=account.snapshots?.filter(s=>s.complete).at(-1);const realized=account.trades.filter(t=>Number.isFinite(t.realizedPnl)).reduce((n,t)=>n+t.realizedPnl,0);return {...risk,positions,quoted,oldest,realized,unrealized:positions.reduce((n,p)=>n+p.quantity*p.markPrice*p.markFx-p.cost,0),connected:live.transport==='桌面行情采集'&&Number.isFinite(Date.parse(live.asOf))&&now-Date.parse(live.asOf)<120000,benchmarkSpread:latest?(latest.equity-latest.benchmark)/200000:null,benchmarkAt:latest?.at};
}

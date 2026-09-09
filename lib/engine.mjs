import {FUNDS} from './funds.mjs';
import {POLICY,exposure,accrue,buyingRoom,shortSignal,migrate} from './margin.mjs';
export const VERSION=POLICY.version;
const DAY=86400000;
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const valid=n=>Number.isFinite(n)&&n>0;
const fresh=(date,now,days=7)=>!!date&&Date.parse(date)<=Date.parse(now)&&Date.parse(now)-Date.parse(date)<=days*DAY;
const dayKey=now=>new Date(Date.parse(now)+8*3600000).toISOString().slice(0,10);
/** @returns {any} */
export function initialAccount(now){return {version:VERSION,createdAt:now,lastRun:null,paused:false,cash:200000,positions:[],orders:[],trades:[],journal:[],actions:[],snapshots:[{at:now,day:dayKey(now),equity:200000,cash:200000,benchmark:200000,complete:true}],benchmark:{cash:200000,positions:[]},data:null};}
export function parseFundamentals(json,now,source){
 const facts=json.facts?.['us-gaap']||{};const cutoff=now.slice(0,10);
 const records=(tags,unit,annual=true)=>tags.flatMap(tag=>(facts[tag]?.units?.[unit]||[])).filter(r=>r.filed<=cutoff&&r.end<=cutoff&&r.form==='10-K'&&(!annual||(r.start&&(Date.parse(r.end)-Date.parse(r.start))/DAY>=330&&(Date.parse(r.end)-Date.parse(r.start))/DAY<=380))).sort((a,b)=>b.end.localeCompare(a.end)||b.filed.localeCompare(a.filed));
 const revenues=records(['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],'USD');const r=revenues[0];if(!r)return null;
 const pick=(tags,unit='USD',annual=true)=>records(tags,unit,annual).find(x=>x.end===r.end)?.val??null;
 const prev=revenues.find(x=>Date.parse(r.end)-Date.parse(x.end)>300*DAY&&Date.parse(r.end)-Date.parse(x.end)<430*DAY);
 return {filed:r.filed,end:r.end,revenue:r.val,previousRevenue:prev?.val??null,income:pick(['NetIncomeLoss','ProfitLoss']),eps:pick(['EarningsPerShareDiluted'],'USD/shares'),assets:pick(['Assets'],'USD',false),liabilities:pick(['Liabilities'],'USD',false),source,checkedAt:now,accession:r.accn||null};
}
export function scoreAsset(a,now){
 if(a.cached)return {score:null,eligible:false,reason:'行情更新失败，仅保留缓存，不产生交易',factors:[]};
 const trend=valid(a.ma200)&&a.price>a.ma200;const momentum=Number.isFinite(a.momentum)&&a.momentum>0;
 if(!valid(a.price)||!fresh(a.quoteAt,now))return {score:null,eligible:false,reason:'行情缺失或超过 7 天',factors:[]};
 if(a.market==='CRYPTO'){const factors=[['价格高于200日均线',50,trend],['63日动量为正',30,momentum],['年化波动率低于80%',20,Number.isFinite(a.volatility)&&a.volatility<0.8]];const score=factors.reduce((s,f)=>s+(f[2]?f[1]:0),0);return {score,eligible:score>=80,reason:score>=80?'趋势条件达标；单币目标5%':'趋势未达标，继续观察',factors};}
 if(FUNDS.some(f=>f.symbol===a.symbol)&&a.market==='US'&&a.currency==='USD'){const factors=[['高于200日均线',40,trend],['63日动量为正',30,momentum],['年化波动率低于35%',30,Number.isFinite(a.volatility)&&a.volatility<.35]];const score=factors.reduce((n,f)=>n+(f[2]?f[1]:0),0);return {score,eligible:score===100,reason:score===100?'指数ETF趋势达标；目标15%，只做多':'指数ETF趋势或风险条件未达标',factors};}
 const f=a.fundamentals;
 if(!f||!fresh(f.filed,now,550)||!fresh(f.end,now,550)||!valid(f.revenue)||!Number.isFinite(f.income)||!Number.isFinite(f.eps))return {score:null,eligible:false,reason:'财报未核验或已过期，不自动买入',factors:[]};
 const growth=valid(f.previousRevenue)?f.revenue/f.previousRevenue-1:null;
 const pe=valid(f.eps)?a.price/f.eps:null;
 const factors=[['年度盈利为正',15,f.income>0],['营收同比增长',20,growth!==null&&growth>0],['净利率超过10%',10,f.income/f.revenue>0.1],['负债/资产低于70%',10,valid(f.assets)&&Number.isFinite(f.liabilities)&&f.liabilities/f.assets<0.7],['年报口径市盈率0–60倍',15,pe!==null&&pe>0&&pe<60],['63日动量为正',15,momentum],['价格高于200日均线',15,trend]];
 const score=factors.reduce((s,f)=>s+(f[2]?f[1]:0),0);const eligible=score>=70&&f.income>0&&growth!==null&&trend;
 return {score,eligible,reason:eligible?'财报与趋势达标；单股目标15%':'部分条件未达标，继续观察',factors,growth,pe,margin:f.income/f.revenue};
}
export function tradeFee(market,value,side){if(market==='US')return round(Math.max(1,value*0.0005));if(market==='HK')return round(Math.max(18,value*0.0008)+Math.ceil(value*0.001));if(market==='A')return round(Math.max(5,value*0.0003)+(side==='SELL'?value*0.0005:0));return round(value*0.001);}
export function valuation(state,data){let value=state.cash,fxEffect=0,complete=true;const positions=state.positions.map(p=>{const a=data?.assets?.find(x=>x.symbol===p.symbol);const rate=data?.fx?.[p.currency];const price=valid(a?.price)?a.price:p.markPrice;const fx=valid(rate)?rate:p.markFx;const stale=!a||a.cached||!fresh(a.quoteAt,data?.asOf)||!fresh(data?.fx?.date,data?.asOf);if(stale)complete=false;const marketValue=round(p.quantity*price*fx);fxEffect+=p.quantity*price*(fx-p.entryFx);value+=marketValue;return {...p,markPrice:price,markFx:fx,marketValue,pnl:round(marketValue-p.cost),stale};});return {equity:round(value),positions,fxEffect:round(fxEffect),complete};}
function nextBar(a,after,now){return a.bars?.find(b=>Date.parse(b.openAt)>Date.parse(after)&&Date.parse(b.closeAt)<=Date.parse(now)&&valid(b.close)&&b.volume>0);}
export function applyCycle(previous,data,now){
 const s=structuredClone(previous);migrate(s,now);if(!s.etfEnabledAt){s.etfEnabledAt=now;s.journal.push({at:now,day:dayKey(now),title:'扩展指数ETF范围',messages:['用户授权指数基金。SPY、QQQ、VTI按独立趋势规则评估，单只目标15%；保留原始本金、交易及融资费用。'],errors:[]});}s.data=data;s.lastRun=now;let entryMessages=[];const fxReady=fresh(data.fx?.date,now);let value=valuation(s,data);
 const actionPositions=[...s.positions.map(p=>({p,account:s})),...s.benchmark.positions.map(p=>({p,account:s.benchmark}))];
 for(const {p,account} of actionPositions){const a=[...data.assets,...(data.benchmarks||[])].find(x=>x.symbol===p.symbol);for(const action of [...(a?.actions||[])].sort((x,y)=>Date.parse(x.at)-Date.parse(y.at))){const id=(account===s?'portfolio:':'benchmark:')+p.symbol+':'+action.type+':'+action.at;if(s.actions.includes(id)||Date.parse(action.at)<=Date.parse(p.boughtAt)||Date.parse(action.at)>Date.parse(now))continue;if(action.type==='split'&&valid(action.ratio)){p.quantity*=action.ratio;p.entryPrice/=action.ratio;p.markPrice/=action.ratio;s.actions.push(id);}else if(action.type==='dividend'&&valid(action.amount)&&valid(data.fx?.[p.currency])&&fxReady){account.cash=round(account.cash+p.quantity*action.amount*data.fx[p.currency]);s.actions.push(id);entryMessages.push(p.symbol+' 税前股息计入现金（除息日近似）');}}}
 value=valuation(s,data);
 const executionTime=o=>Date.parse(nextBar(data.assets.find(a=>a.symbol===o.symbol)||{},o.createdAt,now)?.closeAt)||Infinity;
 for(const o of s.orders.filter(x=>x.status==='PENDING').sort((a,b)=>executionTime(a)-executionTime(b))){
  if(Date.parse(now)-Date.parse(o.createdAt)>10*DAY){o.status='EXPIRED';continue;}
  if(s.paused&&['BUY','SHORT'].includes(o.side)){o.status='CANCELLED';continue;}
  const a=data.assets.find(x=>x.symbol===o.symbol);if(!a||a.cached||!fxReady||!valid(data.fx[a.currency])||!fresh(a.quoteAt,now))continue;
  const b=nextBar(a,o.createdAt,now);if(!b)continue;
  if(Date.parse(b.closeAt)<Date.parse(s.financing.lastAt)){o.status='EXPIRED';entryMessages.push(a.symbol+' 成交时间早于已结息时点，计划失效，不回填');continue;}
  // Never backfill a missed execution more than 48h after its bar close.
  if(!fresh(b.closeAt,now,2)){o.status='EXPIRED';continue;}
  if((a.actions||[]).some(e=>Date.parse(e.at)>Date.parse(b.closeAt)&&Date.parse(e.at)<=Date.parse(now))){o.status='EXPIRED';entryMessages.push(a.name+' 期间发生公司行动，原计划失效并重新研究');continue;}
  accrue(s,b.closeAt);const fx=data.fx[a.currency];const opening=['BUY','SHORT'].includes(o.side),buying=['BUY','COVER'].includes(o.side);const price=b.close*(buying?1.001:0.999);let qty=0;let pos=s.positions.find(p=>p.symbol===o.symbol);
  if(opening){
   if(pos){o.status='CANCELLED';continue;}s.positions=valuation(s,data).positions;const budget=Math.min(o.budget,buyingRoom(s,o.side)*0.995);const lot=a.lot;
   qty=Math.floor(budget/(price*fx)/lot)*lot;qty=Number(qty.toFixed(8));
   while(qty>0&&(qty*price+tradeFee(a.market,qty*price,'BUY'))*fx>budget+0.00001)qty=Number((qty-lot).toFixed(8));
   if(qty<=0){o.status='CANCELLED';continue;}
  }else{if(!pos){o.status='CANCELLED';continue;}if((o.side==='SELL'&&pos.quantity<0)||(o.side==='COVER'&&pos.quantity>0)){o.status='CANCELLED';continue;}qty=Math.abs(pos.quantity);}
  const fee=tradeFee(a.market,qty*price,buying?'BUY':'SELL');const total=round((qty*price+(buying?fee:-fee))*fx);
  s.cash=round(s.cash+(buying?-total:total));
  if(opening){const sign=o.side==='SHORT'?-1:1;s.positions.push({symbol:a.symbol,name:a.name,market:a.market,currency:a.currency,quantity:qty*sign,cost:total*sign,entryPrice:price,entryFx:fx,markPrice:b.close,markFx:fx,boughtAt:b.closeAt,borrowAssumption:o.side==='SHORT'?'假设可借券，年费10%':null});}else{s.positions=s.positions.filter(p=>p.symbol!==a.symbol);}
  o.status='FILLED';o.filledAt=b.closeAt;s.trades.push({id:o.id,symbol:a.symbol,name:a.name,side:o.side,quantity:qty,price,fx,fxDate:data.fx.date,fee,feeCny:round(fee*fx),total,currency:a.currency,at:b.closeAt,recordedAt:now,reason:o.reason,source:a.source,realizedPnl:opening?null:round(o.side==='COVER'?-pos.cost-total:total-pos.cost)});entryMessages.push(a.name+' '+({BUY:'模拟买入',SELL:'模拟卖出',SHORT:'模拟卖空',COVER:'模拟回补'}[o.side])+' '+qty);value=valuation(s,data);
 }
 s.benchmark.pendingAfter??={};
 for(const a of (data.benchmarks||[])){
  if(a.cached||s.benchmark.positions.some(p=>p.symbol===a.symbol)||!fxReady||!valid(data.fx[a.currency]))continue;
  const b=nextBar(a,s.benchmark.pendingAfter[a.symbol]||s.createdAt,now);if(!b)continue;if(!fresh(b.closeAt,now,2)||(a.actions||[]).some(e=>Date.parse(e.at)>Date.parse(b.closeAt)&&Date.parse(e.at)<=Date.parse(now))){s.benchmark.pendingAfter[a.symbol]=now;entryMessages.push(a.name+' 基准因缺失数据延后到下一完整交易日建立');continue;}const allocation=200000*a.weight;const quantity=allocation/(b.close*data.fx[a.currency]);s.benchmark.cash=round(s.benchmark.cash-allocation);s.benchmark.positions.push({symbol:a.symbol,quantity,currency:a.currency,entryPrice:b.close,entryFx:data.fx[a.currency],markPrice:b.close,markFx:data.fx[a.currency],boughtAt:b.closeAt,cost:allocation});
 }
 const benchData={...data,assets:data.benchmarks||[]};const benchmarkValue=valuation({...s.benchmark},benchData);const benchValue=benchmarkValue.equity;s.benchmark.positions=benchmarkValue.positions;
 accrue(s,now);const current=valuation(s,data);s.positions=current.positions;const high=Math.max(200000,...s.snapshots.map(x=>x.equity));const drawdown=current.equity/high-1;
 for(const a of [...data.assets].sort((x,y)=>(scoreAsset(y,now).score??-1)-(scoreAsset(x,now).score??-1))){
  const score=scoreAsset(a,now);const p=current.positions.find(x=>x.symbol===a.symbol);if(s.orders.some(x=>x.symbol===a.symbol&&x.status==='PENDING'))continue;
  let side=null,reason=score.reason;
  const risk=exposure({...s,positions:current.positions});
  if(p&&!a.cached&&fresh(a.quoteAt,now)&&((valid(a.ma200)&&(p.quantity<0?a.price>a.ma200:a.price<a.ma200))||p.pnl/Math.abs(p.cost)<=-0.08||drawdown<=-0.1||risk.marginCall||risk.leverage>POLICY.maxGross||risk.shorts>risk.equity*POLICY.maxShort)){side=p.quantity<0?'COVER':'SELL';reason=risk.marginCall?'维持保证金不足，安排退出':risk.leverage>POLICY.maxGross||risk.shorts>risk.equity*POLICY.maxShort?'总敞口超限，安排减仓':drawdown<=-0.1?'组合回撤触发10%风控':'趋势反转或持仓亏损8%';}
  else if(!p&&current.complete&&!s.paused&&drawdown>-0.1&&fxReady&&!risk.marginCall){if(score.eligible)side='BUY';else if(shortSignal(a,now)){side='SHORT';reason='营收下降超过5%、年度亏损且63日动量低于-10%；假设可借券';}}
  if(!side)continue;const id=dayKey(now)+':'+a.symbol+':'+side;if(s.orders.some(x=>x.id===id))continue;
  const pending=s.orders.filter(x=>x.status==='PENDING'&&['BUY','SHORT'].includes(x.side)).reduce((sum,x)=>sum+x.budget,0);const budget=Math.max(0,Math.min(current.equity*(a.market==='CRYPTO'?0.05:side==='SHORT'?0.1:0.15),buyingRoom(s,side)-pending));if(['BUY','SHORT'].includes(side)&&budget<100)continue;
  s.orders.push({id,symbol:a.symbol,name:a.name,side,status:'PENDING',budget:round(budget),createdAt:now,reason,score:score.score,evidence:{quoteAt:a.quoteAt,filed:a.fundamentals?.filed??null,fxDate:data.fx?.date,factors:score.factors}});entryMessages.push(a.name+' '+(['BUY','SHORT'].includes(side)?'列入下一完整交易日开仓计划':'列入退出计划'));
 }
 const snapshot={at:now,day:dayKey(now),equity:current.equity,cash:s.cash,benchmark:benchValue,complete:current.complete&&benchmarkValue.complete,fxEffect:current.fxEffect};
 // Keep the opening point and the first daily observation immutable.
 if(!s.snapshots.some(x=>x.day===snapshot.day&&x.at!==s.createdAt))s.snapshots.push(snapshot);
 if(!s.journal.some(x=>x.day===dayKey(now))||entryMessages.length)s.journal.push({at:now,day:dayKey(now),title:entryMessages.length?'研究与交易记录':'保持观察',messages:entryMessages.length?entryMessages:['已检查观察名单；暂无新增符合条件的交易。'],errors:data.errors||[],eligible:data.assets.filter(a=>scoreAsset(a,now).eligible).length});
 return s;
}



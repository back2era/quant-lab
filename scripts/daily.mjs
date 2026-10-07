import {collectData} from '../lib/data.mjs';
import {validateSnapshot} from '../lib/ingest.mjs';
import {valuation} from '../lib/engine.mjs';
import {refreshQuotes} from '../lib/quote-client.mjs';
const origin=process.env.QUANT_SITE_URL,token=process.env.QUANT_SITE_TOKEN;
if(!origin||!token)throw Error('缺少本次运行的已授权站点连接信息');
const base=new URL(origin);if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))throw Error('站点必须使用HTTPS');
const headers={'OAI-Sites-Authorization':'Bearer '+token,'X-Quant-Write-Token':token,'Content-Type':'application/json',Origin:base.origin};
async function api(body){const r=await fetch(new URL('/api/account',base),{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});let j;try{j=await r.json();}catch{throw Error('站点未返回账户数据，请检查登录或连接');}if(!r.ok)throw Error(j.error||'账户更新失败 HTTP '+r.status);return j;}
const before=await api();
const snapshot=await collectData(before.state.data,new Date().toISOString(),[...before.state.positions.map(p=>p.symbol),...before.state.orders.filter(o=>o.status==='PENDING').map(o=>o.symbol),...(before.state.watchlist||[])]);
const data=validateSnapshot(snapshot,new Date().toISOString());
const result=await api({action:'ingest',data});
const saved=await api();if(saved.revision<result.revision)throw Error('账户持久化核对失败');
const s=saved.state,value=valuation(s,s.data);
let quoteSync;try{quoteSync=await refreshQuotes(s,origin,token);}catch(e){quoteSync={saved:false,error:e.message};}
console.log(JSON.stringify({saved:true,revision:saved.revision,lastRun:s.lastRun,equity:value.equity,cash:s.cash,pnl:Math.round((value.equity-200000)*100)/100,complete:value.complete,orders:s.orders.filter(o=>o.status==='PENDING').map(o=>({symbol:o.symbol,side:o.side,budget:o.budget,reason:o.reason})),newTrades:s.trades.filter(t=>!before.state.trades.some(old=>old.id===t.id)),freshSources:data.assets.filter(a=>a.price>0&&!a.cached).length,errors:data.errors,quoteSync},null,2));

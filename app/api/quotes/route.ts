import {readAccount,readQuotes,saveQuotes} from '../../../lib/store';
import {env} from 'cloudflare:workers';
import {canManage} from '../../../lib/access.mjs';
import {collectQuotes} from '../../../lib/live.mjs';
import {selectQuotes} from '../../../lib/quote-state.mjs';
export const dynamic='force-dynamic';
let cache:any=null,until=0,pending:Promise<any>|null=null;
const reply=(x:unknown,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store'}});
const desktopFresh=(s:any)=>s?.transport==='桌面行情采集'&&Date.now()-Date.parse(s.asOf)>=0&&Date.now()-Date.parse(s.asOf)<120000;
function view(state:any,s:any){return {...s,quotes:selectQuotes(state.data?.assets||[],[s?.quotes||[]])};}
export async function GET(request:Request){try{
 const [{state},stored]=await Promise.all([readAccount(),readQuotes()]);
 if(!await canManage(request,env))return reply(view(state,stored||{asOf:null,quotes:[],errors:['尚无已保存的行情快照，展示可用的原始收盘记录。'],transport:'已保存行情'}));
 if(desktopFresh(stored))return reply(view(state,stored));
 if(cache&&Date.now()<until&&Date.parse(cache.asOf)>=Date.parse(stored?.asOf||0))return reply(view(state,cache));
 if(stored?.transport==='网站公共来源'&&Date.now()-Date.parse(stored.asOf)<45000)return reply(view(state,stored));
 if(!pending)pending=(async()=>{
  const held=new Set(state.positions.map((p:any)=>p.symbol));
  const specs=[...(state.data?.assets||[])].sort((a:any,b:any)=>Number(held.has(b.symbol))-Number(held.has(a.symbol))).slice(0,120);
  const result=await collectQuotes(specs,{cooldowns:stored?.webCooldowns||{}});
  const latest=await readQuotes();if(desktopFresh(latest))return view(state,latest);
  cache={...result,quotes:selectQuotes(state.data?.assets||[],[result.quotes,latest?.quotes||[],stored?.quotes||[]]),transport:'网站公共来源',webCooldowns:result.cooldowns,desktopAsOf:latest?.desktopAsOf||(latest?.transport==='桌面行情采集'?latest.asOf:null),errors:['桌面行情采集待更新；当前尝试网站来源，失败时使用原时间的收盘价或缓存。',...result.errors]};
  await saveQuotes(cache);until=Date.now()+45000;return cache;
 })().finally(()=>{pending=null;});
 return reply(await pending);
 }catch{return reply({error:'最新行情暂不可用'},503);}}
export async function POST(request:Request){
 if(!await canManage(request,env))return reply({error:'公开行情为只读，写入需要所有者或采集程序授权。'},403);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'来源无效'},403);
 try{
  const text=await request.text();if(text.length>200000)return reply({error:'报价过大'},413);
  const j=JSON.parse(text),at=Date.parse(j.asOf);
  if(!Number.isFinite(at)||at>Date.now()+1000||Date.now()-at>120000||!Array.isArray(j.quotes)||j.quotes.length>200||!Array.isArray(j.errors||[]))throw Error('报价时间或数量无效');
  const {state}=await readAccount();const specs=new Map((state.data?.assets||[]).map((a:any)=>[a.symbol,a.currency]));
  const qs=j.quotes.map((q:any)=>{
   if(!specs.has(q.symbol)||specs.get(q.symbol)!==q.currency||!(q.price>0)||!Number.isFinite(q.price)||!Number.isFinite(Date.parse(q.at))||Date.parse(q.at)>at+1000)throw Error('报价无效');
   return {symbol:q.symbol,price:q.price,at:q.at,currency:q.currency,kind:'trade',source:q.source==='Coinbase 现货'?'Coinbase 现货':'Yahoo · 可能延迟',...(q.closePrice>0&&Number.isFinite(q.closePrice)&&Date.parse(q.closeAt)<=at?{closePrice:q.closePrice,closeAt:q.closeAt}:{})};
  });
  const previous=await readQuotes();
  const value={asOf:j.asOf,desktopAsOf:j.asOf,mode:j.mode==='snapshot'?'snapshot':'continuous',quotes:selectQuotes(state.data?.assets||[],[qs,previous?.quotes||[]]),errors:(j.errors||[]).slice(0,200).map((x:unknown)=>String(x).slice(0,200)),transport:'桌面行情采集',webCooldowns:previous?.webCooldowns||{}};
  await saveQuotes(value);cache=null;until=0;return reply({saved:true,count:qs.length,asOf:j.asOf});
 }catch(e){return reply({error:e instanceof Error?e.message:'无效报价'},400);}}

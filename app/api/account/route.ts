import {normalizeSpec} from '../../../lib/symbols.mjs';
import {env} from 'cloudflare:workers';
import {canManage} from '../../../lib/access.mjs';
import { readAccount, saveAccount } from '../../../lib/store';
import { applyCycle } from '../../../lib/engine.mjs';
import { collectData } from '../../../lib/data.mjs';
import { validateSnapshot } from '../../../lib/ingest.mjs';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){try{return reply({...await readAccount(),canManage:await canManage(request,env)});}catch(e){return reply({error:e instanceof Error?e.message:'读取失败'},503);}}
export async function POST(request:Request){
 if(!await canManage(request,env))return reply({error:'公开展示为只读，只有账户所有者或授权采集程序可以更新。'},403);
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return reply({error:'请求来源无效'},403);
 try{const text=await request.text();if(text.length>6000000)return reply({error:'数据超过大小限制'},413);const body=JSON.parse(text);const {action}=body;if(!['run','pause','resume','ingest','watch'].includes(action))return reply({error:'未知操作'},400);const {state,revision}=await readAccount();
 if(action==='watch'){const spec=normalizeSpec({symbol:body.symbol});state.watchlist??=[];if(state.watchlist.length>=50)return reply({error:'自选上限50个'},400);if(!state.watchlist.includes(spec.symbol))state.watchlist.push(spec.symbol);await saveAccount(state,revision);return reply({state,revision:revision+1});}
 if(action==='ingest'){const now=new Date().toISOString();let data;try{data=validateSnapshot(body.data,now);}catch(e){return reply({error:e instanceof Error?e.message:'采集数据无效'},400);}if(state.lastRun&&Date.parse(data.asOf)<=Date.parse(state.lastRun))return reply({state,revision,unchanged:true});const next=applyCycle(state,data,now);await saveAccount(next,revision);return reply({state:next,revision:revision+1});}
 if(action==='run'){if(state.lastRun&&Date.now()-Date.parse(state.lastRun)<60000)return reply({error:'刚刚完成更新，请一分钟后再试。'},429);const data=await collectData(state.data,new Date().toISOString(),[...state.positions.map((p:any)=>p.symbol),...state.orders.filter((o:any)=>o.status==='PENDING').map((o:any)=>o.symbol),...(state.watchlist||[])]);const next=applyCycle(state,data,new Date().toISOString());await saveAccount(next,revision);return reply({state:next,revision:revision+1});}
 state.paused=action==='pause';if(state.paused)for(const o of state.orders)if(['BUY','SHORT'].includes(o.side)&&o.status==='PENDING')o.status='CANCELLED';state.journal.push({at:new Date().toISOString(),day:new Date().toISOString().slice(0,10),title:state.paused?'暂停新增买入':'恢复新增买入',messages:['用户操作；现有持仓仍继续估值与风险检查。'],errors:[]});await saveAccount(state,revision);return reply({state,revision:revision+1});
 }catch(e){return reply({error:e instanceof Error?e.message:'更新失败，账本未变更'},500);}
}


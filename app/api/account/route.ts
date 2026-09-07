import { readAccount, saveAccount } from '../../../lib/store';
import { applyCycle } from '../../../lib/engine.mjs';
import { collectData } from '../../../lib/data.mjs';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){try{return reply(await readAccount());}catch(e){return reply({error:e instanceof Error?e.message:'读取失败'},503);}}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return reply({error:'请求来源无效'},403);
 try{const {action}=await request.json() as {action:string};if(!['run','pause','resume'].includes(action))return reply({error:'未知操作'},400);const {state,revision}=await readAccount();
 if(action==='run'){if(state.lastRun&&Date.now()-Date.parse(state.lastRun)<60000)return reply({error:'刚刚完成更新，请一分钟后再试。'},429);const data=await collectData(state.data);const next=applyCycle(state,data,new Date().toISOString());await saveAccount(next,revision);return reply({state:next,revision:revision+1});}
 state.paused=action==='pause';if(state.paused)for(const o of state.orders)if(o.side==='BUY'&&o.status==='PENDING')o.status='CANCELLED';state.journal.push({at:new Date().toISOString(),day:new Date().toISOString().slice(0,10),title:state.paused?'暂停新增买入':'恢复新增买入',messages:['用户操作；现有持仓仍继续估值与风险检查。'],errors:[]});await saveAccount(state,revision);return reply({state,revision:revision+1});
 }catch(e){return reply({error:e instanceof Error?e.message:'更新失败，账本未变更'},500);}
}


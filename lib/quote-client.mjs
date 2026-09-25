import {collectQuotes} from './live.mjs';
// Quote-only refresh. Never calls the account ingestion or trading endpoint.
export async function refreshQuotes(state,origin,token,{mode='snapshot',cooldowns={}}={}){
 const held=new Set(state.positions.map(p=>p.symbol));
 const specs=[...(state.data?.assets||[])].sort((a,b)=>Number(held.has(b.symbol))-Number(held.has(a.symbol)));
 const value=await collectQuotes(specs,{cooldowns});
 const headers={'OAI-Sites-Authorization':'Bearer '+token,Origin:new URL(origin).origin,'Content-Type':'application/json'};
 const posted=await fetch(new URL('/api/quotes',origin),{method:'POST',headers,body:JSON.stringify({...value,mode}),signal:AbortSignal.timeout(30000)});
 if(!posted.ok)throw Error('报价保存失败 HTTP '+posted.status);
 const read=await fetch(new URL('/api/quotes',origin),{headers,signal:AbortSignal.timeout(30000)});
 if(!read.ok)throw Error('报价读回失败 HTTP '+read.status);
 const saved=await read.json();
 if(Date.parse(saved.asOf)<Date.parse(value.asOf)||value.quotes.some(q=>!saved.quotes.some(s=>s.symbol===q.symbol&&Date.parse(s.at)>=Date.parse(q.at))))throw Error('报价读回核验失败');
 return {saved:true,asOf:value.asOf,count:value.quotes.length,errors:value.errors,cooldowns:value.cooldowns};
}

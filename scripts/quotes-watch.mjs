import {refreshQuotes} from '../lib/quote-client.mjs';
const origin=process.env.QUANT_SITE_URL,token=process.env.QUANT_SITE_TOKEN;
if(!origin||!token)throw Error('Missing authorized quote connection');
const headers={'OAI-Sites-Authorization':'Bearer '+token,Origin:new URL(origin).origin,'Content-Type':'application/json'};
let stopped=false,cooldowns={};process.on('SIGTERM',()=>{stopped=true});
while(!stopped){try{const r=await fetch(origin+'/api/account',{headers,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Account HTTP '+r.status);const {state}=await r.json();const value=await refreshQuotes(state,origin,token,{cooldowns,mode:process.argv.includes('--once')?'snapshot':'continuous'});cooldowns=value.cooldowns;console.log(JSON.stringify(value));}catch(e){console.error(new Date().toISOString(),e.message);if(process.argv.includes('--once'))process.exitCode=1;}if(process.argv.includes('--once'))break;await new Promise(resolve=>setTimeout(resolve,60000));}

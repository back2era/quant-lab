import {collectQuotes} from '../lib/live.mjs';
const origin=process.env.QUANT_SITE_URL,token=process.env.QUANT_SITE_TOKEN;
if(!origin||!token)throw Error('Missing authorized quote connection');
const headers={'OAI-Sites-Authorization':'Bearer '+token,Origin:new URL(origin).origin,'Content-Type':'application/json'};
let stopped=false;process.on('SIGTERM',()=>{stopped=true});
while(!stopped){try{const r=await fetch(origin+'/api/account',{headers,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Account HTTP '+r.status);const {state}=await r.json();const value=await collectQuotes(state.data?.assets||[]);const posted=await fetch(origin+'/api/quotes',{method:'POST',headers,body:JSON.stringify(value),signal:AbortSignal.timeout(30000)});if(!posted.ok)throw Error('Quote write HTTP '+posted.status);console.log(JSON.stringify({at:value.asOf,quotes:value.quotes.length,errors:value.errors}));}catch(e){console.error(new Date().toISOString(),e.message)}if(process.argv.includes('--once'))break;await new Promise(resolve=>setTimeout(resolve,60000));}

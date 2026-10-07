// Sites dispatch supplies and protects these identity headers. Never trust them
// when deploying behind a different proxy without equivalent header sanitizing.
export async function canManage(request,config={}){
 const owner=String(config.QUANT_OWNER_EMAIL||'').trim().toLowerCase();
 const id=request.headers.get('oai-authenticated-user-id');
 const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
 if(owner&&id&&email===owner)return true;
 const expected=String(config.QUANT_SERVICE_TOKEN_SHA256||'');
 const token=request.headers.get('x-quant-write-token');
 if(!/^[a-f0-9]{64}$/.test(expected)||!token||token.length>4096)return false;
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
 const actual=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 let difference=0;for(let i=0;i<64;i++)difference|=actual.charCodeAt(i)^expected.charCodeAt(i);
 return difference===0;
}

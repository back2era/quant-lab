import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canManage} from '../lib/access.mjs';

const token='test-service-token-for-authorized-collector';
const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
const config={QUANT_OWNER_EMAIL:'owner@example.test',QUANT_SERVICE_TOKEN_SHA256:hash};
const request=headers=>new Request('https://example.test/api/account',{headers});

test('anonymous visitors and missing configuration cannot manage the public account',async()=>{
 assert.equal(await canManage(request({}),config),false);
 assert.equal(await canManage(request({'x-quant-write-token':token}),{}),false);
 assert.equal(await canManage(request({'x-quant-write-token':token}),{QUANT_SERVICE_TOKEN_SHA256:'invalid'}),false);
});
test('only the configured owner with dispatcher identity can manage in a browser',async()=>{
 assert.equal(await canManage(request({'oai-authenticated-user-id':'owner-id','oai-authenticated-user-email':'owner@example.test'}),config),true);
 assert.equal(await canManage(request({'oai-authenticated-user-id':'other-id','oai-authenticated-user-email':'visitor@example.test'}),config),false);
 assert.equal(await canManage(request({'oai-authenticated-user-email':'owner@example.test'}),config),false);
});
test('collector writes require the correct application token, not a gateway header',async()=>{
 assert.equal(await canManage(request({'x-quant-write-token':token}),config),true);
 assert.equal(await canManage(request({'x-quant-write-token':'wrong-token'}),config),false);
 assert.equal(await canManage(request({'OAI-Sites-Authorization':'Bearer '+token}),config),false);
});

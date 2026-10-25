import test from 'node:test';
import assert from 'node:assert/strict';
import {completeAuthSession} from '../lib/authCallback.js';
const session={access_token:'isolated-test-token',user:{id:'local-user'}};
test('auth callbacks retain sessions already consumed by automatic URL detection',async()=>{
 let exchanges=0;const auth={getSession:async()=>({data:{session},error:null}),exchangeCodeForSession:async()=>{exchanges++;throw Error('Code was already consumed');}};
 assert.equal(await completeAuthSession(auth,'https://site.test/auth/callback?code=one-time',()=> 'https://site.test/auth/callback'),session);assert.equal(exchanges,0);
});
test('a remaining code is exchanged even if a different account already has a session',async()=>{
 let exchanges=0;const auth={getSession:async()=>({data:{session:{access_token:'old',user:{id:'old-user'}}}}),exchangeCodeForSession:async code=>{assert.equal(code,'fresh');exchanges++;return {data:{session}};}};
 assert.equal(await completeAuthSession(auth,'https://site.test/update-password?code=fresh'),session);assert.equal(exchanges,1);
});
test('expired auth links and missing sessions never count as successful recovery',async()=>{
 const auth={getSession:async()=>({data:{session:null}}),exchangeCodeForSession:async()=>({error:Error('Expired')})};
 for(const href of ['https://site.test/auth/callback?error=expired','https://site.test/update-password#error=expired','https://site.test/update-password','https://site.test/auth/callback?code=expired'])await assert.rejects(completeAuthSession(auth,href));
});

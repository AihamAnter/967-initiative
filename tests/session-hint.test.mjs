import test from 'node:test';
import assert from 'node:assert/strict';
import {authStorageKey,browserSessionMayExist} from '../lib/sessionHint.js';
test('anonymous reading skips the account SDK while stored sessions and callback links activate it',()=>{
 const url='https://project.supabase.co',empty={getItem:()=>null};
 assert.equal(authStorageKey(url),'sb-project-auth-token');
 assert.equal(authStorageKey('http://127.0.0.1:3439'),'sb-127-auth-token');
 assert.equal(browserSessionMayExist(url,empty,'https://site.test/works'),false);
 assert.equal(browserSessionMayExist(url,{getItem:key=>key==='sb-project-auth-token'?'stored':null},'https://site.test/'),true);
 for(const href of ['https://site.test/auth/callback?code=local','https://site.test/update-password#access_token=local'])assert.equal(browserSessionMayExist(url,empty,href),true);
 assert.equal(browserSessionMayExist(url,{getItem:()=>{throw Error('Storage denied');}},'https://site.test/'),true);
});

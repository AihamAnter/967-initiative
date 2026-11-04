import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {safeMessagingQuery,isMessageRead} from '../lib/privateMessaging.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const a='30000000-0000-4000-8000-000000000001';
const b='30000000-0000-4000-8000-000000000002';

test('read receipt shows two checks only after a partner reads an owned message',()=>{
 const message={sender_id:a,created_at:'2026-11-04T10:22:00Z'};
 assert.equal(isMessageRead(message,a,'2026-11-04T10:22:00Z'),true);
 assert.equal(isMessageRead(message,a,'2026-11-04T10:22:00+00:00'),true);
 assert.equal(isMessageRead(message,a,'2026-11-04T10:21:59Z'),false);
 assert.equal(isMessageRead(message,b,'2026-11-04T10:23:00Z'),false);
 assert.equal(isMessageRead(message,a,null),false);
 assert.equal(isMessageRead(message,a,'invalid'),false);
});

test('search and receipt modes require authorized conversation identifiers',()=>{
 assert.equal(safeMessagingQuery(new URLSearchParams('mode=thread-search&id='+a+'&q=رسالة')).q,'رسالة');
 assert.equal(safeMessagingQuery(new URLSearchParams('mode=receipt&id='+a)).mode,'receipt');
 assert.throws(()=>safeMessagingQuery(new URLSearchParams('mode=thread-search&id=invalid&q=abc')),/المحادثة/);
 assert.throws(()=>safeMessagingQuery(new URLSearchParams('mode=receipt&id=invalid')),/المحادثة/);
 assert.equal(safeMessagingQuery(new URLSearchParams('mode=thread-search&id='+a+'&q=abc&before=2026-11-04T10%3A20%3A00%2B00%3A00')).before,'2026-11-04T10:20:00+00:00');
 assert.equal(safeMessagingQuery(new URLSearchParams('mode=thread&id='+a+'&before=2026-11-04T10:20:00Z')).mode,'thread');
 assert.throws(()=>safeMessagingQuery(new URLSearchParams('mode=receipt&id='+a+'&before=2026-11-04T10:20:00Z')),/غير مدعوم/);
 assert.equal(safeMessagingQuery(new URLSearchParams('mode=thread-search&id='+a+'&q=%25test%5F')).q,'test');
});

test('backend search checks membership, excludes deleted messages and supports pagination',()=>{
 const api=read('app/api/messages/route.js'),ui=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 assert.match(api,/async function searchThread\(db,actor,conversation,term,before\)\{\s*await conversationForParticipant/);
 assert.match(api,/\.eq\('conversation_id',conversation\)\.is\('deleted_at',null\)/);
 assert.match(api,/\.limit\(MESSAGE_SEARCH_PAGE_SIZE\+1\)/);
 assert.match(api,/if\(mode==='receipt'\)return json\(await readReceipt/);
 assert.match(api,/partner_last_read_at:await partnerReadAt/);
 assert.match(ui,/mode=thread-search&id=/);
 assert.match(ui,/mode=receipt&id=/);
 assert.match(ui,/threadSearchHits\.map\(message=>/);
 assert.match(ui,/onClick=\{\(\)=>showSearchResult\(message\)\}/);
 assert.match(ui,/onClick=\{loadMoreThreadSearch\}/);
 assert.match(ui,/isMessageRead\(entry\.message,user\.id,thread\.partner_last_read_at\)/);
 assert.match(css,/\.threadSearch\{display:flex;/);
 assert.match(css,/\.deliveryStatus\[data-read=true\]/);
});

test('search and receipt endpoints never grant direct access to private conversations',()=>{
 const api=read('app/api/messages/route.js');
 assert.match(api,/const \{db,user\}=await authorized\(request\)/);
 assert.match(api,/if\(!c\|\|!\[c\.user_low,c\.user_high\]\.includes\(actor\)\)/);
 assert.match(api,/async function partnerReadAt\(db,conversation,partnerId\)/);
 assert.match(api,/\.eq\('conversation_id',conversation\)/);
 assert.doesNotMatch(api,/\.from\('private_messages'\)\.update\(/);
});

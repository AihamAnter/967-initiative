import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMessageTimeline,firstVisibleUnreadIndex} from '../lib/messageTimeline.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const msg=(id,at,sender)=>({id,created_at:at,sender_id:sender,body:id});
const early=msg('early','2026-11-03T08:00:00Z','a');
const own=msg('own','2026-11-03T08:05:00Z','a');
const first=msg('first','2026-11-03T08:10:00Z','b');
const newer=msg('newer','2026-11-03T08:15:00Z','b');
const nextDay=msg('next','2026-11-04T09:00:00Z','b');
const marker={id:'first',created_at:first.created_at};
const rows=(messages,unread)=>buildMessageTimeline(messages,unread);

test('no unread marker means only normal date and message rows',()=>{
 assert.deepEqual(rows([early,own],null).map(row=>row.kind),['day','message','message']);
 assert.deepEqual(rows([],marker),[]);
 assert.equal(firstVisibleUnreadIndex([],marker),-1);
});

test('only one unread separator appears directly before the first unread message',()=>{
 const timeline=rows([early,own,first,newer],marker);
 assert.deepEqual(timeline.map(row=>row.kind),['day','message','message','unread','message','message']);
 assert.equal(timeline.filter(row=>row.kind==='unread').length,1);
 assert.equal(timeline.find(row=>row.kind==='unread').label,'رسائل جديدة');
 assert.equal(timeline[timeline.findIndex(row=>row.kind==='unread')+1].message.id,first.id);
});

test('the date divider remains before the unread line on a new day',()=>{
 const dated=msg('dated','2026-11-04T09:01:00Z','b');
 const timeline=rows([early,nextDay,dated],{id:'next',created_at:nextDay.created_at});
 assert.deepEqual(timeline.map(row=>row.kind),['day','message','day','unread','message','message']);
 assert.equal(timeline.find(row=>row.kind==='unread').key,'unread:next');
});

test('opening a long unread thread shows one provisional separator in recent messages',()=>{
 const visible=[msg('recent1','2026-11-03T10:00:00Z','b'),msg('recent2','2026-11-03T10:05:00Z','b')];
 const timeline=rows(visible,marker);
 assert.deepEqual(timeline.map(row=>row.kind),['day','unread','message','message']);
 assert.equal(firstVisibleUnreadIndex(visible,marker),0);
});

test('loading older messages moves the same separator to its exact location',()=>{
 const recent=[msg('recent1','2026-11-03T10:00:00Z','b'),msg('recent2','2026-11-03T10:05:00Z','b')];
 const expanded=rows([own,first,newer,...recent],marker);
 const markerPos=expanded.findIndex(row=>row.kind==='unread');
 assert.equal(expanded[markerPos+1].message.id,'first');
 assert.equal(expanded.filter(row=>row.kind==='unread').length,1);
});

test('viewing an older historical page cannot create a false unread divider',()=>{
 const prior=[early,own];
 assert.equal(firstVisibleUnreadIndex(prior,marker),-1);
 assert.equal(rows(prior,marker).filter(row=>row.kind==='unread').length,0);
 assert.equal(rows([early,own,first],{id:'missing',created_at:'invalid'}).filter(row=>row.kind==='unread').length,0);
});

test('the API captures the first incoming unread BEFORE the thread is marked read',()=>{
 const source=read('app/api/messages/route.js');
 const ui=read('components/messages/PrivateMessaging.jsx');
 assert.match(source,/async function firstUnreadMessage\(db,actor,conversation\)/);
 assert.match(source,/\.eq\('conversation_id',conversation\)\.neq\('sender_id',actor\)/);
 assert.match(source,/\.gt\('created_at',lastRead\)/);
 assert.match(source,/\.order\('created_at',\{ascending:true\}\)/);
 assert.match(source,/first_unread_message:before\|\|around\?null:await firstUnreadMessage/);
 assert.match(ui,/message:data\.first_unread_message\|\|null/);
 assert.ok(ui.indexOf('message:data.first_unread_message||null')<ui.indexOf("await request('',{action:'read',conversation:id})"));
});

test('the divider persists through read-refreshes and supports an accessible latest button',()=>{
 const ui=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 assert.match(ui,/unreadMarkerRef\.current\.conversation===id&&!unreadMarkerRef\.current\.initialized/);
 assert.match(ui,/buildMessageTimeline\(thread\.messages,unreadMarkerRef\.current\.message\)\.map/);
 assert.match(ui,/data-unread-separator role="separator" aria-label="رسائل جديدة"/);
 assert.match(ui,/box\.querySelector\('\[data-unread-separator\]'\)/);
 assert.match(ui,/onScroll=\{updateLatestJump\}/);
 assert.match(ui,/\(historical\|\|showLatestJump\)&&<button/);
 assert.match(ui,/scrollToLatestRequestedRef\.current=true/);
 assert.match(css,/\.unreadSeparator\{display:flex;/);
 assert.match(css,/\.unreadSeparator::before,\.unreadSeparator::after/);
 assert.match(css,/@media\(max-width:680px\)\{[\s\S]*?\.unreadSeparator/);
});

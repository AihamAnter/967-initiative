import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMessageTimeline,messageClock,messageDayKey,messageDayLabel} from '../lib/messageTimeline.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('individual messages show a 24-hour time without a full date',()=>{
 const value='2026-11-03T07:02:00';
 assert.equal(messageClock(value),'07:02');
 assert.doesNotMatch(messageClock(value),/2026|نوفمبر|ص|م/);
 assert.ok(messageDayLabel(value).includes('نوفمبر'));
 assert.equal(messageClock('not-a-date'),'');
});

test('day dividers appear only before the first message on each local day',()=>{
 const messages=[
  {id:'a',created_at:'2026-11-02T23:59:00'},
  {id:'b',created_at:'2026-11-03T00:01:00'},
  {id:'c',created_at:'2026-11-03T07:02:00'},
  {id:'d',created_at:'2026-11-04T08:30:00'}
 ];
 const timeline=buildMessageTimeline(messages);
 assert.deepEqual(timeline.map(row=>row.kind),['day','message','day','message','message','day','message']);
 assert.deepEqual(timeline.filter(row=>row.kind==='day').map(row=>row.day),['2026-11-02','2026-11-03','2026-11-04']);
 assert.equal(timeline[4].message.body,undefined);
 assert.equal(messageDayKey('2026-11-03T07:02:00'),'2026-11-03');
 assert.deepEqual(buildMessageTimeline([]),[]);
});

test('prepending older messages retains one divider per day',()=>{
 const newer=[{id:'b',created_at:'2026-11-03T13:00:00'},{id:'c',created_at:'2026-11-03T14:00:00'}];
 const old=[{id:'a',created_at:'2026-11-03T11:00:00'}];
 assert.equal(buildMessageTimeline([...old,...newer]).filter(x=>x.kind==='day').length,1);
});

test('rendering retains the existing 14px message text and 10px muted time',()=>{
 const ui=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 assert.match(ui,/buildMessageTimeline\(thread\.messages,unreadMarkerRef\.current\.message\)\.map/);
 assert.match(ui,/className=\{styles\.daySeparator\}/);
 assert.match(ui,/messageClock\(entry\.message\.created_at\)/);
 assert.match(ui,/\{entry\.message\.deleted_at\?'حذفت الرسالة':entry\.message\.body\}\<\/p\>/);
 assert.match(css,/\.bubbleContent p\{[^}]*font-size:14px;line-height:1\.85/);
 assert.match(css,/\.bubbleContent time\{[^}]*color:var\(--muted\);font-size:10px/);
 assert.match(ui,/message:entry\.message\.id/);
 assert.match(ui,/تحميل رسائل أقدم/);
});

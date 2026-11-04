import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 DEFAULT_NOTIFICATION_PREFERENCES,NOTIFICATION_PREFERENCE_KEYS,normalizeNotificationPreferences,
 isNotificationEnabled,groupSimilarNotices,validNotificationIds,
 accountNotice,taskNotice,conversationNotice
} from '../lib/unifiedNotifications.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const a='30000000-0000-4000-8000-000000000001';
const b='30000000-0000-4000-8000-000000000002';
const c='30000000-0000-4000-8000-000000000003';
const t1='2026-11-04T09:00:00Z',t2='2026-11-04T10:00:00Z',t3='2026-11-04T11:00:00Z';
const task=(id,kind,when,task_id=a,read_at=null)=>
 taskNotice({id,task_id,kind,created_at:when,read_at},'تجهيز حلقة مناظرة');
const debate=(id,when,parent=b,read_at=null)=>
 accountNotice({id,kind:'reply',href:'/debates/example#comment-'+id,
  title:'رد جديد على تعليقك',created_at:when,read_at,reply_parent:parent});
test('settings default to enabled, while missing account rows are handled',()=>{
 assert.deepEqual(normalizeNotificationPreferences(null,null),DEFAULT_NOTIFICATION_PREFERENCES);
 assert.deepEqual(NOTIFICATION_PREFERENCE_KEYS,['messages','tasks','replies','debates','new_debates']);
 assert.deepEqual(normalizeNotificationPreferences(
  {notify_tasks:false,notify_replies:false,notify_moderation:true},{notify_messages:false}),
  {messages:false,tasks:false,replies:false,debates:true,new_debates:false});
});
test('security/system updates remain visible regardless of any preference',()=>{
 const prefs={messages:false,tasks:false,replies:false,debates:false};
 const system=accountNotice({id:a,kind:'system',href:'/account',title:'تنبيه الحساب',created_at:t3});
 assert.equal(isNotificationEnabled(system,prefs),true);
 assert.equal(isNotificationEnabled(task(1,'assignment',t1),prefs),false);
 assert.equal(isNotificationEnabled(debate(a,t2),prefs),false);
 assert.equal(isNotificationEnabled(accountNotice({id:b,kind:'moderation',created_at:t1}),prefs),false);
 assert.equal(isNotificationEnabled(conversationNotice({id:a,partner_name:'A',status:'accepted',unread:1},b),prefs),false);
});
test('three task discussion updates on the same day become one group with all IDs',()=>{
 const grouped=groupSimilarNotices([
  task(101,'comment',t1),task(102,'reply',t2),task(103,'comment',t3),
  task(104,'review',t3)
 ]);
 assert.equal(grouped.length,2);
 assert.equal(grouped[0].group_count,3);
 assert.deepEqual(grouped[0].source_ids,['103','102','101']);
 assert.equal(grouped[0].unread,true);
 assert.match(grouped[0].title,/3 تحديثات/);
 assert.equal(grouped[1].kind,'review');
 assert.deepEqual(grouped[1].source_ids,['104']);
});
test('task replies from other tasks or days are not accidentally merged',()=>{
 const results=groupSimilarNotices([
  task(1,'comment','2026-11-03T23:59:00Z'),
  task(2,'reply',t1),
  task(3,'comment',t2,c),
 ]);
 assert.equal(results.length,3);
 assert.equal(results.every(n=>n.group_count===1),true);
});
test('debate replies group by the verified parent, never just the debate slug',()=>{
 const results=groupSimilarNotices([
  debate(a,t1,b),debate(b,t2,b),debate(c,t3,c),
 ]);
 assert.equal(results.length,2);
 const bundle=results.find(n=>n.group_count===2);
 assert.ok(bundle);assert.deepEqual(bundle.source_ids,[b,a]);
 assert.equal(results.find(n=>n.reply_parent===c).group_count,1);
 const unresolved=groupSimilarNotices([debate(a,t1,null),debate(b,t2,null)]);
 assert.equal(unresolved.length,2);
});
test('group remains grouped when all its events become read',()=>{
 const grouped=groupSimilarNotices([
  task(1,'comment',t1,a,t3),task(2,'reply',t2,a,t3)
 ]);
 assert.equal(grouped.length,1);
 assert.equal(grouped[0].unread,false);
 assert.equal(grouped[0].group_count,2);
});
test('batch mark-read only accepts ids of one known source',()=>{
 assert.equal(validNotificationIds('task',['1','2']),true);
 assert.equal(validNotificationIds('account',[a,b]),true);
 assert.equal(validNotificationIds('account',[a,a]),false);
 assert.equal(validNotificationIds('task',['2','2']),false);
 assert.equal(validNotificationIds('task',['2',b]),false);
 assert.equal(validNotificationIds('message',[a]),false);
 assert.equal(validNotificationIds('task',[]),false);
 assert.equal(validNotificationIds('task',new Array(502).fill('1')),false);
});
test('server routes apply filters before counting, persist existing settings and protect message read states',()=>{
 const api=read('app/api/notifications/route.js');
 const prefs=read('supabase/migrations/20261104193429_unified_notification_task_preference.sql');
 assert.match(prefs,/add column if not exists notify_tasks boolean not null default true/);
 assert.match(api,/notify_replies,notify_moderation,notify_tasks/);
 assert.match(api,/private_messaging_settings/);
 assert.match(api,/accountQuery\(db,user\.id,category,SOURCE_LIMIT,prefs\)/);
 assert.match(api,/taskQuery\(db,user\.id,category,SOURCE_LIMIT,prefs\)/);
 assert.match(api,/groupSimilarNotices\(\[/);
 assert.match(api,/const count=entries\.filter\(notice=>notice\.unread\)\.length/);
 assert.match(api,/\.eq\('user_id',user\.id\)\.in\('id',ids\)\.is\('read_at',null\)/);
 assert.match(api,/if\(body\.action==='preference'\)/);
 assert.match(api,/if\(body\.action==='read_all'\)/);
 assert.doesNotMatch(api,/\.from\('private_messages'\)\.update/);
});
test('settings UI supports four toggles and accessible, responsive feedback',()=>{
 const center=read('components/notifications/NotificationCenter.jsx');
 const css=read('components/notifications/Notifications.module.css');
 const client=read('components/notifications/notificationClient.js');
 const bell=read('components/notifications/NotificationBell.jsx');
 assert.match(center,/const preferenceRows=\[/);
 assert.match(center,/id="notification-settings"/);
 assert.match(center,/type="checkbox"/);
 assert.match(center,/role="status">\{savedMessage\}/);
 assert.match(css,/\.preferenceRows\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.preferenceRows\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(client,/action:'preference'/);
 assert.match(client,/action:'read',source,id,ids/);
 assert.match(bell,/markNotification\(item\.source,item\.source_id,item\.source_ids\)/);
 assert.match(center,/markNotification\(item\.source,item\.source_id,item\.source_ids\)/);
});

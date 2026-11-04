import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eligibleForDebateReminder} from '../lib/debateNotificationRules.js';
import {accountNotice,normalizeNotificationPreferences,isNotificationEnabled} from '../lib/unifiedNotifications.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const now=Date.parse('2026-11-05T12:00:00Z');
const future='2026-11-06T12:00:00Z';
const live={debate_type:'external_live',publication_status:'published',stage:'upcoming',scheduled_at:future};
const recorded={debate_type:'prerecorded',publication_status:'published',stage:'announced',recording_published:false,recording_first_published_at:null};
test('upcoming published live debates can be followed, past or hidden ones cannot',()=>{
 assert.equal(eligibleForDebateReminder(live,now),true);
 assert.equal(eligibleForDebateReminder({...live,scheduled_at:'2026-11-04T10:00:00Z'},now),false);
 assert.equal(eligibleForDebateReminder({...live,scheduled_at:'invalid'},now),false);
 assert.equal(eligibleForDebateReminder({...live,stage:'postponed'},now),false);
 assert.equal(eligibleForDebateReminder({...live,stage:'cancelled'},now),false);
 assert.equal(eligibleForDebateReminder({...live,publication_status:'hidden'},now),false);
 assert.equal(eligibleForDebateReminder({...live,publication_status:'draft'},now),false);
});
test('prerecorded debates subscribe to recording release, not provisional schedule',()=>{
 assert.equal(eligibleForDebateReminder({...recorded,scheduled_at:'2020-01-01T00:00:00Z'},now),true);
 assert.equal(eligibleForDebateReminder({...recorded,recording_published:true},now),false);
 assert.equal(eligibleForDebateReminder({...recorded,recording_first_published_at:'2026-10-01T00:00:00Z'},now),false);
 assert.equal(eligibleForDebateReminder({...recorded,stage:'recording_available'},now),false);
});
test('debate notifications show in debate category even when moderation updates are disabled',()=>{
 const notification=accountNotice({id:'30000000-0000-4000-8000-000000000001',kind:'debate',
  href:'/debates/debate-test',title:'مناظرة جديدة',created_at:future});
 assert.equal(notification.category,'debates');
 assert.equal(isNotificationEnabled(notification,{debates:false,new_debates:false}),true);
 assert.equal(normalizeNotificationPreferences({notify_new_debates_since:null},null).new_debates,false);
 assert.equal(normalizeNotificationPreferences({notify_new_debates_since:future},null).new_debates,true);
});
test('subscription endpoint checks session, confirmed email, active profile and user ownership',()=>{
 const api=read('app/api/debates/reminders/route.js');
 assert.match(api,/const db=taskRequestDb\(request\),user=await authorizeAudience\(request,db\)/);
 assert.match(api,/!user\.email_confirmed_at/);
 assert.match(api,/profile\?\.suspended/);
 assert.match(api,/!UUID\.test\(body\.id\|\|''\)/);
 assert.match(api,/service\.from\('debate_notification_subscriptions'\)/);
 assert.match(api,/\.eq\('user_id',user\.id\)/);
 assert.match(api,/if\(!eligibleForDebateReminder\(debate\)\)/);
 assert.match(api,/ignoreDuplicates:true/);
 assert.doesNotMatch(api,/body\.user_id/);
});
test('server and client apply the same eligibility rule with a stable public button',()=>{
 const page=read('app/debates/[slug]/page.jsx');
 const ui=read('components/debates/DebateReminderAction.jsx');
 const css=read('app/debates.css');
 assert.match(page,/<DebateReminderAction debate=/);
 assert.match(ui,/eligibleForDebateReminder\(debate\)/);
 assert.match(ui,/aria-pressed=\{status\.subscribed\}/);
 assert.match(ui,/أبلغني عند نشر التسجيل/);
 assert.match(ui,/ذكّرني قبل البث/);
 assert.match(ui,/إلغاء التذكير/);
 assert.match(css,/\.debate-reminder-button/);
 assert.match(css,/@media\(max-width:680px\)/);
});
test('scheduled notifications are opt-in, exactly once per event and reference time',()=>{
 const sql=read('supabase/migrations/20261104204950_debate_opt_in_notifications.sql');
 assert.match(sql,/primary key\(user_id,debate_id,event_key,reference_at\)/);
 assert.match(sql,/on conflict do nothing/);
 assert.match(sql,/d\.first_published_at>=ap\.notify_new_debates_since/);
 assert.match(sql,/d\.debate_type='external_live'/);
 assert.match(sql,/d\.debate_type='prerecorded'/);
 assert.match(sql,/d\.recording_published=true/);
 assert.match(sql,/d\.publication_status='published'/);
 assert.match(sql,/cron\.schedule\('967-debate-notifications','\*\/5 \* \* \* \*'/);
 assert.match(sql,/revoke all on function public\.debate_dispatch_notifications\(\)/);
});
test('global subscription is strictly opt-in and only marks a new publication after enabling',()=>{
 const api=read('app/api/notifications/route.js');
 const pref=read('components/notifications/NotificationCenter.jsx');
 assert.match(api,/notify_new_debates_since/);
 assert.match(api,/if\(key==='new_debates'\)/);
 assert.match(api,/enabled\?new Date\(\)\.toISOString\(\):null/);
 assert.match(api,/kind==='debate'/);
 assert.match(pref,/key:'new_debates'/);
});

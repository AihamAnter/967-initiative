import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateMessagingAction} from '../lib/privateMessaging.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const conversation = '11111111-1111-4111-8111-111111111111';
const sql = read('supabase/migrations/20261106150000_private_conversation_clear_mute.sql');

test('clear, mute and unmute need a valid conversation', () => {
  for (const action of ['clear', 'mute', 'unmute']) {
    assert.equal(validateMessagingAction({action, conversation}).p_conversation, conversation);
    assert.throws(() => validateMessagingAction({action, conversation: 'x'}));
  }
});

test('migration: per-member state, service-role only, membership checked', () => {
  assert.match(sql, /add column if not exists cleared_at timestamptz/);
  assert.match(sql, /add column if not exists muted_at timestamptz/);
  assert.match(sql, /p_actor not in \(c\.user_low,c\.user_high\)/);
  assert.match(sql, /where conversation_id=c\.id and user_id=p_actor/);
  assert.match(sql, /revoke all on function public\.private_messaging_conversation_state\(uuid,uuid,text\) from public,anon,authenticated/);
  assert.match(sql, /grant execute on function public\.private_messaging_conversation_state\(uuid,uuid,text\) to service_role/);
  // Muted conversations send no in-site notice; cleared ones leave the inbox until a newer message.
  assert.match(sql, /s\.muted_at is not null\s+and p_link='\/messages\?conversation='\|\|s\.conversation_id::text/);
  assert.match(sql, /and \(s\.cleared_at is null or c\.last_message_at>s\.cleared_at\)/);
  // The inbox keeps every earlier column, including expired requests.
  assert.match(sql, /then 'expired' else c\.status end/);
  assert.match(sql, /unread bigint,blocked boolean,muted boolean\)/);
});

test('API hides cleared messages for that member and keeps muted chats out of the badge and sound', () => {
  const route = read('app/api/messages/route.js');
  assert.match(route, /private_messaging_conversation_state/);
  assert.equal((route.match(/if\(cleared\)query=query\.gt\('created_at',cleared\)/g) || []).length, 2, 'thread and search');
  assert.match(route, /!lookup\.data\|\|!afterClear\(lookup\.data,cleared\)/);
  assert.match(route, /c\.status==='accepted'&&!c\.muted&&Number\(c\.unread\)>0/);
  assert.match(route, /c\.muted\?0:Number\(c\.unread\|\|0\)/);
});

test('conversation menu offers mute, report, clear and block', () => {
  const ui = read('components/messages/PrivateMessaging.jsx');
  for (const label of ['تعطيل التنبيهات', 'تشغيل التنبيهات', 'الإبلاغ', 'مسح المحادثة', 'حظر المستخدم']) assert.ok(ui.includes(label), label);
  assert.match(ui, /onDoubleClick=\{event=>\{event\.preventDefault\(\);openConvMenu/);
  assert.match(ui, /onContextMenu=/);
  assert.match(ui, /window\.confirm\('مسح المحادثة مع '/);
});

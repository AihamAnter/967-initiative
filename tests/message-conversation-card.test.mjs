import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the entire conversation card, including name and avatar, opens its thread',()=>{
 const jsx=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 const start=jsx.indexOf("{tab==='inbox'&&<>{visible.map(c=>");
 const end=jsx.indexOf("{!visible.length&&",start);
 assert.ok(start>=0&&end>start);
 const inbox=jsx.slice(start,end);
 assert.match(inbox,/<button type="button" className=\{styles\.conversationCard\} key=\{c\.id\} data-active=\{selected===c\.id\} onClick=\{\(\)=>open\(c\.id\)\}/);
 assert.match(inbox,/<ProfileAvatar name=\{c\.partner_name\} src=\{c\.avatar_url\}/);
 assert.match(inbox,/<strong>\{c\.partner_name\}<\/strong>/);
 assert.match(inbox,/c\.last_excerpt/);
 assert.match(inbox,/c\.unread/);
 assert.doesNotMatch(inbox,/<MemberLink/);
 assert.doesNotMatch(inbox,/className=\{styles\.openConversation\}/);
 assert.match(css,/\.conversationCard\{display:flex;align-items:center;gap:11px;width:100%/);
 assert.match(css,/\.conversationCard:focus-visible/);
});

test('member profile links in other views remain intact',()=>{
 const jsx=read('components/messages/PrivateMessaging.jsx');
 assert.match(jsx,/\{tab==='requests'&&[\s\S]*?<MemberLink id=\{c\.partner_id\}/);
 assert.match(jsx,/\{tab==='search'&&[\s\S]*?<MemberLink id=\{p\.id\}/);
 assert.match(jsx,/<MemberLink id=\{thread\.conversation\.partner_id\}/);
 assert.match(jsx,/className=\{styles\.openConversation\} onClick=\{\(\)=>setDialog/);
});

test('conversation remains accessible by keyboard and preserves unread badges',()=>{
 const jsx=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 assert.match(jsx,/aria-label=\{'فتح المحادثة مع '\+c\.partner_name\}/);
 assert.match(jsx,/\{Number\(c\.unread\)>0&&<b className=\{styles\.unread\}>/);
 assert.match(css,/\.conversationCard\[data-active=true\]/);
 assert.match(css,/\.conversationText strong\{font-size:14px/);
 assert.match(css,/\.conversationText>span\{font-size:12px/);
});

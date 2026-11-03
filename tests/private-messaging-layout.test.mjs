import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../components/messages/PrivateMessaging.module.css',import.meta.url),'utf8');
const view=readFileSync(new URL('../components/messages/PrivateMessaging.jsx',import.meta.url),'utf8');

test('chat frame has a defined height and independently scrollable message pane',()=>{
 assert.ok(css.includes('grid-template-rows:minmax(0,1fr);height:clamp('),'chat frame must have a definite height');
 assert.ok(css.includes('.threadArea{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden}'));
 assert.ok(css.includes('.messages{flex:1 1 0;min-height:0;overflow-y:auto;overscroll-behavior:contain;'));
 assert.ok(css.includes('.composer{flex-shrink:0;'),'composer must never be pushed outside the clipped frame');
 assert.ok(css.includes('.threadHeader{flex-shrink:0;'));
 assert.ok(css.includes('.bubbleRow{display:flex;flex-shrink:0;'),'bubbles must not shrink to fit the viewport');
 assert.ok(!css.includes('.layout{display:grid;grid-template-columns:340px minmax(0,1fr);min-height:590px;max-height:760px;'));
});

test('phone view constrains the conversation and preserves input accessibility',()=>{
 assert.ok(css.includes('.layout[data-chat-open=true]{grid-template-rows:minmax(145px,175px) minmax(0,1fr)}'));
 assert.ok(css.includes('height:clamp(500px,calc(100dvh - 165px),830px)'));
 assert.ok(css.includes('.sidebar{min-height:0;max-height:none;'));
 assert.ok(css.includes('.threadArea{min-height:0}'));
 assert.ok(view.includes("data-chat-open={tab==='inbox'&&Boolean(selected&&thread)}"));
});

test('chat opens on latest message while older-message navigation remains possible',()=>{
 assert.ok(view.includes('ref={messagesRef}'));
 assert.ok(view.includes('const scrollStateRef=useRef({conversation:null,lastMessage:null});'));
 assert.ok(view.includes('box.scrollTop=box.scrollHeight;'));
 assert.ok(view.includes('if(previous.conversation!==selected||previous.lastMessage!==lastMessage)'));
 assert.ok(view.includes('setThread(previous=>previous?.conversation?.id===id?previous:null)'));
 assert.ok(view.includes('messages:[...data.messages,...t.messages]'),'older pages are prepended, not replaced');
});

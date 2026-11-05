import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../components/messages/PrivateMessaging.module.css',import.meta.url),'utf8');
const view=readFileSync(new URL('../components/messages/PrivateMessaging.jsx',import.meta.url),'utf8');

test('chat frame keeps a definite height and independently scrollable messages',()=>{
 assert.match(css,/\.layout\{display:flex;flex-direction:column;height:clamp\(/);
 assert.match(css,/\.workspace\{display:grid;grid-template-columns:/);
 assert.match(css,/\.threadArea\{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden/);
 assert.match(css,/\.messages\{flex:1 1 0;min-height:0;overflow-y:auto;overscroll-behavior:contain/);
 assert.match(css,/\.composer\{flex-shrink:0;/);
 assert.match(css,/\.threadHeader\{flex-shrink:0;/);
 assert.match(css,/\.bubbleRow\{display:flex;flex-shrink:0;/);
});

test('all secondary tabs occupy full width while thread stays hidden',()=>{
 assert.match(view,/className=\{styles\.tabs\} aria-label="أقسام الرسائل"/);
 assert.match(view,/data-view=\{tab\}/);
 assert.match(css,/\.layout\[data-view=requests\] \.workspace/);
 assert.match(css,/\.layout\[data-view=search\] \.workspace/);
 assert.match(css,/\.layout\[data-view=settings\] \.workspace/);
 assert.match(css,/\.layout\[data-view=settings\] \.threadArea\{display:none\}/);
 assert.match(view,/\{tab==='requests'&&/);
 assert.match(view,/\{tab==='search'&&/);
 assert.match(view,/\{tab==='settings'&&/);
});

test('chat opens on latest message while older-message navigation remains possible',()=>{
 assert.match(view,/ref=\{messagesRef\}/);
 assert.match(view,/const scrollStateRef=useRef\(\{conversation:null,lastMessage:null\}\)/);
 assert.match(view,/box\.scrollTop=box\.scrollHeight/);
 // Opening a conversation lands on the unread divider when there is one,
 // otherwise on the latest message; a new message only follows when the
 // reader is near the bottom and not browsing older history.
 assert.match(view,/\}else if\(previous\.conversation!==selected\)\{/);
 assert.match(view,/const divider=box\.querySelector\('\[data-unread-separator\]'\)/);
 assert.match(view,/\}else box\.scrollTop=box\.scrollHeight;/);
 assert.match(view,/\}else if\(previous\.lastMessage!==lastMessage&&!historicalRef\.current\)\{/);
 assert.match(view,/if\(distance<150\)box\.scrollTop=box\.scrollHeight/);
 assert.match(view,/setThread\(previous=>previous\?\.conversation\?\.id===id\?previous:null\)/);
 assert.match(view,/messages:\[\.\.\.data\.messages,\.\.\.t\.messages\]/);
});

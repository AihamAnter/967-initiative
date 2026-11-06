import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('mobile open chat hides footer and removes main bottom padding only while a conversation is selected',()=>{
 const shell=read('app/foundation/shell.css');
 const ui=read('components/messages/PrivateMessaging.jsx');
 assert.match(ui,/data-view=\{tab\} data-chat-open=\{tab==='inbox'&&Boolean\(selected\)\}/);
 assert.match(shell,/@media \(max-width: 680px\) \{\s*body:has\(#content \[data-view="inbox"\]\[data-chat-open="true"\]\) \.ed-footer \{ display: none; \}/);
 assert.match(shell,/body:has\(#content \[data-view="inbox"\]\[data-chat-open="true"\]\) #content \{/);
 assert.match(shell,/padding-bottom: 0 !important;/);
 assert.doesNotMatch(shell,/body:has\(#content\) \.ed-footer \{ display: none;/);
});

test('conversation fits between top masthead and unchanged bottom navigation without page overflow',()=>{
 const shell=read('app/foundation/shell.css');
 const css=read('components/messages/PrivateMessaging.module.css');
 assert.match(shell,/height: calc\(100dvh - var\(--header-h, 68px\) - 86px - env\(safe-area-inset-bottom\)\)/);
 assert.match(shell,/min-height: 0;\s*padding-bottom: 0 !important;\s*overflow: hidden;/);
 assert.match(css,/\.layout\[data-chat-open=true\]\{height:100%;min-height:0;max-height:none\}/);
 assert.match(css,/\.page:has\(\.layout\[data-chat-open=true\]\)\{height:100%;min-height:0;overflow:hidden;padding:0\}/);
 assert.match(css,/\.page:has\(\.layout\[data-chat-open=true\]\) \.wrap\{height:100%\}/);
 assert.match(css,/\.layout\[data-chat-open=true\] \.threadArea\{display:flex;flex:1\}/);
 assert.match(shell,/\.ed-tabbar \{\s*position: fixed;/);
 assert.match(shell,/\.ed-header \{\s*position: sticky;/);
});

test('other messaging tabs and desktop layout preserve the footer and scrollable content',()=>{
 const css=read('components/messages/PrivateMessaging.module.css');
 const shell=read('app/foundation/shell.css');
 assert.match(css,/\.layout\[data-view=requests\] \.workspace/);
 assert.match(css,/\.layout\[data-view=search\] \.workspace/);
 assert.match(css,/\.layout\[data-view=settings\] \.workspace/);
 assert.match(css,/\.messages\{flex:1 1 0;min-height:0;overflow-y:auto;/);
 assert.match(shell,/body:has\(\.ed-tabbar\) #content \{ padding-bottom: calc\(72px \+ env\(safe-area-inset-bottom\)\); \}/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('populated inbox removes the empty conversation panel on mobile and lets the list scroll',()=>{
 const ui=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 assert.match(ui,/data-list-filled=\{tab==='inbox'&&visible\.length>0&&!selected\}/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/\.layout\[data-list-filled=true\]\{grid-template-rows:minmax\(0,1fr\) auto\}/);
 assert.match(css,/\.layout\[data-list-filled=true\] \.placeholder\{display:none\}/);
 assert.match(css,/\.list\{min-height:0;overflow-y:auto;flex:1/);
});

test('empty inbox keeps its placeholder and open chat keeps the existing mobile layout',()=>{
 const ui=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 assert.match(ui,/!visible\.length&&<p className=\{styles\.empty\}>/);
 assert.match(ui,/className=\{styles\.placeholder\}/);
 assert.match(ui,/data-chat-open=\{tab==='inbox'&&Boolean\(selected&&thread\)\}/);
 assert.match(css,/\.layout\[data-chat-open=true\]\{grid-template-rows:minmax\(145px,175px\) minmax\(0,1fr\)\}/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('mobile inbox with one or more conversations expands the list without an empty panel',()=>{
 const ui=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 assert.match(ui,/data-sidebar-only=\{tab!=='inbox'\|\|visible\.length>0&&!selected\}/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/\.layout\[data-sidebar-only=true\]\{grid-template-rows:minmax\(0,1fr\) auto\}/);
 assert.match(css,/\.list\{min-height:0;overflow-y:auto;flex:1/);
});

test('requests, new chat and privacy never display the empty-chat placeholder',()=>{
 const ui=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 assert.match(ui,/:tab==='inbox'&&visible\.length===0\?<div className=\{styles\.placeholder\}/);
 assert.match(ui,/selectTab\('requests'\)/);
 assert.match(ui,/selectTab\('search'\)/);
 assert.match(ui,/selectTab\('settings'\)/);
 assert.match(css,/\.layout\[data-sidebar-only=true\] \.placeholder\{display:none\}/);
});

test('empty inbox keeps its guidance, while an open thread retains the two-pane mobile layout',()=>{
 const ui=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 assert.match(ui,/!visible\.length&&<p className=\{styles\.empty\}>/);
 assert.match(ui,/data-chat-open=\{tab==='inbox'&&Boolean\(selected&&thread\)\}/);
 assert.match(css,/\.layout\[data-chat-open=true\]\{grid-template-rows:minmax\(145px,175px\) minmax\(0,1fr\)\}/);
 assert.match(ui,/\{error&&<p className=\{styles\.error\}/);
 assert.match(ui,/\{notice&&<p className=\{styles\.success\}/);
});

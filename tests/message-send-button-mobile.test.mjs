import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('mobile chat puts the send button on the right without moving desktop controls',()=>{
 const css=read('components/messages/PrivateMessaging.module.css');
 const jsx=read('components/messages/PrivateMessaging.jsx');
 const breakpoint=css.indexOf('@media(max-width:680px)');
 assert.ok(breakpoint!==-1);
 const mobile=css.slice(breakpoint,css.indexOf('@media(max-width:355px)',breakpoint));
 const desktop=css.slice(0,breakpoint);
 assert.match(mobile,/\.composer\{padding:8px;gap:7px;flex-direction:row-reverse\}/);
 assert.match(desktop,/\.composer\{flex-shrink:0;[^}]*display:flex;/);
 assert.doesNotMatch(desktop,/\.composer\{[^}]*flex-direction:row-reverse/);
 assert.match(jsx,/<form className=\{styles\.composer\} onSubmit=\{send\}>/);
 assert.match(jsx,/<button type="submit" disabled=\{busy\|\|!draft\.trim\(\)\}/);
});

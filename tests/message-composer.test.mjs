import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldSendComposerEnter,composerHeight} from '../lib/messageComposer.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Enter sends on desktop; Shift+Enter, Ctrl+Enter and mobile Enter insert line breaks',()=>{
 assert.equal(shouldSendComposerEnter({key:'Enter'}),true);
 assert.equal(shouldSendComposerEnter({key:'Enter',shiftKey:true}),false);
 assert.equal(shouldSendComposerEnter({key:'Enter',ctrlKey:true}),false);
 assert.equal(shouldSendComposerEnter({key:'Enter',metaKey:true}),false);
 assert.equal(shouldSendComposerEnter({key:'Enter',altKey:true}),false);
 assert.equal(shouldSendComposerEnter({key:'Enter'},true),false);
 assert.equal(shouldSendComposerEnter({key:'a'}),false);
 assert.equal(shouldSendComposerEnter({key:'Enter',repeat:true}),false);
});

test('Enter does not prematurely submit text during input composition',()=>{
 assert.equal(shouldSendComposerEnter({key:'Enter',isComposing:true}),false);
 assert.equal(shouldSendComposerEnter({key:'Enter',nativeEvent:{isComposing:true}}),false);
 assert.equal(shouldSendComposerEnter({key:'Enter',keyCode:229}),false);
});

test('composer expands with text and scrolls only when it reaches available space',()=>{
 assert.deepEqual(composerHeight(64,900,650),{height:64,overflow:'hidden'});
 assert.deepEqual(composerHeight(320,900,650),{height:320,overflow:'hidden'});
 assert.deepEqual(composerHeight(600,900,650),{height:377,overflow:'auto'});
 assert.deepEqual(composerHeight(500,600,400),{height:232,overflow:'auto'});
});

test('textarea sends through existing submit pathway and grows automatically as text changes',()=>{
 const component=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 assert.match(component,/ref=\{composerRef\} rows=\{1\}/);
 assert.match(component,/onKeyDown=\{onComposerKeyDown\}/);
 assert.match(component,/shouldSendComposerEnter\(event,window\.matchMedia/);
 assert.match(component,/event\.currentTarget\.form\?\.requestSubmit\(\)/);
 assert.match(component,/const send=async event=>/);
 assert.match(component,/if\(!selected\|\|!draft\.trim\(\)\)return/);
 assert.match(component,/useLayoutEffect\(\(\)=>\{resizeComposer\(\);\},\[draft,selected,thread\?\.conversation\?\.status,resizeComposer\]\)/);
 assert.match(component,/field\.style\.height='auto'/);
 assert.match(component,/field\.style\.overflowY=overflow/);
 assert.match(css,/\.composer textarea\{width:100%;min-width:0;min-height:48px;max-height:min\(45dvh,440px\);resize:none;overflow-y:hidden\}/);
 assert.doesNotMatch(css,/max-height:105px/);
 assert.doesNotMatch(component,/Enter للإرسال · Shift\+Enter لسطر جديد/);
 assert.doesNotMatch(component,/message-composer-hint/);
 assert.doesNotMatch(css,/\.composerHint/);
 assert.match(component,/onKeyDown=\{onComposerKeyDown\}/);
});

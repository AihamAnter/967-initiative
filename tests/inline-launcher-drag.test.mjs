import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 clampLauncherPoint,serializeLauncherPoint,restoreLauncherPoint,
 launcherStorageKey,INLINE_LAUNCHER_HOLD_MS,INLINE_LAUNCHER_MOBILE_WIDTH
} from '../lib/inlineLauncherPosition.js';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('launcher can be dragged only after a long press without altering ordinary clicks',()=>{
 const runtime=source('components/inline/InlineEditorRuntime.jsx');
 const hook=source('components/inline/useMovableLauncher.js');
 assert.equal(INLINE_LAUNCHER_HOLD_MS,450);
 assert.equal(INLINE_LAUNCHER_MOBILE_WIDTH,760);
 assert.match(runtime,/useMovableLauncher\(actor\?\.id,launcher/);
 assert.match(runtime,/\.\.\.dragHandlers\} style=\{positionStyle\}/);
 assert.match(runtime,/if\(consumeDragClick\(\)\)return;enabled\?/);
 assert.match(hook,/window\.setTimeout\(\(\)=>\{/);
 assert.match(hook,/if\(Math\.hypot\(dx,dy\)>INLINE_LAUNCHER_SLOP_PX\)clearHold\(\)/);
 assert.match(hook,/setPointerCapture\(event\.pointerId\)/);
 assert.match(hook,/onPointerCancel:event=>finish\(event,true\)/);
});

test('clamp prevents the launcher from leaving the phone viewport',()=>{
 assert.deepEqual(clampLauncherPoint(-1000,-20,110,48,390,844),{x:8,y:8});
 assert.deepEqual(clampLauncherPoint(1000,9999,110,48,390,844),{x:272,y:788});
 assert.deepEqual(clampLauncherPoint(120,140,110,48,390,844),{x:120,y:140});
});

test('saved location is per account and stays valid after rotation or viewport resizing',()=>{
 const key=launcherStorageKey('example-id');
 assert.equal(key,'967:inline-launcher-position:example-id');
 const original={x:220,y:450};
 const stored=serializeLauncherPoint(original,120,48,390,844);
 assert.deepEqual(restoreLauncherPoint(stored,120,48,390,844),original);
 const rotated=restoreLauncherPoint(stored,120,48,844,390);
 assert.ok(rotated.x>=8&&rotated.x<=716);
 assert.ok(rotated.y>=8&&rotated.y<=334);
 assert.equal(restoreLauncherPoint({x:17,y:2},120,48,390,844),null);
 assert.equal(restoreLauncherPoint({x:NaN,y:0},120,48,390,844),null);
 assert.equal(restoreLauncherPoint(null,120,48,390,844),null);
});

test('mobile launcher defaults above bottom tabbar, keeps reset and keyboard fallback',()=>{
 const runtime=source('components/inline/InlineEditorRuntime.jsx');
 const hook=source('components/inline/useMovableLauncher.js');
 const css=source('app/inline-editor.css');
 assert.match(css,/bottom:calc\(100px \+ env\(safe-area-inset-bottom\)\)/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/touch-action:none;user-select:none/);
 assert.match(runtime,/إعادة موضع الزر/);
 assert.match(hook,/window\.localStorage\.setItem\(key/);
 assert.match(hook,/window\.localStorage\.removeItem\(key\)/);
 assert.match(hook,/const onKeyDown=event=>/);
 assert.match(hook,/event\.altKey/);
 assert.match(runtime,/aria-description="على الهاتف/);
});

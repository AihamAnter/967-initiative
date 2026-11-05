import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const studio=read('app/school/studio/studio.module.css');
const civic=read('app/school/civic/civic.module.css');
const school=read('app/school/school.module.css');
const root=':global(:root[data-ed-theme="dark"])';

test('dark-mode lesson callouts have matching surface and text colours',()=>{
 for(const [name,selector] of [
  ['opening tips','.guidedTips'],['learning illustration','.learningIllustration'],
  ['practical hint','.learningHint'],['completion notice','.guidedReady'],
  ['scientific steps','.scienceLearningInstructions'],['science results','.sciencePredictionResult'],
  ['science caution','.scienceCaveat'],['morse and logic labs','.thinkingLab']
 ]){
  assert.ok(studio.includes(selector),name+' not found');
 }
 assert.ok(studio.includes(root+' .root :is(.guidedTips,.guidedExample,.learningIllustration'));
 assert.ok(studio.includes('background:var(--school-panel-raised)'));
 assert.ok(studio.includes('color:var(--school-text-muted)'));
 assert.ok(studio.includes('background:var(--c-leaf-soft)'));
 assert.ok(studio.includes('background:var(--c-caution-soft)'));
 assert.ok(studio.includes('color:var(--school-text)'));
 assert.ok(studio.includes(root+' .root .guidedActions button:disabled'));
});

test('political/economic exercises use dark surfaces for explanations and choices',()=>{
 assert.ok(civic.includes(root+' :is(.activityStory,.exerciseExplanation,.observationPanel,.sequencePending,.sequenceDone)'));
 assert.ok(civic.includes('background:var(--c-surface-2)'));
 assert.ok(civic.includes('color:var(--c-ink-2)'));
 assert.ok(civic.includes(root+' .exerciseExplanation'));
 assert.ok(civic.includes('background:var(--c-leaf-soft)'));
 assert.ok(civic.includes(root+' :is(.exerciseChoices button,.pathGrid button)[aria-pressed=true]'));
 assert.ok(civic.includes('border:2px solid var(--c-accent)'));
 assert.ok(civic.includes(root+' .pathGrid button small'));
});

test('the writing course preserves legibility for quiz symbols and feedback',()=>{
 assert.ok(school.includes(root+' .root :is(.letterTable .glyph,.composeOutput .glyph,.questionGlyph'));
 assert.ok(school.includes(root+' .root :is(.resultSuccess,.done,.open)'));
 assert.ok(school.includes(root+' .root :is(.resultRetry,.locked)'));
 assert.ok(school.includes('color:var(--c-ink)'));
 assert.ok(school.includes('background:var(--c-leaf-soft)'));
 assert.ok(school.includes('background:var(--c-caution-soft)'));
 for(const css of [studio,civic,school])assert.equal(css.split('{').length,css.split('}').length);
});

function rgb(hex){
 const parts=hex.match(/^#([0-9a-f]{6})$/i)?.[1];
 assert.ok(parts,'invalid hex '+hex);
 return [0,2,4].map(i=>parseInt(parts.slice(i,i+2),16)/255);
}
function luminance(color){
 const chan=rgb(color).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
 return .2126*chan[0]+.7152*chan[1]+.0722*chan[2];
}
function contrast(fg,bg){
 const l1=luminance(fg),l2=luminance(bg);
 return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}
test('dark surfaces and teaching alerts meet the 4.5:1 text contrast threshold',()=>{
 const pairs=[
 ['main text on panel','#eef2f0','#131a1c'],
 ['secondary text on panel','#b7c2bf','#131a1c'],
 ['secondary text on raised panel','#b7c2bf','#1a2225'],
 ['completion message','#eef2f0','#13301a'],
 ['caution message','#eef2f0','#33240f'],
 ['selected button text','#ffffff','#176e55'],
 ['primary lesson button','#ffffff','#17765b'],
 ];
 for(const [label,fg,bg] of pairs){
  const ratio=contrast(fg,bg);
  assert.ok(ratio>=4.5,label+' contrast is '+ratio.toFixed(2)+':1');
 }
});

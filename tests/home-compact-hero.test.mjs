import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('app/front.module.css');
const homeCss=read('app/home.module.css');
const panel=read('components/home/HomeSmartStart.module.css');
const home=read('app/page.jsx');
function line(selector){
 const found=css.split('\n').find(row=>row.trimStart().startsWith(selector+' {'));
 assert.ok(found,'Missing '+selector);
 return found;
}
test('home title becomes compact and uses the site-wide hero token',()=>{
 assert.ok(homeCss.includes('.title { margin-top: 8px !important; color: var(--c-ink); font: 700 var(--t-size-hero)/1.25 var(--t-display) !important; }'));
 assert.ok(homeCss.includes('.highlight { color: var(--c-accent); }'));
 assert.ok(read('app/foundation/tokens.css').includes('--t-size-hero: clamp(1.625rem, 1.4rem + 1vw, 2.25rem);'));
});
test('reduced top spacing preserves editable copy, search and homepage sections',()=>{
 assert.ok(homeCss.includes('.greet { padding-top: 14px; }'));
 assert.ok(homeCss.includes('.lead {') && homeCss.includes('-webkit-line-clamp: 2'));
 for(const snippet of ['settings.heroTitle','settings.heroHighlight','settings.heroDescription','settings.heroEyebrow','<SearchForm compact placeholder={settings.searchPlaceholder}/>','<HomeSmartStart','<TodayFeed feed={feed}','<SchoolStrip/>','<KnowledgeRail'])
  assert.ok(home.includes(snippet),'Preserve '+snippet);
});
test('phone sizes and member panel have compact mobile rules',()=>{
 assert.ok(css.includes('@media (max-width: 760px)'));
 assert.ok(css.includes('.hero { padding-top: 18px; padding-bottom: 14px; }'));
 assert.ok(css.includes('font-size: clamp(2.125rem, 1.6rem + 3vw, 2.75rem)'));
 assert.ok(css.includes('.start { margin-top: 32px; }'));
 assert.ok(panel.includes('@media(max-width:600px)'));
 assert.ok(panel.includes('.section{padding:14px;border-radius:18px}'));
 assert.ok(panel.includes('.card{min-height:0;padding:12px 13px;gap:5px}'));
 assert.equal(css.split('{').length,css.split('}').length);
 assert.equal(panel.split('{').length,panel.split('}').length);
});

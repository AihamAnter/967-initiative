import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('app/front.module.css');
const panel=read('components/home/HomeSmartStart.module.css');
const home=read('app/page.jsx');
function line(selector){
 const found=css.split('\n').find(row=>row.trimStart().startsWith(selector+' {'));
 assert.ok(found,'Missing '+selector);
 return found;
}
test('home title becomes compact without changing the site-wide hero token',()=>{
 const title=line('.heroTitle');
 assert.ok(title.includes('clamp(3rem, 1.6rem + 3.2vw, 5.25rem)'));
 assert.ok(title.includes('max-width: 19ch'));
 assert.ok(title.includes('text-wrap: balance'));
 assert.ok(read('app/foundation/tokens.css').includes('--t-size-hero: clamp(3.4rem, 1.6rem + 7.6vw, 8.5rem)'));
});
test('reduced top spacing preserves editable copy, search and homepage sections',()=>{
 assert.ok(line('.hero').includes('calc(var(--header-h) + clamp(28px, 3.5vw, 56px))'));
 assert.ok(line('.hero').includes('clamp(38px, 4.5vw, 68px)'));
 assert.ok(line('.heroText').includes('line-height: 1.7'));
 assert.ok(line('.heroSearch').includes('margin-top: var(--s-5)'));
 assert.ok(line('.start + .section').includes('padding-top: clamp(32px, 4.25vw, 64px)'));
 for(const snippet of ['settings.heroTitle','settings.heroHighlight','settings.heroDescription','<SearchForm placeholder={settings.searchPlaceholder}/>','<HomeSmartStart','<SchoolBlock/>','<KnowledgeBento'])
  assert.ok(home.includes(snippet),'Preserve '+snippet);
});
test('phone sizes and member panel have compact mobile rules',()=>{
 assert.ok(css.includes('@media (max-width: 760px)'));
 assert.ok(css.includes('padding-top: calc(var(--header-h) + 22px)'));
 assert.ok(css.includes('font-size: clamp(2.8rem, 2.1rem + 4vw, 3.75rem)'));
 assert.ok(css.includes('.start { margin-top: -8px; }'));
 assert.ok(panel.includes('@media(max-width:600px)'));
 assert.ok(panel.includes('.section{padding:14px;border-radius:18px}'));
 assert.ok(panel.includes('.card{min-height:0;padding:12px 13px;gap:5px}'));
 assert.equal(css.split('{').length,css.split('}').length);
 assert.equal(panel.split('{').length,panel.split('}').length);
});

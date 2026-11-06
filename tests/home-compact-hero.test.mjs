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
 assert.ok(title.includes('clamp(2.25rem, 1.6rem + 2.6vw, 4rem)'));
 assert.ok(title.includes('max-width: 19ch'));
 assert.ok(title.includes('text-wrap: balance'));
 assert.ok(read('app/foundation/tokens.css').includes('--t-size-hero: clamp(2.75rem, 1.9rem + 4.2vw, 4.75rem)'));
});
test('reduced top spacing preserves editable copy, search and homepage sections',()=>{
 // Calm hero: no decorative mesh, watermark or gradient text; content starts sooner.
 assert.ok(line('.hero').includes('padding: clamp(20px, 4vw, 48px) 0 clamp(18px, 3vw, 32px)'));
 assert.ok(!css.includes('.heroMesh') && !css.includes('.heroMark') && !home.includes('heroMesh') && !home.includes('heroMark'));
 assert.ok(line('.heroHighlight').includes('color: var(--c-accent)') && !line('.heroHighlight').includes('gradient'));
 assert.ok(line('.heroText').includes('line-height: 1.7'));
 assert.ok(line('.heroSearch').includes('margin-top: var(--s-4)'));
 assert.ok(line('.start + .section').includes('padding-top: clamp(32px, 4.25vw, 64px)'));
 for(const snippet of ['settings.heroTitle','settings.heroHighlight','settings.heroDescription','<SearchForm placeholder={settings.searchPlaceholder}/>','<HomeSmartStart','<TodayFeed feed={feed}','<SchoolBlock/>','<KnowledgeBento'])
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

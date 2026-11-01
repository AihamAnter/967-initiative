import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {KNOWLEDGE_AREAS,knowledgeAreaFromPath,knowledgeAreaId} from '../lib/knowledgeIdentity.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const routeFiles={
 history:'app/yemen-history/page.jsx',
 figures:'app/yemeni-figures/page.jsx',
 atlas:'app/yemen-map/page.jsx',
 statistics:'app/yemen-in-numbers/page.jsx',
 ranking:'app/yemen-ranking/page.jsx',
};
function brightness(hex){
 const parts=hex.slice(1).match(/../g).map(s=>parseInt(s,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 return .2126*parts[0]+.7152*parts[1]+.0722*parts[2];
}
function contrast(a,b){
 const x=brightness(a),y=brightness(b);
 return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}

test('only five public knowledge areas have canonical paths and labels',()=>{
 assert.deepEqual(KNOWLEDGE_AREAS.map(x=>x.id),['history','figures','atlas','statistics','ranking']);
 assert.equal(new Set(KNOWLEDGE_AREAS.map(x=>x.href)).size,5);
 for(const area of KNOWLEDGE_AREAS){
  assert.equal(knowledgeAreaId(area.id),area.id);
  assert.equal(knowledgeAreaFromPath(area.href),area.id);
  assert.equal(knowledgeAreaFromPath(area.href+'/more'),area.id);
  assert.ok(area.title.length>4&&area.hint);
 }
 assert.equal(knowledgeAreaId('games'),null);
 for(const path of ['/games','/debates','/school','/yemen-map-other','/'])assert.equal(knowledgeAreaFromPath(path),null);
 assert.equal(knowledgeAreaFromPath('/yemen-in-numbers/timeline?year=2025'),'statistics');
});

test('five distinct palettes are isolated from site-wide tokens and meet text contrast',()=>{
 const css=read('app/knowledge-identity.css');
 const root=read('components/knowledge/KnowledgeTheme.module.css');
 const layout=read('components/legacy/LegacyStyles.js');
 const colors=[];
 for(const area of KNOWLEDGE_AREAS){
  const selector='[data-knowledge-area="'+area.id+'"]';
  const pos=css.indexOf(selector);
  assert.ok(pos>=0,area.id);
  const end=css.indexOf('}',pos);
  const block=css.slice(pos,end);
  const ink=block.match(/--knowledge-strong:(#[0-9a-f]{6})/i)?.[1];
  const hero=block.match(/--knowledge-hero:(#[0-9a-f]{6})/i)?.[1];
  const accent=block.match(/--knowledge-accent:(#[0-9a-f]{6})/i)?.[1];
  assert.ok(ink&&hero&&accent,area.id);
  assert.ok(contrast(ink,hero)>=4.5,'readable '+area.id);
  assert.ok(contrast(ink,'#ffffff')>=4.5,'readable nav '+area.id);
  colors.push(accent);
 }
 assert.equal(new Set(colors).size,5);
 assert.ok(!css.includes(':root'));
 assert.ok(!root.includes('--font-body:'));
 assert.ok(root.includes('data-knowledge-intro'));
 assert.ok(root.includes('var(--knowledge-hero)'));
 assert.ok(layout.includes("import '@/app/knowledge-identity.css';"));
});

test('all public knowledge landing pages share a hero and one accessible navigation',()=>{
 // Design B migrated statistics: its header carries the same five areas as one-tap tabs.
 const numbers=read(routeFiles.statistics);
 assert.ok(numbers.includes('<PageHeader task="explore"'));
 assert.ok(read('components/wayfinder/Collection.jsx').includes("aria-current={isActivePath(currentPath, href) ? 'page' : undefined}"));
 for(const area of KNOWLEDGE_AREAS.filter(item=>item.id!=='statistics')){
  const src=read(routeFiles[area.id]);
  assert.ok(src.includes('<KnowledgeTheme area="'+area.id+'">'),area.id);
  assert.ok(src.includes('<KnowledgeNavigation/>'),area.id);
  assert.equal((src.match(/<KnowledgeNavigation\/>/g)||[]).length,1,area.id);
  const introEnd=src.indexOf(src.includes('</KnowledgePageIntro>')?'</KnowledgePageIntro>':'</PageIntro>');
  assert.ok(introEnd>=0&&src.indexOf('<KnowledgeNavigation/>')>introEnd,'nav follows intro: '+area.id);
 }
 const intro=read('components/knowledge/KnowledgePageIntro.jsx');
 assert.ok(intro.includes('data-area={area||"statistics"}'));
 assert.ok(!intro.includes('data-area="statistics"'));
});

test('knowledge navigation filters hidden sections, marks current section, and works on mobile',()=>{
 const nav=read('components/knowledge/KnowledgeNavigation.jsx');
 const css=read('components/knowledge/KnowledgeNavigation.module.css');
 assert.ok(nav.includes('KNOWLEDGE_AREAS.filter(area=>isVisible(area.href))'));
 assert.ok(nav.includes('aria-label="التنقل بين أقسام المعرفة"'));
 assert.ok(nav.includes("aria-current={selected?'page':undefined}"));
 assert.ok(nav.includes('data-knowledge-id={area.id}'));
 assert.ok(css.includes('min-height:44px'));
 assert.ok(css.includes('overflow-x:auto'));
 assert.ok(css.includes('scroll-snap-type:x proximity'));
 assert.ok(css.includes(':focus-visible'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});

test('homepage discovery uses identical area palettes without changing layout',()=>{
 const home=read('components/home/HomeKnowledge.jsx');
 const homeCss=read('components/home/HomeKnowledge.module.css');
 assert.ok(home.includes('data-knowledge-id={item.id}'));
 assert.ok(homeCss.includes('.tile[data-knowledge-id]'));
 assert.ok(homeCss.includes('var(--knowledge-accent'));
 for(const area of KNOWLEDGE_AREAS)assert.ok(read('lib/homeKnowledge.js').includes("id:'"+area.id+"'"));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {safeNavigationSource,contextualHref,isDetailPath,navigationMemoryPath} from '../lib/navigationContext.js';
import {pageIsVisible} from '../lib/pageVisibility.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('history and governorate profile pages keep a safe, filtered return location',()=>{
 const source='/search?q=تاريخ اليمن&type=history&page=2&secret=leak';
 const safe=safeNavigationSource(source);
 assert.ok(safe.startsWith('/search?'));
 assert.ok(safe.includes('page=2'));
 assert.ok(!safe.includes('secret'));
 assert.equal(isDetailPath('/yemen-history/queen-arwa'),true);
 assert.equal(isDetailPath('/yemen-map/governorates/YE19'),true);
 for(const detail of ['/yemen-history/queen-arwa','/yemen-map/governorates/YE19']){
  const link=new URL(contextualHref(detail,source),'https://local.invalid');
  assert.equal(link.searchParams.get('from'),safe);
  assert.equal(link.pathname,detail);
 }
 assert.equal(safeNavigationSource('/yemen-history?era=ancient&type=state'),'/yemen-history?era=ancient&type=state');
 assert.equal(safeNavigationSource('/yemen-history/queen-arwa'),'/yemen-history/queen-arwa');
 assert.equal(contextualHref('/yemen-history/queen-arwa?from=%2Fread-later',source),'/yemen-history/queen-arwa?from=%2Fread-later');
 assert.equal(contextualHref('/school',source),'/school');
 for(const url of ['https://attacker.example/yemen-history','//attacker.example/search','/yemen-history/../../admin','/api/admin/','/yemen-history/%0a']){
  assert.equal(safeNavigationSource(url),null,'must not return to '+url);
 }
 assert.equal(navigationMemoryPath('/yemen-history?type=state&era=ancient'),navigationMemoryPath('/yemen-history?era=ancient&type=state'));
});
test('return links reuse safe user context while keeping section defaults',()=>{
 const history=read('app/yemen-history/[slug]/page.jsx');
 const governorate=read('app/yemen-map/governorates/[id]/page.jsx');
 assert.match(history,/ContextBackLink/);
 assert.match(history,/fallback="\/yemen-history"/);
 assert.match(governorate,/ContextBackLink/);
 assert.match(governorate,/\/yemen-map\?region=/);
 const back=read('components/ContextBackLink.jsx');
 assert.match(back,/safeNavigationSource/);
 assert.match(back,/const href=source\|\|fallback/);
});
test('mobile navigation closes safely, restores focus and isolates page content',()=>{
 const header=read('components/Header.jsx');
 const root=read('app/layout.jsx');
 assert.match(root,/id="content"/);
 assert.match(root,/phase5-navigation\.css/);
 assert.match(header,/aria-expanded=\{open\}/);
 assert.match(header,/aria-controls="main-navigation"/);
 assert.match(header,/if \(open\) header\.current\?\.querySelector\('#main-navigation a'\)\?\.focus\(\)/);
 assert.match(header,/if\(mobileOpen\)toggle\.current\?\.focus\(\)/);
 assert.match(header,/document\.body\.style\.overflow = 'hidden'/);
 assert.match(header,/document\.body\.style\.overflow = oldOverflow/);
 assert.match(header,/node\.inert = true/);
 assert.match(header,/node\.inert = previous\[index\]/);
 assert.match(header,/mobile\.addEventListener\('change', onViewportChange\)/);
 assert.match(header,/if \(!mobile\.matches\) setOpen\(false\)/);
 const css=read('app/phase5-navigation.css');
 assert.match(css,/@media \(max-width:900px\)/);
 assert.match(css,/@media \(max-width:390px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});
test('footer points to actual school and institution directory routes and respects visibility',()=>{
 const footer=read('components/Footer.jsx');
 const paths=['/school/nature','/school/logic','/school/civic','/universities','/medical-centers'];
 for(const href of paths){
  assert.ok(footer.includes('href="'+href+'"'),'missing footer link '+href);
  assert.ok(existsSync(new URL('../app'+href+'/page.jsx',import.meta.url)),'broken footer route '+href);
 }
 assert.match(footer,/pageIsVisible\(href,settings\.pageVisibility/);
 assert.equal(pageIsVisible('/school/civic',{school:false}),false);
 assert.equal(pageIsVisible('/universities',{universities:false}),false);
 assert.equal(pageIsVisible('/medical-centers',{medicalCenters:false}),false);
 assert.equal(pageIsVisible('/school/civic',{}),true);
});

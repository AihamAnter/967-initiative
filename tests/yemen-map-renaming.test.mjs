import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicSections} from '../lib/pageVisibility.js';
import {searchPages} from '../lib/searchPages.js';
import {readingPathInfo} from '../lib/readingList.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Khareetat Al-Yemen is the name everywhere without changing the existing route',()=>{
 assert.equal(publicSections.find(item=>item.id==='atlas').title,'خريطة اليمن');
 assert.equal(publicSections.find(item=>item.id==='atlas').path,'/yemen-map');
 assert.equal(searchPages.find(item=>item.href==='/yemen-map').title,'خريطة اليمن');
 assert.equal(readingPathInfo('/yemen-map').title,'خريطة اليمن');
 const map=read('app/yemen-map/page.jsx');
 assert.ok(map.includes("title: 'خريطة اليمن'"));
 assert.ok(map.includes('title="خريطة اليمن"'));
 assert.ok(map.includes('<KnowledgePageIntro'));
 assert.ok(read('components/knowledge/KnowledgePageIntro.jsx').includes('<PageIntro tone="blue"'));
 for(const path of ['components/Header.jsx','components/Footer.jsx','components/ContextBackLink.jsx','components/reading/ReadingList.jsx','app/llms.txt/route.js']){
  const source=read(path);
  assert.ok(source.includes('خريطة اليمن'),path);
  assert.ok(!source.includes('اكتشف اليمن'),path);
 }
 assert.ok(read('components/Header.jsx').includes("['/yemeni-figures', 'شخصيات يمنية']"));
});

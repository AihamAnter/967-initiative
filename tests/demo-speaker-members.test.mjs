import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoSpeakerProfile,searchDemoSpeakers} from '../lib/demoSpeakerProfiles.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const speaker=[
 {id:'a3c20d8f-b494-4d0c-9a46-5f856a0a6af5',slug:'test-samer-almaafri',name:'د. سامر المعافري',is_published:true,specialty:'باحث',photo_url:'https://example.org/avatar.png',bio:'نبذة عامة'},
 {id:'0163272e-f850-4448-b2e8-844842057b4e',slug:'samer-alhadrami',name:'سامر الحضرمي',is_published:true},
 {id:'b57c8f0a-c831-46d8-ba67-49ea0b72d5c7',slug:'abd-alqader',name:'عبدالقادر الاموي',is_published:true},
 {id:'d06b06de-8ca3-4e60-919c-0f2655b443fa',slug:'test-huda-alsaqaf',name:'م. هدى السقاف',is_published:true}
];

test('published debate speakers have stable virtual member URLs with their exact names',()=>{
 const previews=speaker.map(demoSpeakerProfile);
 assert.equal(previews.length,4);
 assert.deepEqual(previews.map(p=>p.name),speaker.map(s=>s.name));
 assert.deepEqual(previews.map(p=>p.id),speaker.map(s=>s.id));
 assert.ok(previews.every(p=>p.is_demo===true&&p.joined_at===null));
 assert.equal(previews[0].bio,'نبذة عامة');
 assert.equal(demoSpeakerProfile({...speaker[0],is_published:false}),null);
 assert.equal(demoSpeakerProfile({...speaker[0],id:'not-a-uuid'}),null);
 assert.equal(demoSpeakerProfile(null),null);
});

test('virtual members appear in global member search while retaining demo identification',()=>{
 assert.deepEqual(searchDemoSpeakers(speaker,'سامر').map(p=>p.name),['سامر الحضرمي','د. سامر المعافري']);
 assert.deepEqual(searchDemoSpeakers(speaker,'هُدى').map(p=>p.name),['م. هدى السقاف']);
 assert.deepEqual(searchDemoSpeakers(speaker,'عبدالقادر',{mode:'phrase'}).map(p=>p.id),[speaker[2].id]);
 assert.deepEqual(searchDemoSpeakers(speaker,'سامر',{exclude:'الحضرمي'}).map(p=>p.id),[speaker[0].id]);
});

test('member API never grants demo accounts sign-in, message, block or report actions',()=>{
 const api=read('app/api/members/[id]/route.js');
 const search=read('app/api/members/search/route.js');
 const card=read('components/members/MemberProfile.jsx');
 const speakerPage=read('app/debates/speakers/[slug]/page.jsx');
 assert.match(api,/authorizeAudience\(request,db\)/);
 assert.match(api,/\.eq\('is_published',true\)/);
 assert.match(api,/if\(member\.is_demo\)return json\(\{member,self:false,blocked:false,canMessage:false,hasConversation:false\}\)/);
 assert.match(api,/if\(targetMember\.is_demo\)throw/);
 assert.match(search,/searchDemoSpeakers\(speakers\.data,query/);
 assert.match(search,/\.eq\('is_published',true\)/);
 assert.match(card,/member\.is_demo\?/);
 assert.match(card,/ملف تجريبي/);
 assert.match(speakerPage,/memberProfilePath\(s\.id\)/);
 assert.doesNotMatch(api,/auth\.admin\.createUser/);
});

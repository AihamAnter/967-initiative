import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {memberSearchTerms,matchingMembers} from '../lib/memberSearch.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const actor='30000000-0000-4000-8000-000000000001';
const alice='30000000-0000-4000-8000-000000000002';
const bob='30000000-0000-4000-8000-000000000003';
const hidden='30000000-0000-4000-8000-000000000004';
const blocked='30000000-0000-4000-8000-000000000005';
const deleted='30000000-0000-4000-8000-000000000006';
const suspended='30000000-0000-4000-8000-000000000007';
const profile=(user_id,display_name,rest={})=>({user_id,display_name,avatar_url:'/pic.png',show_avatar:true,suspended:false,deletion_requested_at:null,...rest});

test('member search sanitizes PostgREST terms and matches Arabic names without requiring exact order',()=>{
 assert.ok(memberSearchTerms('أحمد, علي_%').includes('احمد'));
 assert.ok(memberSearchTerms('احمد').includes('أحمد'));
 assert.ok(memberSearchTerms('أَحْمَد').includes('أحمد'));
 assert.ok(memberSearchTerms('أحمد, علي_%').includes('علي'));
 assert.deepEqual(memberSearchTerms('a'),[]);
 const people=[profile(alice,'أحمد علي'),profile(bob,'علي أحمد')];
 assert.deepEqual(matchingMembers(people,[],[],actor,'علي أحمد',{mode:'all'}).map(p=>p.id),[bob,alice]);
 assert.deepEqual(matchingMembers(people,[],[],actor,'أَحْمَد',{mode:'all'}).map(p=>p.id),[alice,bob]);
 assert.deepEqual(matchingMembers(people,[],[],actor,'"أحمد علي"',{mode:'phrase'}).map(p=>p.id),[alice]);
});

test('public search honors hide-my-name, both directions of blocks, suspension and deletion',()=>{
 const people=[
  profile(alice,'منى صالح',{show_avatar:false}),
  profile(bob,'منى محمد'),
  profile(hidden,'منى مخفي'),
  profile(blocked,'منى محظور'),
  profile(deleted,'منى محذوف',{deletion_requested_at:'2026-11-03'}),
  profile(suspended,'منى موقوف',{suspended:true}),
  profile(actor,'منى نفسي')
 ];
 const preferences=[{user_id:hidden,discoverable:false},{user_id:alice,discoverable:true,allow_requests:false}];
 const blocks=[{blocker_id:blocked,blocked_id:actor}];
 const result=matchingMembers(people,preferences,blocks,actor,'منى');
 assert.deepEqual(result.map(p=>p.id),[alice,bob]);
 assert.equal(result.find(p=>p.id===alice).avatar_url,null);
 assert.deepEqual(matchingMembers(people,preferences,[{blocker_id:actor,blocked_id:bob}],actor,'منى').map(p=>p.id),[alice,blocked]);
});

test('global search exposes a members filter and uses a protected authenticated route',()=>{
 const page=read('app/search/page.jsx');
 const types=read('lib/search.js');
 const api=read('app/api/members/search/route.js');
 const widget=read('components/search/MemberSearchResults.jsx');
 assert.match(types,/members:'الأعضاء'/);
 assert.match(page,/MemberSearchResults/);
 assert.match(page,/type !== 'members'/);
 assert.match(api,/authorizeAudience\(request,db\)/);
 assert.match(api,/private_user_blocks/);
 assert.match(api,/private_messaging_settings/);
 assert.match(api,/matchingMembers\(/);
 assert.match(api,/no-store/);
 assert.match(widget,/\/members\//);
});

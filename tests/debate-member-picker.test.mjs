import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {memberSpeakerSlug,draftSpeakerForMember,attachMemberToSpeaker} from '../lib/debateMemberPicker.js';
import {validateDebateCommand} from '../lib/debates.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const user={id:'c10f0b61-31be-4f7d-86a0-276cb3ad01ab',name:'أحمد علي',avatar_url:'https://example.com/a.png'};

test('selecting a registered member creates a stable editable speaker, without replacing other fields',()=>{
 const proposal=draftSpeakerForMember(user);
 assert.equal(proposal.name,'أحمد علي');
 assert.equal(proposal.slug,memberSpeakerSlug(user.id));
 assert.equal(proposal.member_user_id,user.id);
 assert.equal(proposal.is_published,true);
 const old={id:'abc',slug:'existing-slug',name:'اسم سابق',specialty:'متخصص في الاقتصاد',bio:'نبذة ثابتة',photo_url:'https://example.com/old.png',social_links:[{label:'موقع',url:'https://example.com'}],is_published:false};
 const linked=attachMemberToSpeaker(old,user);
 assert.equal(linked.member_user_id,user.id);
 assert.equal(linked.name,user.name);
 assert.equal(linked.slug,old.slug);
 assert.equal(linked.specialty,old.specialty);
 assert.equal(linked.bio,old.bio);
 assert.deepEqual(linked.social_links,old.social_links);
 assert.equal(linked.is_published,false);
 assert.equal(linked.photo_url,old.photo_url);
 assert.equal(validateDebateCommand({action:'speaker',data:linked},true).data.member_user_id,user.id);
 assert.throws(()=>validateDebateCommand({action:'speaker',data:{member_user_id:'not-a-uuid'}},true),/العضو/);
});

test('speaker member search is editor-only and the published speaker page links to the actual member',()=>{
 const api=read('app/api/admin/debates/member-search/route.js');
 const editor=read('components/debates/DebateAdmin.jsx');
 const publicPage=read('app/debates/speakers/[slug]/page.jsx');
 const migration=read('supabase/migrations/20261103162149_link_debate_speakers_to_existing_members.sql');
 assert.match(api,/authorizeEditorRequest\(request,db\)/);
 assert.match(api,/private_messaging_settings/);
 assert.match(api,/discoverable===false/);
 assert.match(editor,/pickMemberForDebate/);
 assert.match(editor,/DebateMemberSearch/);
 assert.match(editor,/member_user_id:null/);
 assert.match(editor,/attachMemberToSpeaker/);
 assert.match(publicPage,/memberProfilePath\(s\.member_user_id\)/);
 assert.match(migration,/CREATE UNIQUE INDEX IF NOT EXISTS debate_speakers_member_user_id_unique/);
 assert.match(migration,/Linked member unavailable or hidden/);
 assert.match(migration,/coalesce\(prefs\.discoverable,true\)/);
});

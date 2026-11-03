import {UUID} from './debates.js';

// A member's directory name is the canonical source. Debate-specific editorial
// details remain editable and never overwrite their account profile.
export function memberSpeakerSlug(userId){
 if(!UUID.test(userId||''))return null;
 return 'member-'+userId.replace(/-/g,'').toLowerCase();
}
export function draftSpeakerForMember(member){
 if(!memberSpeakerSlug(member?.id)||typeof member.name!=='string'||member.name.trim().length<2)throw Error('عضو غير صالح.');
 return {
  name:member.name,
  slug:memberSpeakerSlug(member.id),
  specialty:'',
  bio:'',
  photo_url:typeof member.avatar_url==='string'&&member.avatar_url.startsWith('https://')?member.avatar_url:null,
  social_links:[],
  is_published:true,
  member_user_id:member.id
 };
}
export function attachMemberToSpeaker(speaker,member){
 const base=draftSpeakerForMember(member);
 return {
  ...speaker,
  name:base.name,
  slug:speaker?.slug||base.slug,
  photo_url:speaker?.photo_url||base.photo_url,
  member_user_id:base.member_user_id
 };
}

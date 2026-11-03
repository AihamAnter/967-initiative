import {rankSearchResults} from './search.js';
import {memberProfilePath} from './memberProfiles.js';

// Demo profiles are a projection of published debate speakers, NOT Auth users.
// Speaker UUIDs are stable and double as virtual /members/{id} identifiers.
export function demoSpeakerProfile(speaker){
 if(!speaker?.is_published||!memberProfilePath(speaker.id)||!speaker.name?.trim()||!speaker.slug)return null;
 return {
  id:speaker.id,
  name:speaker.name, // Preserve the exact published display name.
  avatar_url:speaker.photo_url||null,
  joined_at:null,
  is_demo:true,
  speaker_slug:speaker.slug,
  specialty:speaker.specialty||'',
  bio:speaker.bio||''
 };
}

export function searchDemoSpeakers(speakers,query,{mode='all',exclude=''}={}){
 const entries=(speakers||[]).map(demoSpeakerProfile).filter(Boolean)
  .map(person=>({...person,type:'members',title:person.name,description:'',meta:''}));
 return rankSearchResults(query,entries,{mode,scope:'title',exclude})
  .map(({type,title,description,meta,...person})=>person);
}

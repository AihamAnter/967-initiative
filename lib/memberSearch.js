import {rankSearchResults} from './search.js';

// Only ordinary word characters reach PostgREST's OR filter, not user-supplied
// wildcard, comma, or grouping syntax. Matching is finalized on the server.
export function memberSearchTerms(query) {
  const words=String(query||'')
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,'')
    .match(/[\p{L}\p{N}]+/gu)||[];
  const variants=new Set();
  for(const word of [...new Set(words.filter(word=>word.length>=2))].slice(0,6)){
    variants.add(word);
    const base=word.replace(/[أإآٱ]/g,'ا');
    variants.add(base);
    if(base.includes('ا'))for(const hamza of ['أ','إ','آ'])variants.add(base.replace(/ا/g,hamza));
  }
  return [...variants].slice(0,24);
}

export function matchingMembers(profiles,preferences,blocks,actor,query,{mode='all',exclude=''}={}) {
  const settings=new Map((preferences||[]).map(item=>[item.user_id,item]));
  const hiddenByBlock=new Set((blocks||[]).filter(block=>block.blocker_id===actor||block.blocked_id===actor)
    .map(block=>block.blocker_id===actor?block.blocked_id:block.blocker_id));
  const candidates=(profiles||[]).filter(profile=>
    profile.user_id!==actor&&!profile.suspended&&!profile.deletion_requested_at&&
    typeof profile.display_name==='string'&&profile.display_name.trim()&&
    settings.get(profile.user_id)?.discoverable!==false&&
    !hiddenByBlock.has(profile.user_id)
  ).map(profile=>({
    type:'members',title:profile.display_name,description:'',meta:'',searchText:'',
    id:profile.user_id,avatar_url:profile.show_avatar?profile.avatar_url:null
  }));
  return rankSearchResults(query,candidates,{mode,scope:'title',exclude})
    .map(person=>({id:person.id,name:person.title,avatar_url:person.avatar_url}));
}

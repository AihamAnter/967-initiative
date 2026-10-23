'use client';
import {useEffect,useRef,useState} from 'react';
import {emptyDebateDraft,readDebateDraft,saveDebateDraft,safeTabStorage,DEBATE_DRAFT_PREFIX,DEBATE_DRAFT_TTL} from '@/lib/debateDraft';
export default function useDebateDraft(debateId,userId,ready){
 const scope=debateId+':'+(userId||'guest'),active=useRef(null),[state,setState]=useState({scope:null,draft:emptyDebateDraft()});
 useEffect(()=>{if(!ready)return;const storage=safeTabStorage();active.current=scope;const draft=readDebateDraft(storage,debateId,userId)||emptyDebateDraft();setState({scope,draft});
  // Another account can never inherit the previous account's tab draft.
  try{const key=DEBATE_DRAFT_PREFIX+debateId,record=JSON.parse(storage.getItem(key)||'null');if(record&&record.owner!==(userId||'guest'))storage.removeItem(key);}catch{}
  const timer=setInterval(()=>{try{const record=JSON.parse(storage.getItem(DEBATE_DRAFT_PREFIX+debateId)||'null');if(record&&record.expiresAt<=Date.now())storage.removeItem(DEBATE_DRAFT_PREFIX+debateId);}catch{}},Math.min(DEBATE_DRAFT_TTL,60000));
  return()=>{active.current=null;clearInterval(timer);};
 },[scope,debateId,userId,ready]);
 function update(value){setState(previous=>{if(active.current!==scope)return previous;const draft=typeof value==='function'?value(previous.draft):value;saveDebateDraft(safeTabStorage(),debateId,userId,draft);return {scope,draft};});}
 return [state.scope===scope?state.draft:emptyDebateDraft(),update];
}

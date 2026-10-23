import test from 'node:test';
import assert from 'node:assert/strict';
import {DEBATE_STAGES,DEBATE_STAGE_FILTERS,matchesDebateStage,debateListState,selectFeaturedDebate,debateExplorerPage,recordingOverdue,debateParticipationSummary} from '../lib/debates.js';
import {DEBATE_DRAFT_TTL,emptyDebateDraft,saveDebateDraft,readDebateDraft,prepareDebateDraftReturn,claimDebateDraft,claimSessionDebateDraft,safeTabStorage} from '../lib/debateDraft.js';
const now=Date.parse('2026-10-23T12:00:00Z');
const debate=(id,stage,scheduled_at=null,created_at='2026-10-20T12:00:00Z')=>({id,stage,scheduled_at,created_at,publication_status:'published',debate_type:'prerecorded',questions_open:true,comments_open:true});
test('D-01 every stored stage belongs to exactly one named public filter and survives URL state',()=>{
 for(const stage of Object.keys(DEBATE_STAGES)){const groups=Object.keys(DEBATE_STAGE_FILTERS).filter(filter=>matchesDebateStage({stage},filter));assert.equal(groups.length,1,stage);assert.equal(debateListState('stage='+groups[0]).stage,groups[0]);}
 assert.equal(matchesDebateStage({stage:'live'},'live'),true);assert.equal(matchesDebateStage({stage:'postponed'},'upcoming'),false);
});
test('D-02 featured is shown once, remains discoverable across filters, and counts/pagination cover zero, one and many records',()=>{
 const all=Array.from({length:21},(_,i)=>debate(String(i),'upcoming')),featured=all[7],seen=[];
 for(let page=1;page<=3;page++){const result=debateExplorerPage(all,featured,page);assert.equal(result.total,21);assert.equal(result.pages,3);assert.equal(result.items.some(d=>d.id===featured.id),false);seen.push(...result.items.map(d=>d.id));}
 assert.equal(new Set(seen).size,20);assert.equal(debateExplorerPage([featured],featured).items.length,0);assert.equal(debateExplorerPage([featured],featured).total,1);
 assert.equal(debateExplorerPage([],featured).featured,null);assert.equal(debateExplorerPage([all[0]],featured).items[0].id,'0');assert.equal(debateExplorerPage([all[0]],featured).featured,null);
});
test('D-03 live precedes nearest future, latest undated, and overdue; input order stays intact',()=>{
 const old=debate('old','upcoming','2025-01-01'),next=debate('next','upcoming','2026-10-24'),later=debate('later','upcoming','2027-01-01'),undated=debate('undated','announced'),live=debate('live','live');
 const all=[old,later,undated,next,live];assert.equal(selectFeaturedDebate(all,now).id,'live');assert.equal(selectFeaturedDebate(all.slice(0,-1),now).id,'next');assert.equal(selectFeaturedDebate([old,undated],now).id,'undated');assert.equal(selectFeaturedDebate([old],now).id,'old');assert.deepEqual(all.map(d=>d.id),['old','later','undated','next','live']);assert.equal(selectFeaturedDebate([],now),null);
});
test('D-04 overdue is presentation only and respects actual publication, permanent closure and inactive stages',()=>{
 const d=debate('old','upcoming','2026-10-22');assert.equal(recordingOverdue(d,now),true);assert.equal(recordingOverdue({...d,scheduled_at:'2026-10-24'},now),false);for(const stage of ['cancelled','postponed'])assert.equal(recordingOverdue({...d,stage},now),false);assert.equal(recordingOverdue({...d,recording_first_published_at:'2026-10-22'},now),false);assert.equal(recordingOverdue({...d,scheduled_at:'invalid'},now),false);assert.equal(d.stage,'upcoming');assert.equal(d.questions_open,true);
});
test('D-08 functional notices explain true question/comment availability without changing rules',()=>{assert.match(debateParticipationSummary(debate('a','live')),/البث المباشر جارٍ/);assert.match(debateParticipationSummary({...debate('a','upcoming'),recording_first_published_at:'2026-10-22'}),/انتهى استقبال الأسئلة/);assert.match(debateParticipationSummary(debate('a','cancelled')),/المشاركة متوقفة/);});
function memoryStorage(){const values=new Map();return {get length(){return values.size;},key:i=>[...values.keys()][i],getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
test('D-10 existing-email signup without a session preserves the handoff for the authenticated account',()=>{
 const storage=memoryStorage(),draft={...emptyDebateDraft(),comment:'مسودة لا تنتقل إلى هوية تسجيل مموهة'};
 saveDebateDraft(storage,'debate',null,draft,now);const next=prepareDebateDraftReturn(storage,'debate','/debates/test#comments','handoff',now);
 const signup={user:{id:'obfuscated-user'},session:null};
 assert.equal(claimSessionDebateDraft(storage,next,signup.session,now),false);assert.deepEqual(readDebateDraft(storage,'debate',null,now),draft);
 assert.equal(claimSessionDebateDraft(storage,next,{user:{id:'authenticated-user'}},now),true);assert.deepEqual(readDebateDraft(storage,'debate','authenticated-user',now),draft);assert.equal(readDebateDraft(storage,'debate','obfuscated-user',now),null);
});
test('D-10 handoff claims only the matching tab draft and never restores it to another account',()=>{
 const storage=memoryStorage(),draft={...emptyDebateDraft(),question:{...emptyDebateDraft().question,body:'مسودة سؤال خاصة'}};
 saveDebateDraft(storage,'debate',null,draft,now);const next=prepareDebateDraftReturn(storage,'debate','/debates/test#questions','random-capability',now);assert.equal(next,'/debates/test?draft=random-capability#questions');
 assert.equal(claimDebateDraft(storage,'/debates/test?draft=wrong#questions','member',now),false);assert.equal(claimDebateDraft(storage,'/debates/test?draft=random-capability#questions','member',now),true);assert.deepEqual(readDebateDraft(storage,'debate','member',now),draft);assert.equal(readDebateDraft(storage,'debate','other-account',now),null);assert.equal(readDebateDraft(storage,'debate',null,now),null);assert.equal(claimDebateDraft(storage,'/debates/test?draft=random-capability','other-account',now),false);
});
test('D-10 expired, empty and unavailable storage retain no persisted draft; no text appears in handoff URL',()=>{
 const storage=memoryStorage(),draft={...emptyDebateDraft(),comment:'نص خاص'};saveDebateDraft(storage,'a','owner',draft,now);assert.equal(readDebateDraft(storage,'a','owner',now+DEBATE_DRAFT_TTL),null);assert.equal(storage.length,0);saveDebateDraft(storage,'a',null,draft);assert.equal(prepareDebateDraftReturn(storage,'a','/debates/test#comments','cap').includes(encodeURIComponent(draft.comment)),false);saveDebateDraft(storage,'a',null,emptyDebateDraft());assert.equal(storage.length,0);const blocked={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}};assert.equal(readDebateDraft(blocked,'a',null),null);assert.doesNotThrow(()=>saveDebateDraft(blocked,'a',null,draft));
});
test('D-10 a blocked browser storage getter cannot break authentication or in-memory composition',()=>{const host=Object.defineProperty({},'sessionStorage',{get(){throw new DOMException('Blocked','SecurityError');}}),storage=safeTabStorage(host);assert.equal(storage,null);assert.equal(readDebateDraft(storage,'debate',null),null);assert.equal(prepareDebateDraftReturn(storage,'debate','/debates/test#questions','token'),'/debates/test#questions');assert.equal(claimDebateDraft(storage,'/debates/test?draft=token','member'),false);assert.doesNotThrow(()=>saveDebateDraft(storage,'debate',null,emptyDebateDraft()));});

import {initialDebate} from '../../lib/debates.js';
import {debateTestUsers} from './debateTestDatabase.mjs';
export async function seedDebateFixtures(db){
 const [admin]=debateTestUsers,c=db.client(admin.id);
 async function rpc(action,id,data,revision){const result=await c.rpc('debate_admin_mutate',{p_action:action,p_id:id||null,p_revision:revision||null,p_data:data||{}});if(result.error)throw Error(JSON.stringify(result.error));return result.data;}
 const speakers=[];
 for(const [slug,name] of [['speaker-one','المتحدث الأول للاختبار'],['speaker-two','المتحدث الثاني للاختبار'],['speaker-three','المتحدث الثالث للاختبار']])speakers.push((await rpc('speaker',null,{slug,name,specialty:'مشارك في حوار تجريبي معزول',bio:'هذه بيانات اختبار محلية لا تُنشر في الإنتاج.',is_published:true})).id);
 const draftData=type=>({...initialDebate(),slug:'local-'+type.replaceAll('_','-'),title:type==='prerecorded'?'حوار مسجل للاختبار المعزول':'حوار مباشر للاختبار المعزول',question:'ما أثر المشاركة المجتمعية في التنمية؟',description:'بيانات اختبار محلية فقط لاختبار الرحلات والصلاحيات دون أي كتابة إلى الإنتاج.',debate_type:type,participants:speakers.map((speaker_id,position)=>({speaker_id,stance:['زيادة المشاركة','تنظيم المشاركة','التوازن بين الموقفين'][position],role_label:'مناظر',position})),options:[{label:'الموقف الأول',position:0},{label:'الموقف الثاني',position:1}],axes:['المشاركة والتنمية','دور المؤسسات'],polls:['before','after'].map(phase=>({phase,enabled:true,allow_change:true,is_closed:false,opens_at:null,closes_at:null})),scheduled_at:'2026-01-01T12:00:00Z'});
 const live=await rpc('save',null,draftData('external_live'));
 const recorded=await rpc('save',null,{...draftData('prerecorded'),recording_url:'https://www.youtube.com/watch?v=abcdefghijk',duration_seconds:3600,chapters:[{title:'مقدمة الحوار',start_seconds:0},{title:'المواقف',start_seconds:300}]});
 const get=async id=>(await db.pg.query('select * from public.debates where id=$1',[id])).rows[0];
 const full=async id=>{const d=await get(id);const children=async table=>(await db.pg.query('select * from public.'+table+' where debate_id=$1 order by '+(table==='debate_polls'?'phase':'position'),[id])).rows;return {...d,participants:await children('debate_participants'),options:await children('debate_poll_options'),polls:await children('debate_polls')};};
 async function update(id,data){const d=await get(id);await rpc('save',id,data,d.revision);return get(id);}
 return {speakers,live:live.id,recorded:recorded.id,rpc,get,full,update,draftData};
}

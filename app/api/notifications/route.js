import {taskRequestDb} from '@/lib/taskServer';
import {serverDb} from '@/lib/supabase-server';
import {authorizeAudience} from '@/lib/debateApi';
import {readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
import {accountNotice,conversationNotice,taskNotice,orderNotices,
  NOTIFICATION_PAGE_SIZE,NOTIFICATION_CATEGORIES,validNotificationId} from '@/lib/unifiedNotifications';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'};
const response=(body,status=200)=>Response.json(body,{status,headers});
const categoryAllowed=new Set(NOTIFICATION_CATEGORIES);

async function sources(request){
 const db=taskRequestDb(request);
 const user=await authorizeAudience(request,db);
 return {db,user};
}
function dbError(error){
 if(error)throw new RequestValidationError('تعذر تحميل الإشعارات. حاول مجددًا.',503);
}
function accountQuery(db,id,category,limit){
 if(category==='messages'||category==='tasks')return null;
 let q=db.from('account_notifications')
  .select('id,kind,title,description,href,created_at,read_at',{count:'exact'})
  .eq('user_id',id);
 if(category==='debates')q=q.in('kind',['reply','moderation']);
 else if(category==='account')q=q.eq('kind','system').or('href.is.null,href.not.like./messages%');
 else q=q.or('href.is.null,href.not.like./messages%');
 return q.order('created_at',{ascending:false}).limit(limit);
}
function taskQuery(db,id,category,limit){
 if(!['all','tasks'].includes(category))return null;
 return db.from('task_notifications')
  .select('id,task_id,comment_id,kind,created_at,read_at',{count:'exact'})
  .eq('user_id',id).order('created_at',{ascending:false}).limit(limit);
}
function accountUnreadQuery(db,id,category){
 if(category==='messages'||category==='tasks')return null;
 let q=db.from('account_notifications').select('id',{head:true,count:'exact'}).eq('user_id',id).is('read_at',null);
 if(category==='debates')q=q.in('kind',['reply','moderation']);
 else if(category==='account')q=q.eq('kind','system').or('href.is.null,href.not.like./messages%');
 else q=q.or('href.is.null,href.not.like./messages%');
 return q;
}
function taskUnreadQuery(db,id,category){
 return ['all','tasks'].includes(category)?
  db.from('task_notifications').select('id',{head:true,count:'exact'}).eq('user_id',id).is('read_at',null):null;
}
async function messageNotices(user,category){
 if(!['all','messages'].includes(category)||!user.email_confirmed_at||
  user.banned_until&&Date.parse(user.banned_until)>Date.now())return [];
 const service=serverDb();
 if(!service)return [];
 const {data:profile,error:profileError}=await service.from('public_profiles')
  .select('suspended,deletion_requested_at').eq('user_id',user.id).maybeSingle();
 dbError(profileError);
 if(profile?.suspended||profile?.deletion_requested_at)return [];
 const {data,error}=await service.rpc('private_messaging_inbox',{p_actor:user.id});
 dbError(error);
 return (data||[]).map(row=>conversationNotice(row,user.id)).filter(Boolean);
}
async function readCenter(db,user,{mode,category,page}){
 const limit=mode==='summary'?6:Math.min(241,page*NOTIFICATION_PAGE_SIZE+1);
 const [accounts,tasks,accountUnread,taskUnread,messages]=await Promise.all([
  accountQuery(db,user.id,category,limit),taskQuery(db,user.id,category,limit),
  accountUnreadQuery(db,user.id,category),taskUnreadQuery(db,user.id,category),
  messageNotices(user,category),
 ].map(p=>p||Promise.resolve({data:[],count:0,error:null})));
 for(const result of [accounts,tasks,accountUnread,taskUnread])dbError(result.error);
 const rows=tasks.data||[];
 let titles=new Map();
 if(rows.length){
  const ids=[...new Set(rows.map(row=>row.task_id).filter(Boolean))];
  const {data,error}=await db.from('tasks').select('id,title').in('id',ids).limit(250);
  dbError(error);
  titles=new Map((data||[]).map(row=>[row.id,row.title]));
 }
 const entries=orderNotices([
  ...(accounts.data||[]).map(accountNotice),
  ...rows.map(row=>taskNotice(row,titles.get(row.task_id))),
  ...messages
 ]);
 const count=(accountUnread.count||0)+(taskUnread.count||0)+messages.length;
 const total=(accounts.count||0)+(tasks.count||0)+messages.length;
 const offset=(page-1)*NOTIFICATION_PAGE_SIZE;
 return {count,total,markable_count:(accountUnread.count||0)+(taskUnread.count||0),items:mode==='summary'?entries.slice(0,5):entries.slice(offset,offset+NOTIFICATION_PAGE_SIZE),
  hasMore:mode==='summary'?false:total>offset+NOTIFICATION_PAGE_SIZE};
}
export async function GET(request){
 try{
  const {db,user}=await sources(request);
  const params=new URL(request.url).searchParams;
  const mode=params.get('mode')||'summary',category=params.get('category')||'all';
  const raw=params.get('page')||'1';
  if(!['summary','list'].includes(mode)||!categoryAllowed.has(category)||!/^[1-9][0-9]?$/.test(raw)||
   Number(raw)>10)throw new RequestValidationError('معايير عرض الإشعارات غير صالحة.');
  return response(await readCenter(db,user,{mode,category:mode==='summary'?'all':category,page:Number(raw)}));
 }catch(error){
  return response({error:error instanceof RequestValidationError?error.message:'تعذر تحميل الإشعارات.'},
   error instanceof RequestValidationError?error.status:503);
 }
}
export async function POST(request){
 try{
  const {db,user}=await sources(request);
  const body=await readJsonObject(request,2048);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new RequestValidationError('طلب غير صالح.');
  const time=new Date().toISOString();
  if(body.action==='read'){
   if(!validNotificationId(body.source,body.id))throw new RequestValidationError('معرّف الإشعار غير صالح.');
   const table=body.source==='account'?'account_notifications':'task_notifications';
   const {error}=await db.from(table).update({read_at:time})
    .eq('user_id',user.id).eq('id',body.id).is('read_at',null);
   dbError(error);
  }else if(body.action==='read_all'){
   // A message is only marked read by opening its conversation.
   // This action intentionally does not alter message read receipts.
   const results=await Promise.all(['account_notifications','task_notifications'].map(table=>{
    let query=db.from(table).update({read_at:time}).eq('user_id',user.id).is('read_at',null);
    if(table==='account_notifications')query=query.or('href.is.null,href.not.like./messages%');
    return query;
   }));
   for(const result of results)dbError(result.error);
  }else throw new RequestValidationError('الإجراء غير مدعوم.');
  return response({ok:true});
 }catch(error){
  return response({error:error instanceof RequestValidationError?error.message:'تعذر حفظ الإشعار.'},
   error instanceof RequestValidationError?error.status:503);
 }
}

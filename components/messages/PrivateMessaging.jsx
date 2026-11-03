'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,Ban,Bell,Check,CheckCheck,ChevronLeft,Inbox,MailPlus,MessageCircle,RefreshCcw,Search,Send,Settings2,ShieldAlert,UserRound,X} from 'lucide-react';
import useAudience from '@/components/debates/useAudience';
import {browserDb} from '@/lib/supabase';
import {REPORT_REASONS} from '@/lib/privateMessaging';
import styles from './PrivateMessaging.module.css';

const date=value=>value?new Intl.DateTimeFormat('ar',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'';
const defaults={discoverable:true,allow_requests:true,notify_messages:true};

export default function PrivateMessaging(){
 const {user,ready}=useAudience();
 const [tab,setTab]=useState('inbox'),[items,setItems]=useState([]);
 const [selected,setSelected]=useState(null),[thread,setThread]=useState(null);
 const [query,setQuery]=useState(''),[results,setResults]=useState([]);
 const [settings,setSettings]=useState(defaults),[blocked,setBlocked]=useState([]);
 const [draft,setDraft]=useState(''),[intro,setIntro]=useState('');
 const [dialog,setDialog]=useState(null),[reason,setReason]=useState('harassment'),[detail,setDetail]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const live=useRef({user:null,selected:null});
 live.current={user:user?.id||null,selected};

 const request=useCallback(async (mode='inbox',payload=null)=>{
  const db=browserDb();
  if(!db)throw Error('خدمة الحسابات غير متاحة.');
  const {data,error}=await db.auth.getSession();
  if(error||!data.session?.access_token)throw Error('انتهت جلسة تسجيل الدخول.');
  const isAction=!!payload;
  const res=await fetch('/api/messages'+(isAction?'':('?'+mode)),{
   method:isAction?'POST':'GET',
   headers:{Authorization:'Bearer '+data.session.access_token,...(isAction?{'Content-Type':'application/json'}:{})},
   body:isAction?JSON.stringify(payload):undefined,cache:'no-store'
  });
  const body=await res.json();
  if(!res.ok)throw Error(body.error||'تعذر تنفيذ الطلب.');
  // Refresh the shared header badge immediately after reads, sends or decisions.
  if(isAction&&typeof window!=='undefined')window.dispatchEvent(new Event('967:messages-changed'));
  return body;
 },[]);

 const reload=useCallback(async()=>{
  if(!live.current.user)return;
  const owner=live.current.user;
  try{const data=await request('mode=inbox');if(live.current.user===owner)setItems(data.conversations||[]);}
  catch(e){if(live.current.user===owner)setError(e.message);}
 },[request]);
 const open=useCallback(async(id,changeUrl=true)=>{
  if(!id||!live.current.user)return;
  const owner=live.current.user;
  setSelected(id);setThread(null);setError('');
  if(changeUrl&&typeof window!=='undefined')history.replaceState(null,'','/messages?conversation='+encodeURIComponent(id));
  try{
   const data=await request('mode=thread&id='+encodeURIComponent(id));
   if(live.current.user!==owner||live.current.selected!==id)return;
   setThread(data);
   if(data.conversation?.status==='accepted'){
    await request('',{action:'read',conversation:id});
    reload();
   }
  }catch(e){if(live.current.user===owner&&live.current.selected===id)setError(e.message);}
 },[request,reload]);

 useEffect(()=>{
  if(!ready||!user){setItems([]);setSelected(null);setThread(null);return;}
  setLoading(true);
  const params=new URLSearchParams(window.location.search);
  const requested=params.get('conversation');
  const contactId=params.get('to');
  Promise.all([request('mode=inbox'),request('mode=settings')]).then(([data,opts])=>{
   if(live.current.user!==user.id)return;
   setItems(data.conversations||[]);
   setSettings(opts.settings||defaults);
   setBlocked(opts.blocked||[]);
   if(requested&&/^[0-9a-f-]{36}$/i.test(requested))open(requested,false);
   else if(contactId&&/^[0-9a-f-]{36}$/i.test(contactId)){
    const existing=(data.conversations||[]).find(c=>c.partner_id===contactId);
    if(existing){setTab('inbox');open(existing.id);}
    else request('mode=contact&id='+encodeURIComponent(contactId)).then(contact=>{
     if(live.current.user===user.id){setDialog({type:'request',person:contact.person});setTab('inbox');}
    }).catch(failure=>{if(live.current.user===user.id)setError(failure.message);});
   }
  }).catch(e=>{if(live.current.user===user.id)setError(e.message);})
    .finally(()=>{if(live.current.user===user.id)setLoading(false);});
 },[ready,user?.id,request,open]);

 useEffect(()=>{
  if(!user||!ready)return;
  const update=()=>{if(document.visibilityState==='visible'){reload();if(live.current.selected)open(live.current.selected,false);}};
  const timer=setInterval(update,45000);
  window.addEventListener('focus',update);
  return()=>{clearInterval(timer);window.removeEventListener('focus',update);};
 },[ready,user?.id,open,reload]);

 // One Realtime subscription ONLY while a thread is open. No costly global sockets.
 useEffect(()=>{
  if(!thread||thread.conversation?.status!=='accepted'||!selected)return;
  const db=browserDb();
  const channel=db?.channel('private-messages-'+selected)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'private_messages',filter:'conversation_id=eq.'+selected},
    ()=>{if(document.visibilityState==='visible')open(selected,false);})
   .subscribe();
  return()=>{if(channel)db.removeChannel(channel);};
 },[selected,thread?.conversation?.status,open]);

 useEffect(()=>{
  if(!user||tab!=='search'||query.trim().length<2){setResults([]);return;}
  let active=true;
  const timer=setTimeout(()=>{
   request('mode=search&q='+encodeURIComponent(query.trim())).then(data=>{
    if(active)setResults(data.users||[]);
   }).catch(e=>{if(active)setError(e.message);});
  },300);
  return()=>{active=false;clearTimeout(timer);};
 },[user?.id,tab,query,request]);

 const run=async(payload,callback)=>{
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await request('',payload);
   if(callback)await callback(result);
   else await reload();
   return result;
  }catch(e){setError(e.message);return null;}
  finally{setBusy(false);}
 };
 const unread=items.reduce((sum,x)=>sum+Number(x.unread||0),0);
 const pending=items.filter(x=>x.status==='pending'&&x.requested_by!==user?.id);
 const visible=items.filter(x=>x.status==='accepted'||x.status==='pending'&&x.requested_by===user?.id);
 const selectTab=name=>{setTab(name);setError('');setNotice('');if(name!=='inbox'){setSelected(null);setThread(null);history.replaceState(null,'','/messages');}};
 const send=async event=>{
  event.preventDefault();
  if(!selected||!draft.trim())return;
  const text=draft.trim();
  const result=await run({action:'send',conversation:selected,text},async()=>{setDraft('');await open(selected,false);await reload();});
  if(!result)setDraft(text);
 };
 const approve=(action,id)=>run({action,conversation:id},async()=>{await reload();await open(id,false);});
 const create=async target=>{
  if(!intro.trim())return;
  await run({action:'request',target,text:intro.trim()},async(result)=>{
   setIntro('');setDialog(null);setNotice('تم إرسال طلب المحادثة. لا يمكنك إرسال المزيد قبل القبول.');
   setTab('inbox');await reload();await open(result.id);
  });
 };
 const review=async()=>{
  if(!dialog?.conversation)return;
  const payload={action:'report',conversation:dialog.conversation,reason,text:detail};
  if(dialog.message)payload.message=dialog.message;
  await run(payload,async()=>{setDialog(null);setDetail('');setNotice('تم إرسال البلاغ للمراجعة.');});
 };
 const block=async(account,unblock=false)=>{
  if(!unblock&&!window.confirm('حظر '+account.name+' ومنعه من التواصل معك؟'))return;
  await run({action:unblock?'unblock':'block',target:account.id},async()=>{
   setDialog(null);setNotice(unblock?'تم رفع الحظر.':'تم حظر المستخدم.');
   await reload();
   if(selected)open(selected,false);
  });
 };
 const saveSettings=()=>run({action:'settings',...settings},async()=>{
  setNotice('تم حفظ إعدادات الرسائل.');
  const data=await request('mode=settings');setBlocked(data.blocked||[]);
 });

 return <div className={styles.page} dir="rtl"><div className={styles.wrap}>
  <header className={styles.heading}><div><div className={styles.crumb}>967 / حسابي / الرسائل</div><h1>الرسائل الخاصة</h1><p>تواصل مع أعضاء 967 بعد قبول طلب المحادثة. لا توجد رسائل بريدية.</p></div><Link href="/account"><ArrowRight size={16}/> حسابي</Link></header>
  {!ready?<div className={styles.gate}>جارٍ التحقق من الحساب…</div>:!user?
   <div className={styles.gate}><ShieldAlert size={29}/><h2>سجّل الدخول أولًا</h2><p>الرسائل الخاصة متاحة للمستخدمين المسجلين فقط.</p><Link href="/login">تسجيل الدخول</Link></div>:
  <div className={styles.layout}>
   <aside className={styles.sidebar} aria-label="أقسام الرسائل">
    <div className={styles.tabs}>
     <button type="button" data-active={tab==='inbox'} onClick={()=>selectTab('inbox')}><MessageCircle size={18}/> المحادثات {unread>0&&<b>{unread}</b>}</button>
     <button type="button" data-active={tab==='requests'} onClick={()=>selectTab('requests')}><Inbox size={18}/> الطلبات {pending.length>0&&<b>{pending.length}</b>}</button>
     <button type="button" data-active={tab==='search'} onClick={()=>selectTab('search')}><MailPlus size={18}/> محادثة جديدة</button>
     <button type="button" data-active={tab==='settings'} onClick={()=>selectTab('settings')}><Settings2 size={18}/> الخصوصية</button>
    </div>
    <div className={styles.list}>
     {tab==='inbox'&&<>{visible.map(c=><button type="button" key={c.id} data-active={selected===c.id} className={styles.item} onClick={()=>open(c.id)}>
      <span className={styles.avatar}><UserRound size={19}/></span><span className={styles.itemText}><strong>{c.partner_name}</strong><small>{c.status==='pending'?'في انتظار قبول الطلب':c.last_excerpt||'ابدأ المحادثة'}</small></span>
      {Number(c.unread)>0&&<b className={styles.unread}>{c.unread}</b>}</button>)}
      {!visible.length&&<p className={styles.empty}>لا توجد محادثات بعد. ابدأ بطلب محادثة من تبويب «محادثة جديدة».</p>}</>}
     {tab==='requests'&&<>{pending.map(c=><article className={styles.requestCard} key={c.id}>
      <strong>{c.partner_name}</strong><p>{c.intro}</p><small>{date(c.requested_at)}</small>
      <div><button disabled={busy} onClick={()=>approve('accept',c.id)}><Check size={15}/> قبول</button><button disabled={busy} onClick={()=>run({action:'decline',conversation:c.id},reload)}><X size={15}/> رفض</button></div>
      <button className={styles.linkButton} onClick={()=>setDialog({type:'report',conversation:c.id})}>إبلاغ عن الطلب</button>
     </article>)}{!pending.length&&<p className={styles.empty}>لا توجد طلبات جديدة.</p>}</>}
     {tab==='search'&&<><label className={styles.search}><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث بالاسم (حرفان على الأقل)" maxLength={60}/></label>
      <p className={styles.hint}>يظهر الأعضاء في البحث افتراضيًا، ويمكن لكل مستخدم إخفاء اسمه أو إيقاف طلبات المحادثة من إعدادات الخصوصية.</p>
      {results.map(p=><button type="button" key={p.id} className={styles.item} onClick={()=>setDialog({type:'request',person:p})}><span className={styles.avatar}><UserRound size={19}/></span><span className={styles.itemText}><strong>{p.name}</strong><small>إرسال طلب محادثة</small></span><ChevronLeft size={16}/></button>)}
      {query.trim().length>=2&&!results.length&&<p className={styles.empty}>لا توجد نتائج مطابقة.</p>}</>}
     {tab==='settings'&&<div className={styles.settings}><h2>خصوصية الرسائل</h2>
      <label><input type="checkbox" checked={settings.allow_requests} onChange={e=>setSettings(s=>({...s,allow_requests:e.target.checked}))}/> استقبال طلبات المحادثة</label>
      <label><input type="checkbox" checked={settings.discoverable} onChange={e=>setSettings(s=>({...s,discoverable:e.target.checked}))}/> إظهار اسمي في البحث عن المستخدمين</label>
      <label><input type="checkbox" checked={settings.notify_messages} onChange={e=>setSettings(s=>({...s,notify_messages:e.target.checked}))}/> إشعارات الرسائل داخل الموقع</label>
      <button className={styles.primary} disabled={busy} onClick={saveSettings}>حفظ التفضيلات</button>
      <h3>المستخدمون المحظورون</h3>{blocked.map(b=><div key={b.id} className={styles.blocked}><span>{b.name}</span><button disabled={busy} onClick={()=>block(b,true)}>رفع الحظر</button></div>)}
      {!blocked.length&&<p className={styles.hint}>لا توجد حسابات محظورة.</p>}
     </div>}
    </div>
   </aside>
   <main className={styles.threadArea}>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {notice&&<p className={styles.success} role="status">{notice}</p>}
    {loading&&<p className={styles.hint}>جارٍ تحميل الرسائل…</p>}
    {tab==='inbox'&&selected&&thread?<section className={styles.thread}>
     <header className={styles.threadHeader}><div><UserRound size={23}/><div><h2>{thread.conversation.partner_name}</h2><small>{thread.conversation.status==='accepted'?'محادثة خاصة':'طلب محادثة'}</small></div></div>
      <div><button type="button" title="إبلاغ" onClick={()=>setDialog({type:'report',conversation:selected})}><ShieldAlert size={18}/></button>
      <button type="button" title="حظر المستخدم" onClick={()=>block({id:thread.conversation.partner_id,name:thread.conversation.partner_name})}><Ban size={18}/></button></div></header>
     {thread.conversation.status==='accepted'?<>
      <div className={styles.messages} aria-label="الرسائل">
       {thread.hasMore&&<button className={styles.older} disabled={busy} onClick={async()=>{
        const data=await request('mode=thread&id='+selected+'&before='+encodeURIComponent(thread.nextBefore));
        setThread(t=>t&&t.conversation.id===selected?{...t,messages:[...data.messages,...t.messages],hasMore:data.hasMore,nextBefore:data.nextBefore}:t);
       }}>تحميل رسائل أقدم</button>}
       {thread.messages.map(m=><div key={m.id} className={styles.bubbleRow} data-own={m.sender_id===user.id}><div className={styles.bubble}><p>{m.body}</p><footer><time>{date(m.created_at)}</time>
        {m.sender_id!==user.id&&<button title="الإبلاغ عن هذه الرسالة" onClick={()=>setDialog({type:'report',conversation:selected,message:m.id})}><ShieldAlert size={13}/></button>}</footer></div></div>)}
       {!thread.messages.length&&<p className={styles.empty}>المحادثة جاهزة. اكتب أول رسالة.</p>}
      </div>
      <form className={styles.composer} onSubmit={send}><textarea rows={2} maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="اكتب رسالتك…" aria-label="نص الرسالة"/><button disabled={busy||!draft.trim()} aria-label="إرسال الرسالة"><Send size={19}/> إرسال</button></form>
     </>:<div className={styles.empty}><Bell size={26}/><h3>بانتظار الموافقة</h3><p>{thread.conversation.intro}</p><p>يمكن إرسال رسائل جديدة بعد قبول الطرف الآخر فقط.</p></div>}
    </section>:<div className={styles.placeholder}><MessageCircle size={44}/><h2>مساحة خاصة للتواصل</h2><p>اختر محادثة من القائمة. تبدأ المحادثات الجديدة بطلب يحتاج موافقة المستلم.</p></div>}
   </main>
  </div>}
  {dialog&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setDialog(null);}}><section className={styles.modal} role="dialog" aria-modal="true" aria-label={dialog.type==='request'?'طلب محادثة':'الإبلاغ عن إساءة'}>
   <header><h2>{dialog.type==='request'?'طلب محادثة مع '+dialog.person.name:'الإبلاغ عن محتوى'}</h2><button onClick={()=>setDialog(null)} disabled={busy} aria-label="إغلاق"><X size={19}/></button></header>
   {dialog.type==='request'?<><p>اكتب رسالة تعريفية واحدة. لن تتمكن من إرسال المزيد حتى قبول الطلب.</p>
    <textarea value={intro} maxLength={500} rows={4} onChange={e=>setIntro(e.target.value)} placeholder="مرحبًا، أود التواصل معك بشأن…"/>
    <button className={styles.primary} disabled={busy||!intro.trim()} onClick={()=>create(dialog.person.id)}>إرسال الطلب</button></>:
    <><p>يصل هذا البلاغ إلى الإدارة مع محتوى الرسالة أو الطلب المعني فقط.</p>
    <label>سبب البلاغ<select value={reason} onChange={e=>setReason(e.target.value)}>{Object.entries(REPORT_REASONS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <textarea rows={3} maxLength={1000} value={detail} onChange={e=>setDetail(e.target.value)} placeholder="ملاحظات إضافية (اختيارية)"/>
    <button className={styles.primary} disabled={busy} onClick={review}>إرسال البلاغ</button></>}
   {error&&<p className={styles.error} role="alert">{error}</p>}
  </section></div>}
 </div></div>;
}

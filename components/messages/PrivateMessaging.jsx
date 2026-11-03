'use client';
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,Ban,Bell,Check,CheckCheck,ChevronLeft,Inbox,MailPlus,MessageCircle,RefreshCcw,Search,Send,Settings2,ShieldAlert,UserRound,X} from 'lucide-react';
import useAudience from '@/components/debates/useAudience';
import {browserDb} from '@/lib/supabase';
import {REPORT_REASONS} from '@/lib/privateMessaging';
import {shouldSendComposerEnter,composerHeight} from '@/lib/messageComposer';
import {buildMessageTimeline,messageClock} from '@/lib/messageTimeline';
import MemberLink from '@/components/members/MemberLink';
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
 const messagesRef=useRef(null),composerRef=useRef(null);
 const resizeComposer=useCallback(()=>{
  const field=composerRef.current;
  if(!field)return;
  field.style.height='auto';
  const threadHeight=field.closest('section')?.clientHeight||window.innerHeight;
  const {height,overflow}=composerHeight(field.scrollHeight,window.innerHeight,threadHeight);
  field.style.height=height+'px';
  field.style.overflowY=overflow;
 },[]);
 useLayoutEffect(()=>{resizeComposer();},[draft,selected,thread?.conversation?.status,resizeComposer]);
 useEffect(()=>{
  const onResize=()=>resizeComposer();
  window.addEventListener('resize',onResize);
  return()=>window.removeEventListener('resize',onResize);
 },[resizeComposer]);
 const scrollStateRef=useRef({conversation:null,lastMessage:null});
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
  setSelected(id);setThread(previous=>previous?.conversation?.id===id?previous:null);setError('');
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
  const box=messagesRef.current;
  if(!box||tab!=='inbox'||!selected||thread?.conversation?.status!=='accepted'){
   if(!selected||tab!=='inbox')scrollStateRef.current={conversation:null,lastMessage:null};
   return;
  }
  const lastMessage=thread.messages?.[thread.messages.length-1]?.id||null;
  const previous=scrollStateRef.current;
  if(previous.conversation!==selected||previous.lastMessage!==lastMessage){
   box.scrollTop=box.scrollHeight;
  }
  scrollStateRef.current={conversation:selected,lastMessage};
 },[tab,selected,thread]);

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
 const backToList=()=>{setSelected(null);setThread(null);history.replaceState(null,'','/messages');};
 const selectTab=name=>{setTab(name);setError('');setNotice('');if(name!=='inbox')backToList();};
 const onComposerKeyDown=event=>{
  if(!shouldSendComposerEnter(event,window.matchMedia('(max-width: 680px)').matches))return;
  event.preventDefault();
  if(!busy&&selected&&draft.trim())event.currentTarget.form?.requestSubmit();
 };
 const send=async event=>{
  event.preventDefault();
  if(!selected||!draft.trim())return;
  const text=draft.trim();
  const result=await run({action:'send',conversation:selected,text},async()=>{setDraft('');await open(selected,false);await reload();});
  if(!result)setDraft(text);
 };
 const approve=(action,id)=>run({action,conversation:id},async()=>{setTab('inbox');await reload();await open(id);});
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
  <header className={styles.heading}><div><span className={styles.kicker}>تواصل الأعضاء</span><h1>الرسائل الخاصة</h1><p>محادثاتك وطلبات التواصل في مكان واحد.</p></div><Link href="/account" className={styles.accountLink}><ArrowRight size={16}/> حسابي</Link></header>
  {!ready?<div className={styles.gate}>جارٍ التحقق من الحساب…</div>:!user?
   <div className={styles.gate}><ShieldAlert size={29}/><h2>سجّل الدخول أولًا</h2><p>الرسائل الخاصة متاحة للمستخدمين المسجلين فقط.</p><Link href="/login">تسجيل الدخول</Link></div>:
  <div className={styles.layout} data-view={tab} data-chat-open={tab==='inbox'&&Boolean(selected)}>
   <nav className={styles.tabs} aria-label="أقسام الرسائل">
    <button type="button" data-active={tab==='inbox'} aria-pressed={tab==='inbox'} onClick={()=>selectTab('inbox')}><MessageCircle size={19}/><span>المحادثات</span>{unread>0&&<b>{unread}</b>}</button>
    <button type="button" data-active={tab==='requests'} aria-pressed={tab==='requests'} onClick={()=>selectTab('requests')}><Inbox size={19}/><span>الطلبات</span>{pending.length>0&&<b>{pending.length}</b>}</button>
    <button type="button" data-active={tab==='search'} aria-pressed={tab==='search'} onClick={()=>selectTab('search')}><MailPlus size={19}/><span>محادثة جديدة</span></button>
    <button type="button" data-active={tab==='settings'} aria-pressed={tab==='settings'} onClick={()=>selectTab('settings')}><Settings2 size={19}/><span>الخصوصية</span></button>
   </nav>
   {(error||notice||loading)&&<div className={styles.statusArea} aria-live="polite">
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {notice&&<p className={styles.success} role="status">{notice}</p>}
    {loading&&<p className={styles.hint}>جارٍ تحميل الرسائل…</p>}
   </div>}
   <div className={styles.workspace}>
   <aside className={styles.sidebar} aria-label="محتوى قسم الرسائل">
    {tab==='inbox'&&<div className={styles.listHeading}><strong>المحادثات <small>{visible.length}</small></strong><button type="button" onClick={()=>selectTab('search')} aria-label="بدء محادثة جديدة"><MailPlus size={17}/><span>جديدة</span></button></div>}
    <div className={styles.list}>
     {tab==='inbox'&&<>{visible.map(c=><div className={styles.personRow} key={c.id} data-active={selected===c.id}>
      <MemberLink id={c.partner_id} name={c.partner_name} avatarUrl={c.avatar_url} className={styles.personLink}/>
      <button type="button" className={styles.openConversation} onClick={()=>open(c.id)} aria-label={'فتح المحادثة مع '+c.partner_name}>
       <span>{c.status==='pending'?'في انتظار قبول الطلب':c.last_excerpt||'فتح المحادثة'}</span>
       {Number(c.unread)>0&&<b className={styles.unread}>{c.unread}</b>}
       <ChevronLeft size={15}/>
      </button></div>)}
      {!visible.length&&<div className={styles.emptyState}><MessageCircle size={28}/><h3>لا توجد محادثات بعد</h3><p>ابدأ بطلب محادثة مع عضو آخر في 967.</p><button type="button" className={styles.primary} onClick={()=>selectTab('search')}><MailPlus size={17}/> محادثة جديدة</button></div>}</>}
     {tab==='requests'&&<><div className={styles.sectionIntro}><h2>طلبات المحادثة</h2><p>اقبل الطلب لبدء تبادل الرسائل.</p></div>{pending.map(c=><article className={styles.requestCard} key={c.id}>
      <MemberLink id={c.partner_id} name={c.partner_name} avatarUrl={c.avatar_url}/><p>{c.intro}</p><small>{date(c.requested_at)}</small>
      <div><button disabled={busy} onClick={()=>approve('accept',c.id)}><Check size={15}/> قبول</button><button disabled={busy} onClick={()=>run({action:'decline',conversation:c.id},reload)}><X size={15}/> رفض</button></div>
      <button className={styles.linkButton} onClick={()=>setDialog({type:'report',conversation:c.id})}>إبلاغ عن الطلب</button>
     </article>)}{!pending.length&&<div className={styles.emptyState}><Inbox size={28}/><h3>لا توجد طلبات جديدة</h3><p>ستظهر طلبات التواصل هنا عند وصولها.</p></div>}</>}
     {tab==='search'&&<><div className={styles.sectionIntro}><h2>محادثة جديدة</h2><p>ابحث عن عضو ثم أرسل له طلب تواصل.</p></div><label className={styles.search}><Search size={18}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن عضو بالاسم…" maxLength={60}/></label>
      <p className={styles.hint}>اكتب حرفين على الأقل. تظهر الحسابات التي تسمح بالبحث وطلبات المحادثة فقط.</p>
      {results.map(p=><div key={p.id} className={styles.personRow}>
       <MemberLink id={p.id} name={p.name} avatarUrl={p.avatar_url} className={styles.personLink}/>
       <button type="button" className={styles.openConversation} onClick={()=>setDialog({type:'request',person:p})}><MailPlus size={15}/> طلب محادثة</button>
      </div>)}
      {query.trim().length>=2&&!results.length&&<p className={styles.empty}>لا توجد نتائج مطابقة.</p>}</>}
     {tab==='settings'&&<div className={styles.settings}><div className={styles.sectionIntro}><h2>الخصوصية والإشعارات</h2><p>اختر من يمكنه العثور عليك والتواصل معك.</p></div>
      <label><input type="checkbox" checked={settings.allow_requests} onChange={e=>setSettings(s=>({...s,allow_requests:e.target.checked}))}/> استقبال طلبات المحادثة</label>
      <label><input type="checkbox" checked={settings.discoverable} onChange={e=>setSettings(s=>({...s,discoverable:e.target.checked}))}/> إظهار اسمي في البحث عن المستخدمين</label>
      <label><input type="checkbox" checked={settings.notify_messages} onChange={e=>setSettings(s=>({...s,notify_messages:e.target.checked}))}/> إشعارات الرسائل داخل الموقع (تنبيه صوتي عند وصول رسالة)</label>
      <button className={styles.primary} disabled={busy} onClick={saveSettings}>حفظ التفضيلات</button>
      <h3>المستخدمون المحظورون</h3>{blocked.map(b=><div key={b.id} className={styles.blocked}><MemberLink id={b.id} name={b.name} showAvatar={false}/><button disabled={busy} onClick={()=>block(b,true)}>رفع الحظر</button></div>)}
      {!blocked.length&&<p className={styles.hint}>لا توجد حسابات محظورة.</p>}
     </div>}
    </div>
   </aside>
   <main className={styles.threadArea}>
    {tab==='inbox'&&selected&&thread?<section className={styles.thread}>
     <header className={styles.threadHeader}><button type="button" className={styles.backToList} onClick={backToList} aria-label="العودة إلى قائمة المحادثات"><ArrowRight size={20}/><span>العودة</span></button><div><MemberLink id={thread.conversation.partner_id} name={thread.conversation.partner_name} avatarUrl={thread.conversation.avatar_url}/><small>{thread.conversation.status==='accepted'?'محادثة خاصة':'طلب محادثة'}</small></div>
      <div><button type="button" title="إبلاغ" onClick={()=>setDialog({type:'report',conversation:selected})}><ShieldAlert size={18}/></button>
      <button type="button" title="حظر المستخدم" onClick={()=>block({id:thread.conversation.partner_id,name:thread.conversation.partner_name})}><Ban size={18}/></button></div></header>
     {thread.conversation.status==='accepted'?<>
      <div className={styles.messages} ref={messagesRef} aria-label="الرسائل">
       {thread.hasMore&&<button className={styles.older} disabled={busy} onClick={async()=>{
        const data=await request('mode=thread&id='+selected+'&before='+encodeURIComponent(thread.nextBefore));
        setThread(t=>t&&t.conversation.id===selected?{...t,messages:[...data.messages,...t.messages],hasMore:data.hasMore,nextBefore:data.nextBefore}:t);
       }}>تحميل رسائل أقدم</button>}
       {buildMessageTimeline(thread.messages).map(entry=>entry.kind==='day'?
        <div key={entry.key} className={styles.daySeparator} role="separator" aria-label={entry.label}><time dateTime={entry.day}>{entry.label}</time></div>:
        <div key={entry.key} className={styles.bubbleRow} data-own={entry.message.sender_id===user.id}><div className={styles.bubble}><div className={styles.bubbleContent}>
         <time dateTime={entry.message.created_at} dir="ltr">{messageClock(entry.message.created_at)}</time>
         <p>{entry.message.body}</p>
         {entry.message.sender_id!==user.id&&<button type="button" aria-label="الإبلاغ عن هذه الرسالة" title="الإبلاغ عن هذه الرسالة" onClick={()=>setDialog({type:'report',conversation:selected,message:entry.message.id})}><ShieldAlert size={13}/></button>}
        </div></div></div>)}
       {!thread.messages.length&&<p className={styles.empty}>المحادثة جاهزة. اكتب أول رسالة.</p>}
      </div>
      <form className={styles.composer} onSubmit={send}><div className={styles.composerField}><textarea ref={composerRef} rows={1} maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={onComposerKeyDown} placeholder="اكتب رسالتك…" aria-label="نص الرسالة" aria-describedby="message-composer-hint"/><small id="message-composer-hint" className={styles.composerHint}>Enter للإرسال · Shift+Enter لسطر جديد</small></div><button type="submit" disabled={busy||!draft.trim()} aria-label="إرسال الرسالة"><Send size={19}/> إرسال</button></form>
     </>:<div className={styles.empty}><Bell size={26}/><h3>بانتظار الموافقة</h3><p>{thread.conversation.intro}</p><p>يمكن إرسال رسائل جديدة بعد قبول الطرف الآخر فقط.</p></div>}
    </section>:tab==='inbox'&&selected?<div className={styles.threadLoading} role="status">{error?'تعذر فتح المحادثة. يمكنك العودة للقائمة.':'جارٍ فتح المحادثة…'}<button type="button" onClick={backToList}>العودة للمحادثات</button></div>:tab==='inbox'?<div className={styles.placeholder}><MessageCircle size={35}/><h2>اختر محادثة للبدء</h2><p>ستظهر الرسائل هنا عند اختيار أي محادثة من القائمة.</p><button type="button" onClick={()=>selectTab('search')} className={styles.secondaryButton}><MailPlus size={17}/> محادثة جديدة</button></div>:null}
   </main>
   </div>
  </div>}
  {dialog&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setDialog(null);}}><section className={styles.modal} role="dialog" aria-modal="true" aria-label={dialog.type==='request'?'طلب محادثة':'الإبلاغ عن إساءة'}>
   <header><h2>{dialog.type==='request'?'طلب محادثة مع '+dialog.person.name:'الإبلاغ عن محتوى'}</h2><button onClick={()=>setDialog(null)} disabled={busy} aria-label="إغلاق"><X size={19}/></button></header>
   {dialog.type==='request'?<><p>اكتب رسالة تعريفية واحدة. لن تتمكن من إرسال المزيد حتى قبول الطلب.</p>
    <textarea value={intro} maxLength={500} rows={4} onChange={e=>setIntro(e.target.value)} placeholder="مرحبًا، أود التواصل معك بشأن…"/>
    <button className={styles.primary} disabled={busy||!intro.trim()} onClick={()=>create(dialog.person.id)}>إرسال الطلب</button></>:
    <><p>عند إرسال البلاغ، تستطيع الإدارة مراجعة الرسائل السابقة في هذه المحادثة حتى وقت البلاغ للتحقق من السياق. تُسجّل عمليات اطلاع الإدارة.</p>
    <label>سبب البلاغ<select value={reason} onChange={e=>setReason(e.target.value)}>{Object.entries(REPORT_REASONS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <textarea rows={3} maxLength={1000} value={detail} onChange={e=>setDetail(e.target.value)} placeholder="ملاحظات إضافية (اختيارية)"/>
    <button className={styles.primary} disabled={busy} onClick={review}>إرسال البلاغ</button></>}
   {error&&<p className={styles.error} role="alert">{error}</p>}
  </section></div>}
 </div></div>;
}

'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from '@/components/SiteLink';
import Image from 'next/image';
import {Activity,ArrowLeft,ArrowUpLeft,Bell,BookOpen,BookmarkCheck,CheckCircle2,ChevronLeft,Clock3,Download,FileText,FolderPlus,HeartHandshake,Inbox,LockKeyhole,MessageSquare,Plus,RefreshCw,Settings2,ShieldCheck,Trash2,Upload,UserRound,UsersRound,X} from 'lucide-react';
import useAudience,{audienceRequest} from '@/components/debates/useAudience';
import {browserDb} from '@/lib/supabase';
import useReadingList from '@/components/reading/useReadingList';
import {COMMENT_STATUSES,QUESTION_STATUSES,SUGGESTION_STATUSES} from '@/lib/debates';
import {formatArabicDate} from '@/lib/format';
import styles from './AccountWorkspace.module.css';

const views=[
 {id:'overview',label:'نظرة عامة',icon:Activity},
 {id:'saved',label:'محفوظاتي',icon:BookmarkCheck},
 {id:'collections',label:'مجموعاتي',icon:BookOpen},
 {id:'notifications',label:'الإشعارات',icon:Bell},
 {id:'contributions',label:'مشاركاتي',icon:MessageSquare},
 {id:'activity',label:'سجل نشاطي',icon:Clock3},
 {id:'profile',label:'الملف الشخصي',icon:UserRound},
 {id:'settings',label:'الإعدادات والخصوصية',icon:Settings2}
];
const statusLabels={...COMMENT_STATUSES,...QUESTION_STATUSES,...SUGGESTION_STATUSES};
const simpleTime=date=>date?formatArabicDate(date):'';
const emptyWorkspace={preferences:{bio:'',governorate:'',website:'',social_url:'',notify_replies:true,notify_moderation:true},saved:[],collections:[],notifications:[],unread:0};
const tabName=(id)=>views.find(x=>x.id===id)?.label||views[0].label;

export default function AccountWorkspace({initialTab='overview'}){
 const auth=useAudience(),user=auth.user;
 const local=useReadingList();
 const [tab,setTab]=useState(views.some(x=>x.id===initialTab)?initialTab:'overview');
 const [account,setAccount]=useState(null),[workspace,setWorkspace]=useState(emptyWorkspace);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [page,setPage]=useState(1),[filter,setFilter]=useState('all'),[collectionDraft,setCollectionDraft]=useState('');
 const [profileForm,setProfileForm]=useState(null),[settingsDraft,setSettingsDraft]=useState(null);
 const currentUser=useRef(null);currentUser.current=user?.id||null;
 useEffect(()=>setTab(views.some(x=>x.id===initialTab)?initialTab:'overview'),[initialTab]);
 const fetchAll=useCallback(async()=>{
  const owner=currentUser.current;if(!owner)return;
  setLoading(true);setError('');
  try{
   const [base,extra]=await Promise.all([audienceRequest('/api/account?activity=1&page='+page),audienceRequest('/api/account/workspace')]);
   if(currentUser.current!==owner)return;
   setAccount(base);setWorkspace(extra);
   setProfileForm({display_name:base.profile?.display_name||'',
    avatar_url:base.profile?.avatar_url||'',show_avatar:!!base.profile?.show_avatar,
    bio:extra.preferences?.bio||'',governorate:extra.preferences?.governorate||'',
    website:extra.preferences?.website||'',social_url:extra.preferences?.social_url||''});
   setSettingsDraft({notify_replies:extra.preferences?.notify_replies!==false,notify_moderation:extra.preferences?.notify_moderation!==false});
  }catch(e){if(currentUser.current===owner)setError(e.message||'تعذّر تحميل الحساب.');}
  finally{if(currentUser.current===owner)setLoading(false);}
 },[page]);
 useEffect(()=>{setAccount(null);setWorkspace(emptyWorkspace);setProfileForm(null);if(user)fetchAll();else setLoading(false);},[user?.id,fetchAll]);
 const go=(id)=>{setTab(id);setNotice('');setError('');window.history.replaceState(null,'','/account'+(id==='overview'?'':'?tab='+id));};
 const run=async(action)=>{if(busy)return;setBusy(true);setNotice('');setError('');
  try{const result=await action();setNotice('تم حفظ التغيير بنجاح.');await fetchAll();return result;}
  catch(e){setError(e.message||'تعذّر إتمام العملية.');return null;}
  finally{setBusy(false);}
 };
 const request=(value)=>audienceRequest('/api/account/workspace',value);
 const totals=account?Object.fromEntries(['debate_comments','debate_questions','debate_suggestions','debate_votes'].map(k=>[k,account[k]?.total||0])):{};
 const totalParticipation=Object.values(totals).reduce((a,b)=>a+b,0);
 const profile=account?.profile;
 const activity=useMemo(()=>{
  if(!account)return [];
  const types=[['debate_comments','تعليق',MessageSquare],['debate_questions','سؤال',FileText],['debate_suggestions','مقترح مناظرة',HeartHandshake],['debate_votes','تصويت خاص',ShieldCheck]];
  const events=types.flatMap(([key,label])=>(account[key]?.items||[]).map(i=>({id:key+i.id,kind:label,title:i.debate_title||i.title||label,time:i.created_at,href:i.debate_slug?'/debates/'+i.debate_slug:'/account/activity',detail:key==='debate_votes'?'تصويت خاص لا يظهر للآخرين':(statusLabels[i.status]||'')})));
  events.push(...workspace.saved.map(i=>({id:'save'+i.id,kind:'حفظ مادة',title:i.title,time:i.created_at,href:i.href,detail:'ضمن محفوظات حسابك'})));
  return events.sort((a,b)=>new Date(b.time)-new Date(a.time));
 },[account,workspace.saved]);
 const saved=workspace.saved.filter(i=>filter==='all'||(filter.startsWith('group:')?i.collection_id===filter.slice(6):i.kind===filter));
 const kinds=[...new Set(workspace.saved.map(i=>i.kind))];
 async function saveProfile(e){e.preventDefault();if(!profileForm)return;
  await run(async()=>{
   await audienceRequest('/api/account',{action:'profile',data:{display_name:profileForm.display_name.trim(),avatar_url:profileForm.avatar_url||null,show_avatar:profileForm.show_avatar,accepted:!profile}});
   await request({action:'preferences',bio:profileForm.bio,governorate:profileForm.governorate,website:profileForm.website,social_url:profileForm.social_url,notify_replies:settingsDraft?.notify_replies??true,notify_moderation:settingsDraft?.notify_moderation??true,activity_tracking:false});
  });
 }
 async function uploadAvatar(file){
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){setError('اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 2 ميغابايت.');return;}
  setBusy(true);setError('');setNotice('');
  try{
   const db=browserDb();const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[file.type];
   const name=user.id+'/avatar-'+crypto.randomUUID()+'.'+ext;
   const {error:uploadError}=await db.storage.from('967-account-avatars').upload(name,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
   if(uploadError)throw new Error(uploadError.message||'تعذر رفع الصورة.');
   const {data}=db.storage.from('967-account-avatars').getPublicUrl(name);
   setProfileForm(f=>({...f,avatar_url:data.publicUrl}));
   setNotice('رُفعت الصورة. اضغط «حفظ الملف» لاعتمادها.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function exportData(){
  setBusy(true);setError('');
  try{
   const data=await audienceRequest('/api/account/workspace?export=1');
   const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;a.download='967-account-data.json';a.click();URL.revokeObjectURL(url);
   setNotice('تم تجهيز نسخة من بيانات الحساب المتاحة.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 if(!auth.ready)return <div className={styles.screenStatus} role="status">جارٍ التأكد من الحساب…</div>;
 if(!user)return <main className={styles.guest}><UserRound size={36}/><h1>مساحتك في 967</h1><p>سجّل الدخول للوصول إلى محفوظاتك ومجموعات القراءة ومساهمات المناظرات والإشعارات.</p><Link className={styles.primaryButton} href="/login?next=%2Faccount">تسجيل الدخول <ArrowLeft size={18}/></Link></main>;
 const headerName=profile?.display_name||user.user_metadata?.display_name||'عضو في 967';
 return <main className={styles.root} dir="rtl">
  <header className={styles.hero}>
   <div className={styles.heroInterior}>
    <div className={styles.avatar}>{profile?.avatar_url&&profile?.show_avatar?<Image unoptimized src={profile.avatar_url} width={62} height={62} alt="" onError={e=>{e.currentTarget.style.display='none';}}/>:<UserRound size={30}/>}</div>
    <div className={styles.heroCopy}><span className={styles.eyebrow}>مساحتك الشخصية في مبادرة 967</span><h1>مرحباً، {headerName}</h1><p>محتواك المفضّل، مساهماتك، وما يستحق العودة إليه.</p></div>
    <button type="button" className={styles.outlineLight} onClick={()=>go('settings')}><Settings2 size={17}/> الإعدادات</button>
   </div>
  </header>
  <div className={styles.shell}>
   <nav className={styles.sidebar} aria-label="أقسام الحساب">
    {views.map(({id,label,icon:Icon})=><button key={id} type="button" aria-current={tab===id?'page':undefined} className={tab===id?styles.activeNav:styles.navItem} onClick={()=>go(id)}><Icon size={18}/><span>{label}</span>{id==='notifications'&&workspace.unread>0&&<b>{workspace.unread}</b>}</button>)}
    <div className={styles.sidebarFooter}><Link href="/debates"><ArrowUpLeft size={16}/> تصفّح المناظرات</Link><Link href="/help"><ArrowUpLeft size={16}/> مركز المساعدة</Link></div>
   </nav>
   <div className={styles.main}>
    <div className={styles.sectionTop}><div><span className={styles.subtleEyebrow}>حسابي / {tabName(tab)}</span><h2>{tabName(tab)}</h2></div><button className={styles.refreshButton} type="button" disabled={busy||loading} onClick={fetchAll} aria-label="تحديث البيانات"><RefreshCw size={17}/></button></div>
    {notice&&<p className={styles.success} role="status"><CheckCircle2 size={17}/>{notice}<button aria-label="إغلاق" onClick={()=>setNotice('')}><X size={15}/></button></p>}
    {error&&<p className={styles.error} role="alert">{error} <button type="button" onClick={fetchAll}>إعادة المحاولة</button></p>}
    {loading&&!account?<div className={styles.loading}>جارٍ تحميل مساحتك الشخصية…</div>:account&&<>
     {profile?.deletion_requested_at&&<div className={styles.info}>طلب حذف الحساب قيد المعالجة لدى الإدارة.</div>}
     {profile?.suspended&&<div className={styles.error}>المشاركة موقوفة حالياً. تواصل مع إدارة المبادرة للاستفسار.</div>}
     {tab==='overview'&&<>
      <div className={styles.welcome}><div><span>مرحباً بعودتك</span><h3>كل ما يخصك في مكان واحد.</h3><p>اختر مادة للقراءة أو تابع مشاركاتك في الحوار.</p></div><Link href="/debates">اكتشف حواراً جديداً <ArrowLeft size={18}/></Link></div>
      <div className={styles.statGrid}>{[
       {label:'المواد المحفوظة',n:workspace.saved.length,icon:BookmarkCheck,to:'saved'},
       {label:'مشاركاتي',n:totalParticipation,icon:MessageSquare,to:'contributions'},
       {label:'الإشعارات الجديدة',n:workspace.unread,icon:Bell,to:'notifications'},
      ].map(({label,n,icon:Icon,to})=><button className={styles.stat} key={label} onClick={()=>go(to)}><Icon size={21}/><strong>{n.toLocaleString('ar')}</strong><span>{label}</span><ChevronLeft size={15} className={styles.statArrow}/></button>)}</div>
      <div className={styles.columns}><section className={styles.panel}><div className={styles.panelTitle}><h3>آخر نشاطاتك</h3><button type="button" onClick={()=>go('activity')}>الكل <ArrowLeft size={15}/></button></div>{activity.length?activity.slice(0,4).map(x=><Link key={x.id} className={styles.feedItem} href={x.href}><span className={styles.feedDot}/><span><strong>{x.kind}</strong><small>{x.title}</small></span><time>{simpleTime(x.time)}</time></Link>):<Empty icon={Clock3} text="ستظهر مشاركاتك ومحفوظاتك الجديدة هنا."/>}</section><section className={styles.panel}><div className={styles.panelTitle}><h3>محفوظات للعودة إليها</h3><button type="button" onClick={()=>go('saved')}>عرض الكل <ArrowLeft size={15}/></button></div>{workspace.saved.length?workspace.saved.slice(0,4).map(x=><Link key={x.id} className={styles.feedItem} href={x.href}><BookOpen size={17}/><span><strong>{x.title}</strong><small>فتح المادة</small></span><ArrowUpLeft size={15}/></Link>):<Empty icon={BookmarkCheck} text="لم تحفظ محتوى بعد. استخدم زر «للقراءة لاحقاً» داخل صفحات الموقع."/>}</section></div>
     </>}
     {tab==='saved'&&<section className={styles.panel}><div className={styles.panelTitle}><h3>مكتبتي الخاصة</h3><span className={styles.count}>{workspace.saved.length} / 100</span></div><p className={styles.hint}>محفوظات حسابك متاحة من أجهزتك بعد تسجيل الدخول. محفوظات المتصفح القديمة لا تُنقل دون موافقتك.</p>
      {local.items?.length>0&&<div className={styles.import}><div><strong>لديك {local.items.length} مادة محفوظة في هذا المتصفح.</strong><small>انقلها مرة واحدة إلى حسابك للاحتفاظ بها عبر الأجهزة. لن تُحذف النسخة المحلية.</small></div><button className={styles.secondaryButton} disabled={busy} onClick={()=>run(()=>request({action:'import',items:local.items.slice(0,100)}))}>استيراد المحفوظات</button></div>}
      <div className={styles.filters}><label>عرض حسب النوع<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">كل المواد</option>{kinds.map(k=><option key={k} value={k}>{k}</option>)}{workspace.collections.map(g=><option key={g.id} value={'group:'+g.id}>مجموعة: {g.name}</option>)}</select></label></div>
      {saved.length?saved.map(item=><div key={item.id} className={styles.savedItem}><BookmarkCheck size={19}/><Link href={item.href}>{item.title}<small>{item.kind} · {simpleTime(item.created_at)}</small></Link><label className={styles.smallSelect}>المجموعة<select aria-label={'مجموعة '+item.title} value={item.collection_id||''} disabled={busy} onChange={e=>run(()=>request({action:'move',href:item.href,collection_id:e.target.value||null}))}><option value="">بدون مجموعة</option>{workspace.collections.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><button className={styles.iconButton} aria-label={'إزالة '+item.title} disabled={busy} onClick={()=>run(()=>request({action:'remove',href:item.href,kind:item.kind,title:item.title}))}><Trash2 size={17}/></button></div>):<Empty icon={BookmarkCheck} text="لا توجد مواد في هذا التصنيف."/>}
     </section>}
     {tab==='collections'&&<section className={styles.panel}><div className={styles.panelTitle}><h3>رتّب محفوظاتك</h3><span className={styles.count}>{workspace.collections.length} / 20 مجموعة</span></div><p className={styles.hint}>مجموعات خاصة بك، لا يراها الزوار أو مستخدمو الحسابات الأخرى.</p><form className={styles.createCollection} onSubmit={e=>{e.preventDefault();run(()=>request({action:'collection_create',name:collectionDraft})).then(ok=>{if(ok)setCollectionDraft('')});}}><input required minLength={2} maxLength={80} value={collectionDraft} onChange={e=>setCollectionDraft(e.target.value)} placeholder="مثلاً: تاريخ اليمن، مجلات للقراءة…"/><button className={styles.primaryButton} disabled={busy||workspace.collections.length>=20}><Plus size={16}/> إنشاء مجموعة</button></form>
      {workspace.collections.length?workspace.collections.map(g=><div className={styles.groupRow} key={g.id}><BookOpen size={20}/><div><strong>{g.name}</strong><small>{workspace.saved.filter(x=>x.collection_id===g.id).length} مادة</small></div><button type="button" className={styles.secondaryButton} disabled={busy} onClick={()=>{const next=window.prompt('اسم المجموعة الجديد',g.name);if(next!==null)run(()=>request({action:'collection_rename',id:g.id,name:next}));}}>تعديل الاسم</button><button type="button" className={styles.iconButton} disabled={busy} aria-label={'حذف مجموعة '+g.name} onClick={()=>{if(window.confirm('حذف المجموعة؟ ستبقى المواد محفوظة دون مجموعة.'))run(()=>request({action:'collection_delete',id:g.id}));}}><Trash2 size={17}/></button></div>):<Empty icon={FolderPlus} text="أنشئ أول مجموعة لتنظيم قراءاتك."/>}
     </section>}
     {tab==='notifications'&&<section className={styles.panel}><div className={styles.panelTitle}><h3>تحديثات تهمك</h3><button type="button" disabled={busy||!workspace.notifications.some(x=>!x.read_at)} onClick={()=>run(()=>request({action:'notification_read',id:null}))}>تحديد الكل كمقروء</button></div><p className={styles.hint}>تصلك هنا الردود على تعليقاتك وتحديثات مراجعة مشاركات المناظرات. لا تُرسل رسائل بريد تلقائياً من هذه الصفحة.</p>{workspace.notifications.length?workspace.notifications.map(n=><div key={n.id} className={n.read_at?styles.noticeRead:styles.noticeUnread}><Bell size={19}/><div><strong>{n.title}</strong><p>{n.description}</p><small>{simpleTime(n.created_at)}</small></div>{n.href&&<Link href={n.href}>فتح <ArrowUpLeft size={15}/></Link>}{!n.read_at&&<button type="button" disabled={busy} onClick={()=>run(()=>request({action:'notification_read',id:n.id}))}>تمت القراءة</button>}</div>):<Empty icon={Inbox} text="لا توجد إشعارات حتى الآن."/>}</section>}
     {tab==='contributions'&&<section className={styles.panel}><h3>مشاركاتي في مناظرات 967</h3><p className={styles.hint}>يشمل هذا السجل تعليقاتك وأسئلتك ومقترحاتك وتصويتاتك الخاصة. رسائل «تواصل وشارك» القديمة غير مرتبطة حالياً بمعرّف حساب، فلا يمكن نسبتها إليك بأمان.</p>
      {[
       ['debate_comments','تعليقاتي',COMMENT_STATUSES],
       ['debate_questions','أسئلتي',QUESTION_STATUSES],
       ['debate_suggestions','مقترحاتي',SUGGESTION_STATUSES],
       ['debate_votes','تصويتاتي الخاصة',{}]
      ].map(([key,label,statuses])=><div className={styles.contributionBlock} key={key}><h4>{label} <span>{totals[key]||0}</span></h4>{(account[key]?.items||[]).length?(account[key].items.map(i=><article key={i.id} className={styles.contribution}><strong>{i.debate_title||i.title||label}</strong><p>{i.body||i.title||(key==='debate_votes'?'اختيارك محفوظ ويظل خاصاً بحسابك.':'')}</p><div><small>{statuses[i.status]||''}</small><time>{simpleTime(i.created_at)}</time>{i.debate_slug&&<Link href={'/debates/'+i.debate_slug}>المناظرة <ArrowUpLeft size={13}/></Link>}</div></article>)): <p className={styles.hint}>لا توجد مشاركات من هذا النوع في هذه الصفحة.</p>}</div>)}
      <div className={styles.pager}><button disabled={page<=1||busy} onClick={()=>setPage(x=>x-1)}>السابق</button><span>صفحة {page}</span><button disabled={busy||!Object.keys(totals).some(k=>totals[k]>page*20)} onClick={()=>setPage(x=>x+1)}>التالي</button></div>
     </section>}
     {tab==='activity'&&<section className={styles.panel}><h3>خط زمني شخصي</h3><p className={styles.hint}>هذا السجل مبني على مشاركاتك المحفوظة في المناظرات ومحتواك المحفوظ، ولا يسجل الصفحات التي تزورها في الخلفية.</p>{activity.length?activity.map(x=><Link key={x.id} className={styles.timelineItem} href={x.href}><span className={styles.timelineDot}/><div><strong>{x.kind}: {x.title}</strong><small>{x.detail}</small></div><time>{simpleTime(x.time)}</time></Link>):<Empty icon={Activity} text="لا يوجد نشاط محفوظ بعد."/>}</section>}
     {tab==='profile'&&<section className={styles.panel}><h3>ملفي الشخصي</h3>{profileForm&&<form className={styles.accountForm} onSubmit={saveProfile}>
      <div className={styles.pictureLine}><div className={styles.preview}>{profileForm.avatar_url?<Image unoptimized width={74} height={74} src={profileForm.avatar_url} alt="معاينة صورة الملف"/>:<UserRound size={28}/>}</div><div><label className={styles.uploadButton}><Upload size={16}/> رفع صورة جديدة<input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={e=>{uploadAvatar(e.target.files?.[0]);e.target.value='';}}/></label><small>حتى 2MB — تنشر ملفات الصور على رابط عام؛ يمكنك إخفاء ظهور الصورة بجوار التعليقات.</small></div></div>
      <div className={styles.formGrid}><label>اسم العرض *<input required minLength={2} maxLength={60} value={profileForm.display_name} onChange={e=>setProfileForm(f=>({...f,display_name:e.target.value}))}/></label><label>البريد الإلكتروني<input readOnly dir="ltr" value={user.email||''}/></label><label>المحافظة (اختيارية)<input maxLength={100} value={profileForm.governorate} onChange={e=>setProfileForm(f=>({...f,governorate:e.target.value}))}/></label><label>الموقع الشخصي<input type="url" placeholder="https://" maxLength={300} value={profileForm.website} onChange={e=>setProfileForm(f=>({...f,website:e.target.value}))}/></label><label className={styles.wide}>نبذة قصيرة<textarea maxLength={600} rows={4} value={profileForm.bio} onChange={e=>setProfileForm(f=>({...f,bio:e.target.value}))}/></label><label className={styles.wide}>رابط اجتماعي اختياري<input type="url" placeholder="https://" maxLength={300} value={profileForm.social_url} onChange={e=>setProfileForm(f=>({...f,social_url:e.target.value}))}/></label></div>
      <label className={styles.check}><input type="checkbox" checked={profileForm.show_avatar} onChange={e=>setProfileForm(f=>({...f,show_avatar:e.target.checked}))}/> إظهار صورتي مع تعليقاتي المنشورة</label>
      <button className={styles.primaryButton} disabled={busy}>{busy?'جارٍ الحفظ…':'حفظ الملف الشخصي'} <CheckCircle2 size={17}/></button>
     </form>}</section>}
     {tab==='settings'&&<div className={styles.stack}><section className={styles.panel}><h3>الخصوصية والإشعارات</h3><p className={styles.hint}>يمكنك تعطيل إشعارات الردود أو تحديث حالة مشاركاتك. تبقى تفاصيل التصويت الفردية خاصة.</p>{settingsDraft&&<form className={styles.accountForm} onSubmit={e=>{e.preventDefault();run(()=>request({action:'preferences',bio:workspace.preferences.bio||'',governorate:workspace.preferences.governorate||'',website:workspace.preferences.website||'',social_url:workspace.preferences.social_url||'',activity_tracking:false,...settingsDraft}));}}><label className={styles.check}><input type="checkbox" checked={settingsDraft.notify_replies} onChange={e=>setSettingsDraft(x=>({...x,notify_replies:e.target.checked}))}/> إشعارات الرد على تعليقاتي</label><label className={styles.check}><input type="checkbox" checked={settingsDraft.notify_moderation} onChange={e=>setSettingsDraft(x=>({...x,notify_moderation:e.target.checked}))}/> إشعارات مراجعة مشاركاتي</label><p className={styles.hint}>لا نُنشئ سجل زيارات أو قراءة دون موافقتك، ولا نُفعّل تتبعاً شخصياً عند تصفحك للموقع.</p><button className={styles.primaryButton} disabled={busy}>حفظ التفضيلات</button></form>}</section><section className={styles.panel}><h3>الأمان والبيانات</h3><div className={styles.settingRow}><div><strong>كلمة المرور</strong><p>إرسال رابط آمن إلى بريد حسابك لتغييرها.</p></div><Link className={styles.secondaryButton} href="/forgot-password">إعادة التعيين <ArrowUpLeft size={16}/></Link></div><div className={styles.settingRow}><div><strong>تصدير بيانات حسابي</strong><p>تنزيل ملف JSON خاص بك يتضمن الملف والمحفوظات والمساهمات المتاحة.</p></div><button type="button" disabled={busy} className={styles.secondaryButton} onClick={exportData}><Download size={16}/> تنزيل نسخة</button></div><div className={styles.settingRow}><div><strong>طلب حذف الحساب</strong><p>يرسل الطلب للإدارة. لن يُحذف الحساب فوراً.</p></div><button type="button" disabled={busy||!!profile?.deletion_requested_at} className={styles.dangerButton} onClick={()=>{if(window.confirm('تقديم طلب حذف الحساب؟ ستتوقف مشاركتك حتى معالجة الطلب من الإدارة.'))run(()=>audienceRequest('/api/account',{action:'deletion_request'}));}}>طلب الحذف <Trash2 size={16}/></button></div></section><button type="button" className={styles.logout} onClick={async()=>{await browserDb().auth.signOut();location.assign('/');}}>تسجيل الخروج <ArrowUpLeft size={16}/></button></div>}
    </>}
   </div>
  </div>
 </main>;
}
function Empty({icon:Icon,text}){return <div className={styles.empty}><Icon size={27}/><p>{text}</p></div>}

'use client';
import '@/app/debates.css';
import '@/app/admin-workspace.css';
import '@/app/inline-editor.css';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {ShieldCheck,Pencil,ClipboardList,LayoutDashboard,Power,Check,X,History,Link as LinkIcon,Flag} from 'lucide-react';
import {resolveInlineTarget,createInlineTarget,canEditInlineTarget} from '@/lib/inlineEditorTargets';
import useUnsavedChanges from '@/components/debates/useUnsavedChanges';
import {useInlineEditor} from './InlineEditorProvider';
import InlineDialog from './InlineDialog';
import InlineContentEditor from './InlineContentEditor';
import InlineDebateEditor from './InlineDebateEditor';
import InlineTaskForm from './InlineTaskForm';
import {InlineModerationPanel,InlineReviewQueue,InlineHistory,InlineAccountPanel} from './InlineModeration';

const titles={actions:'أدوات التحرير',debate:'تعديل المناظرة',content:'تعديل المحتوى',queue:'مشاركات تنتظر المراجعة',moderate:'الإشراف على المشاركة',history:'سجل الإجراءات',account:'إجراءات الحساب',task:'إنشاء مهمة من هذه الصفحة'};
export default function InlineEditorRuntime(){
 const editor=useInlineEditor(),{actor,enabled,panel,pageTarget,request,revision,open,close,setEnabled,refresh,notify,notice,sessionNotice,setPanelDirty,setPanelBusy}=editor;
 const pathname=usePathname(),search=useSearchParams(),router=useRouter(),[mobileOpen,setMobileOpen]=useState(false),[counts,setCounts]=useState(null),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[undoBusy,setUndoBusy]=useState(false),launcher=useRef(null),toolbar=useRef(null),countVersion=useRef(0);
 const fallback=useMemo(()=>resolveInlineTarget(pathname,search),[pathname,search]),target=pageTarget||fallback;
 const publicPage=!/^\/(admin|login|register|auth|forgot-password|update-password|account)(\/|$)/.test(pathname);
 useUnsavedChanges(dirty);
 const onDirtyChange=useCallback(value=>{setDirty(value);setPanelDirty(value);},[setPanelDirty]);
 const onBusyChange=useCallback(value=>{setBusy(value);setPanelBusy(value);},[setPanelBusy]);
 useEffect(()=>{setMobileOpen(false);},[panel?.type,panel?.target?.id,panel?.target?.kind]);
 useEffect(()=>{document.body.classList.toggle('inline-tools-visible',enabled&&publicPage);return()=>document.body.classList.remove('inline-tools-visible');},[enabled,publicPage]);
 useEffect(()=>{if(!enabled||!publicPage)return;const measure=()=>document.body.style.setProperty('--inline-toolbar-clearance',(innerWidth<=700?80:(toolbar.current?.getBoundingClientRect().height||54)+34)+'px');const observer=new ResizeObserver(measure);if(toolbar.current)observer.observe(toolbar.current);window.addEventListener('resize',measure);measure();return()=>{observer.disconnect();window.removeEventListener('resize',measure);document.body.style.removeProperty('--inline-toolbar-clearance');};},[enabled,publicPage]);
 useEffect(()=>{if(!mobileOpen)return;const key=event=>{if(event.key==='Escape'){setMobileOpen(false);launcher.current?.focus();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[mobileOpen]);
 useEffect(()=>{
  if(!enabled||!publicPage){setCounts(null);return;}
  let active=true;const guard=countVersion;
  const load=async()=>{const version=++countVersion.current;const params=new URLSearchParams({view:'counts'});if(target?.kind==='debate'&&target.id)params.set('debate',target.id);try{const result=await request('/api/admin/inline?'+params);if(active&&version===countVersion.current)setCounts(result);}catch{if(active&&version===countVersion.current)setCounts(null);}};
  load();const timer=setInterval(()=>{if(document.visibilityState==='visible')load();},30000);return()=>{active=false;guard.current++;clearInterval(timer);};
 },[enabled,publicPage,target?.kind,target?.id,request,revision]);
 const onSaved=useCallback(async(savedTarget,result,kind)=>{
  const change={...savedTarget,...(savedTarget.kind==='debate'?{debate_id:savedTarget.id}:{}),item:result.item||null};
  refresh(change);notify(kind==='task'?'أُنشئت المهمة.':'تم حفظ التغييرات.','success',result.undo_id?{id:result.undo_id,content:!['comments','questions','reports','debate'].includes(savedTarget.kind)}:null);
  if(kind!=='task'){window.dispatchEvent(new CustomEvent('967:inline-content-saved',{detail:{target:savedTarget,result}}));router.refresh();}
 },[refresh,notify,router]);
 async function undo(){if(undoBusy||!notice?.undo_id)return;setUndoBusy(true);try{const ref=notice.undo_id,result=await request('/api/admin/inline',{action:ref.content?'content_undo':'undo',id:ref.id});refresh({kind:result.item?.kind||target?.kind,id:result.item?.id||target?.id,debate_id:result.item?.debate_id,item:result.item});notify('تم التراجع وتسجيل الاستعادة.');router.refresh();}catch(err){notify(err.message,'error');}finally{setUndoBusy(false);}}
 if(!publicPage)return null;
 const editTarget=canEditInlineTarget(target)?target:null;
 const openEditor=()=>{if(editTarget)open({type:editTarget.kind==='debate'?'debate':'content',target:editTarget});};
 return <>
  {(!enabled||typeof window!=='undefined')&&<button ref={launcher} type="button" className={'inline-launcher'+(enabled?' inline-mobile-toggle':'')} aria-label={enabled?'قائمة وضع التحرير':'تفعيل وضع التحرير'} aria-expanded={enabled?mobileOpen:undefined} aria-controls={enabled?'inline-editor-toolbar':undefined} onClick={()=>enabled?setMobileOpen(value=>!value):setEnabled(true)}><ShieldCheck size={20}/><span>{enabled?'وضع التحرير':'تفعيل وضع التحرير'}</span></button>}
  {enabled&&<nav ref={toolbar} id="inline-editor-toolbar" className={'inline-editor-toolbar'+(mobileOpen?' inline-mobile-open':'')} aria-label="967 | وضع التحرير"><strong><bdi>967</bdi> | وضع التحرير</strong>{editTarget&&<button disabled={busy} onClick={openEditor}><Pencil size={16}/> تعديل الصفحة الحالية</button>}<button className="inline-review-count" aria-label="مشاركات تنتظر المراجعة" disabled={busy} onClick={()=>open({type:'queue',target:target?.kind==='debate'?target:null})}><Flag size={16}/>{counts?.total?counts.total+' طلبات مراجعة':'مشاركات تنتظر المراجعة'}</button>{counts?.total>0&&<small className="inline-muted">{counts.comments} تعليقات · {counts.questions} أسئلة · {counts.reports} بلاغات</small>}<button disabled={busy} onClick={()=>open({type:'task',target:target||createInlineTarget({kind:'page',href:pathname,title:document.title})})}><ClipboardList size={16}/> إنشاء مهمة من هذه الصفحة</button><a href="/admin/tasks">مركز المهام</a><a href={target?.adminHref||'/admin'}><LayoutDashboard size={16}/> لوحة التحرير</a><button disabled={busy} onClick={()=>setEnabled(false)}><Power size={16}/> تعطيل وضع التحرير</button>{mobileOpen&&<button onClick={()=>{setMobileOpen(false);launcher.current?.focus();}}><X size={16}/> إغلاق القائمة</button>}</nav>}
  {enabled&&notice&&!panel&&!mobileOpen&&<div className={'inline-toast '+notice.type} role={notice.type==='error'?'alert':'status'}><Check size={18}/><span>{notice.message}</span>{notice.undo_id&&<button disabled={undoBusy} onClick={undo}>{undoBusy?'جارٍ التراجع…':'تراجع'}</button>}<button aria-label="إغلاق الرسالة" onClick={()=>notify(null)}><X size={17}/></button></div>}
  {enabled&&panel&&<InlineDialog title={titles[panel.type]||'التحرير المباشر'} onClose={close} busy={busy} wide={['queue','debate','content'].includes(panel.type)}>
   {sessionNotice&&<p className="inline-error" role="alert">{sessionNotice}</p>}
   {notice&&<div className={'inline-panel-feedback '+notice.type} role={notice.type==='error'?'alert':'status'}><span>{notice.message}</span>{notice.undo_id&&<button className="btn btn-outline" disabled={undoBusy} onClick={undo}>{undoBusy?'جارٍ التراجع…':'تراجع'}</button>}<button className="inline-icon-button" aria-label="إغلاق الرسالة" onClick={()=>notify(null)}><X size={17}/></button></div>}
   {panel.type==='actions'&&<ActionList target={panel.target}/>}
   {panel.type==='debate'&&<InlineDebateEditor key={panel.target.id} target={panel.target} initialPublication={panel.initialPublication} onSaved={onSaved} onDirtyChange={onDirtyChange} onBusyChange={onBusyChange}/>}
   {panel.type==='content'&&<InlineContentEditor key={panel.target.kind+panel.target.id} target={panel.target} onSaved={onSaved} onDirtyChange={onDirtyChange} onBusyChange={onBusyChange}/>}
   {panel.type==='moderate'&&<InlineModerationPanel key={panel.target.kind+panel.target.id} target={panel.target} onSaved={onSaved} onDirtyChange={onDirtyChange} onBusyChange={onBusyChange}/>}
   {panel.type==='queue'&&<InlineReviewQueue target={panel.target} initialKind={panel.queueKind} initialStatus={panel.status} commentId={panel.commentId} onSaved={onSaved} onDirtyChange={onDirtyChange} onBusyChange={onBusyChange}/>}
   {panel.type==='history'&&<InlineHistory target={panel.target}/>}
   {panel.type==='account'&&<InlineAccountPanel target={panel.target} onSaved={onSaved} onDirtyChange={onDirtyChange} onBusyChange={onBusyChange}/>}
   {panel.type==='task'&&<InlineTaskForm key={panel.target.kind+panel.target.id} target={panel.target} onSaved={onSaved} onDirtyChange={onDirtyChange} onBusyChange={onBusyChange}/>}
  </InlineDialog>}
 </>;
}

function ActionList({target}){
 const {open,notify}=useInlineEditor(),debate=target.kind==='debate';
 const edit=()=>{if(canEditInlineTarget(target))open({type:debate?'debate':'content',target});};
 return <div className="inline-action-list"><p className="inline-muted">{target.title}</p><button onClick={edit}><Pencil size={17}/>{debate?'تعديل المناظرة':'تعديل البيانات'}</button>{debate&&<><button onClick={()=>open({type:'queue',target})}><Flag size={17}/> مشاركات تنتظر المراجعة</button><button onClick={()=>open({type:'debate',target:{...target,section:'polls'}})}>إدارة الاستطلاعات والنتائج</button><button onClick={()=>open({type:'debate',target,initialPublication:'hidden'})}>إخفاء المناظرة أو إلغاء نشرها</button></>}<a href={target.adminHref||'/admin'}><LayoutDashboard size={17}/> فتح الإدارة الكاملة</a>{!debate&&!['statistic','ranking'].includes(target.kind)&&<button onClick={()=>open({type:'history',target:{...target,content:true}})}><History size={17}/> سجل الإجراءات</button>}<button onClick={()=>open({type:'task',target})}><ClipboardList size={17}/> إنشاء مهمة مرتبطة</button><button onClick={async()=>{try{await navigator.clipboard.writeText(new URL(target.href||location.pathname,location.origin).href);notify('نُسخ رابط الصفحة.');}catch{notify('تعذر نسخ الرابط. يمكنك نسخه من شريط العنوان.','error');}}}><LinkIcon size={17}/> نسخ الرابط</button></div>;
}

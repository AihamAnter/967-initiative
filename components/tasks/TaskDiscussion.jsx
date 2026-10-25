'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {MessageCircle,Reply,Link2,Send,AtSign,Pencil,Trash2} from 'lucide-react';
import {taskThreads,taskCommentHref} from '@/lib/taskDiscussion';
import {formatNumber} from '@/lib/format';
import styles from './TaskCenter.module.css';

const date=value=>new Intl.DateTimeFormat('ar-u-nu-latn',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
export default function TaskDiscussion({task,comments,members,actor,busy,onMutate,focusedComment,onFocusComment,onDirtyChange}){
 const storageKey='967:task-discussion:'+actor.id+':'+task.id;
 const [body,setBody]=useState(''),[replyTo,setReplyTo]=useState(null),[mentions,setMentions]=useState([]),[editing,setEditing]=useState(null),[expanded,setExpanded]=useState(new Set()),[visible,setVisible]=useState(20),[mentionOpen,setMentionOpen]=useState(false),[ready,setReady]=useState(false);
 const rootRef=useRef(null),textarea=useRef(null),readingAnchor=useRef(null),focusHandled=useRef(null),liveDraft=useRef(null);
 liveDraft.current={body,replyTo,mentions};
 const threads=useMemo(()=>taskThreads(comments),[comments]),byId=useMemo(()=>new Map(comments.map(c=>[c.id,c])),[comments]),names=new Map(members.map(m=>[m.user_id,m.display_name]));
 const name=id=>names.get(id)||'عضو سابق',dirty=Boolean(body.trim()||editing?.body?.trim());
 useEffect(()=>{onDirtyChange?.(dirty);return()=>onDirtyChange?.(false);},[dirty,onDirtyChange]);
 useEffect(()=>{try{const draft=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(draft){setBody(typeof draft.body==='string'?draft.body.slice(0,5000):'');setReplyTo(draft.replyTo||null);setMentions(Array.isArray(draft.mentions)?draft.mentions:[]);if(draft.editing)setEditing(draft.editing);}}catch{}setReady(true);},[storageKey]);
 useEffect(()=>{if(!ready)return;try{if(body||replyTo||editing)sessionStorage.setItem(storageKey,JSON.stringify({body,replyTo,mentions,editing}));else sessionStorage.removeItem(storageKey);}catch{}},[ready,body,replyTo,mentions,editing,storageKey]);
 useEffect(()=>{
  const remember=()=>{const dialog=rootRef.current?.closest('dialog');if(!dialog)return;const top=dialog.getBoundingClientRect().top;
   const node=[...rootRef.current.querySelectorAll('[data-task-comment]')].find(el=>{const r=el.getBoundingClientRect();return r.top>=top&&r.top<top+dialog.clientHeight;});
   readingAnchor.current=node?{id:node.id,top:node.getBoundingClientRect().top,dialog}:null;
  };
  document.addEventListener('scroll',remember,true);return()=>document.removeEventListener('scroll',remember,true);
 },[]);
 useLayoutEffect(()=>{const anchor=readingAnchor.current,node=anchor&&document.getElementById(anchor.id);if(node&&anchor.dialog.isConnected)anchor.dialog.scrollTop+=node.getBoundingClientRect().top-anchor.top;},[comments]);
 useEffect(()=>{
  if(!focusedComment||focusHandled.current===focusedComment)return;
  const index=threads.findIndex(t=>t.root.id===focusedComment||t.replies.some(r=>r.id===focusedComment));if(index<0)return;
  setVisible(v=>Math.max(v,index+1));setExpanded(current=>new Set([...current,threads[index].root.id]));
  const frame=requestAnimationFrame(()=>requestAnimationFrame(()=>{const node=document.getElementById('task-comment-'+focusedComment);if(node){focusHandled.current=focusedComment;node.scrollIntoView({block:'center'});node.focus({preventScroll:true});}}));return()=>cancelAnimationFrame(frame);
 },[focusedComment,threads]);
 async function submit(event){event.preventDefault();if(busy||!body.trim())return;const submitted=JSON.stringify({body,replyTo,mentions});
  const result=await onMutate('comment_save',{body,parent_id:replyTo||null,mention_ids:mentions});
  if(result){if(JSON.stringify(liveDraft.current)===submitted){setBody('');setReplyTo(null);setMentions([]);}if(replyTo){const group=threads.find(t=>t.root.id===replyTo||t.replies.some(c=>c.id===replyTo));if(group)setExpanded(current=>new Set([...current,group.root.id]));}}
 }
 function reply(comment){setReplyTo(comment.id);const group=threads.find(t=>t.root.id===comment.id||t.replies.some(c=>c.id===comment.id));if(group)setExpanded(current=>new Set([...current,group.root.id]));textarea.current?.focus();}
 function mention(id){if(!id||mentions.includes(id))return;setMentions(values=>[...values,id]);setBody(text=>(text.trimEnd()+' @'+name(id)+' ').slice(0,5000));textarea.current?.focus();}
 function permalink(event,id){if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();focusHandled.current=null;onFocusComment?.(id);}
 function renderComment(comment,isReply=false){
  const parent=byId.get(comment.parent_id),canChange=!comment.deleted_at&&(actor.role==='management'||comment.author_id===actor.id);
  return <article key={comment.id} id={'task-comment-'+comment.id} data-task-comment tabIndex={-1} className={`${styles.discussionPost} ${isReply?styles.discussionReply:''} ${focusedComment===comment.id?styles.focusedPost:''}`}>
   <header><span className={styles.memberInitial} aria-hidden="true">{name(comment.author_id).trim().charAt(0)}</span><div><strong>{name(comment.author_id)}</strong><time dateTime={comment.created_at}>{date(comment.created_at)}{comment.edited_at&&!comment.deleted_at?' · عُدّل':''}</time></div><a href={taskCommentHref(task.id,comment.id)} aria-label="رابط هذه المشاركة" onClick={e=>permalink(e,comment.id)}><Link2 size={16}/></a></header>
   {isReply&&parent&&<small className={styles.replyContext}>رد على {name(parent.author_id)}</small>}
   {editing?.id===comment.id?<form onSubmit={async e=>{e.preventDefault();if(await onMutate('comment_save',{id:comment.id,comment_revision:editing.revision,body:editing.body,mention_ids:comment.mention_ids||[]}))setEditing(null);}}><label>تعديل المشاركة<textarea required rows={5} maxLength={5000} value={editing.body} onChange={e=>setEditing(current=>({...current,body:e.target.value}))}/></label><div className={styles.actions}><button className={styles.primary} disabled={busy}>حفظ التعديل</button><button type="button" className={styles.secondary} disabled={busy} onClick={()=>setEditing(null)}>إلغاء التعديل</button></div></form>:<p className={`${styles.prose} ${comment.deleted_at?styles.deletedComment:''}`}>{comment.deleted_at?'تم حذف هذا التعليق. بقيت الردود في مكانها.':comment.body}</p>}
   {!comment.deleted_at&&<footer className={styles.actions}><button type="button" className={styles.textButton} disabled={busy} onClick={()=>reply(comment)}><Reply size={15}/> رد</button>{canChange&&<><button type="button" className={styles.textButton} disabled={busy} onClick={()=>setEditing({id:comment.id,body:comment.body,revision:comment.revision})}><Pencil size={14}/> تعديل</button><button type="button" className={styles.textButton} disabled={busy} onClick={async()=>{if(confirm('حذف نص المشاركة؟ تبقى الردود وسجل النشاط محفوظين.')){if(await onMutate('comment_delete',{id:comment.id,comment_revision:comment.revision})&&editing?.id===comment.id)setEditing(null);}}}><Trash2 size={14}/> حذف</button></>}{comment.edited_at&&<small title={date(comment.edited_at)}>آخر تعديل {date(comment.edited_at)}</small>}</footer>}
  </article>;
 }
 return <section className={styles.discussion} id="task-discussion" ref={rootRef} aria-labelledby="task-discussion-heading">
  <header className={styles.discussionHeading}><div><span className={styles.eyebrow}>نناقش العمل، ونحفظ سياقه</span><h3 id="task-discussion-heading"><MessageCircle size={21}/> مناقشة المهمة</h3></div><span>{formatNumber(comments.filter(c=>!c.deleted_at).length)} مشاركة</span></header>
  <form className={styles.discussionComposer} onSubmit={submit}>
   {replyTo&&<div className={styles.replyingTo}><span>ترد على {name(byId.get(replyTo)?.author_id)}{byId.get(replyTo)?.deleted_at?' · حُذفت المشاركة؛ اختر مشاركة أخرى':''}</span><button type="button" className={styles.textButton} onClick={()=>setReplyTo(null)}>إلغاء الرد</button></div>}
   <label htmlFor="task-discussion-body">{replyTo?'اكتب ردك':'أضف فكرة أو تحديثًا للفريق'}</label><textarea id="task-discussion-body" ref={textarea} required maxLength={5000} rows={5} value={body} onChange={e=>{setBody(e.target.value);if(e.target.value.endsWith('@'))setMentionOpen(true);}} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();if(!busy)e.currentTarget.form?.requestSubmit();}}} placeholder="اكتب بوضوح، واربط تعليقك بما يساعد على إنجاز المهمة…" aria-describedby="task-comment-hint"/>
   <div className={styles.composerTools}><button type="button" className={styles.textButton} onClick={()=>setMentionOpen(value=>!value)} aria-expanded={mentionOpen}><AtSign size={16}/> الإشارة إلى عضو</button><small>{formatNumber(body.length)} / 5,000</small></div>
   {mentionOpen&&<label>اختر عضوًا للإشارة إليه<select aria-label="العضو المشار إليه" value="" onChange={e=>mention(e.target.value)}><option value="">اختر من أعضاء الفريق</option>{members.filter(m=>m.user_id!==actor.id&&!mentions.includes(m.user_id)).map(m=><option key={m.user_id} value={m.user_id}>{m.display_name} · {m.role==='management'?'الإدارة':'محرر'}</option>)}</select></label>}
   {mentions.length>0&&<div className={styles.mentionChips}>{mentions.map(id=><button type="button" key={id} onClick={()=>setMentions(list=>list.filter(value=>value!==id))} aria-label={'إلغاء تنبيه '+name(id)}>@{name(id)} ×</button>)}</div>}
   <footer className={styles.composerFooter}><small id="task-comment-hint">تبقى مسودتك في هذه الجلسة إذا فشل الإرسال. Ctrl+Enter للإرسال.</small><button type="submit" className={styles.primary} disabled={busy||!body.trim()||Boolean(replyTo&&byId.get(replyTo)?.deleted_at)}><Send size={16}/>{busy?'جارٍ الإرسال…':replyTo?'إرسال الرد':'إرسال التعليق'}</button></footer>
  </form>
  {!threads.length&&<p className={styles.emptyDiscussion}>ابدأ النقاش مع الفريق حول هذه المهمة.</p>}
  <div className={styles.discussionThreads}>{threads.slice(0,visible).map(thread=><div className={styles.discussionThread} key={thread.root.id}>{renderComment(thread.root)}{thread.replies.length>0&&<><button type="button" className={styles.threadToggle} aria-expanded={expanded.has(thread.root.id)} aria-controls={'task-replies-'+thread.root.id} onClick={()=>setExpanded(current=>{const next=new Set(current);if(next.has(thread.root.id))next.delete(thread.root.id);else next.add(thread.root.id);return next;})}>{expanded.has(thread.root.id)?'إخفاء الردود':'إظهار الردود'} · عدد الردود: {formatNumber(thread.replies.length)}</button><div id={'task-replies-'+thread.root.id} hidden={!expanded.has(thread.root.id)} className={styles.threadReplies}>{thread.replies.map(comment=>renderComment(comment,true))}</div></>}</div>)}</div>
  {visible<threads.length&&<button type="button" className={styles.secondary} onClick={()=>setVisible(v=>v+20)}>عرض المزيد من المناقشات ({formatNumber(threads.length-visible)})</button>}
 </section>;
}

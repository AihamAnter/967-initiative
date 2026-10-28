'use client';
import {useCallback,useEffect,useState} from 'react';
import {BookOpenCheck,ExternalLink,Plus,RefreshCcw,Save,Trash2} from 'lucide-react';
import {quizCategories,difficultyLabels} from '@/lib/gameQuestions';
import styles from './GamesAdminPanel.module.css';
import useAdminEditor from './admin/useAdminEditor';

function newQuestion(){return {id:'custom-'+Date.now().toString(36),question:'',options:['','','',''],correct:0,category:'history',difficulty:1,explanation:'',source:{title:'',url:''},isPublished:false};}
export default function GamesAdminPanel({db,canDelete=false}){
 const [questions,setQuestions]=useState([]),[revision,setRevision]=useState(null),[form,setForm]=useState(null),[saved,setSaved]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[filter,setFilter]=useState('');
 const editor=useAdminEditor({db,kind:'page',id:form?.id?'game-'+form.id:null,value:form,onRestore:setForm});
 const dirty=editor.dirty;
 const api=useCallback(async(method='GET',body)=>{
  const {data:{session}}=await db.auth.getSession();
  if(!session?.access_token)throw Error('سجّل الدخول مجدداً.');
  const response=await fetch('/api/admin/games',{method,headers:{Authorization:'Bearer '+session.access_token,...(body?{'Content-Type':'application/json'}:{})},cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({error:'تعذر قراءة استجابة الخادم.'}));
  if(!response.ok)throw Error(data.error||'تعذر تحميل الأسئلة.');
  return data;
 },[db]);
 const select=q=>{setForm(structuredClone(q));setSaved(JSON.stringify(q));setNotice('');editor.markClean(q);};
 const checkLeave=()=>editor.confirm();
 const load=useCallback(async()=>{
  setLoading(true);
  try{const data=await api();setQuestions(data.questions);setRevision(data.revision);const next=data.questions[0]||newQuestion();setForm(structuredClone(next));setSaved(JSON.stringify(next));editor.markClean(next);setNotice('');}
  catch(error){setNotice('خطأ: '+error.message);}
  finally{setLoading(false);}
 },[api,editor.markClean]);
 useEffect(()=>{load();},[load]);

 const patch=(key,value)=>setForm(previous=>({...previous,[key]:value}));
 const choose=q=>{if(checkLeave())select(q);};
 async function save(e){
  e.preventDefault();if(busy||!form)return;
  setBusy(true);setNotice('');
  try{
   const data=await api('PUT',{revision,question:form});
   setQuestions(data.questions);setRevision(data.revision);
   const next=data.questions.find(q=>q.id===form.id);select(next);await editor.clearDraft();
   setNotice('تم حفظ السؤال. تحديات الزوار الجديدة ستستخدم النسخة المنشورة.');
  }catch(error){setNotice('خطأ: '+error.message);}finally{setBusy(false);}
 }
 async function remove(){
  if(!form||!canDelete||!form.id.startsWith('custom-')||!checkLeave()||!window.confirm('حذف السؤال الإضافي نهائياً؟'))return;
  setBusy(true);
  try{const result=await api('DELETE',{revision,id:form.id});setQuestions(result.questions);setRevision(result.revision);select(result.questions[0]||newQuestion());setNotice('تم حذف السؤال.');}
  catch(error){setNotice('خطأ: '+error.message);}finally{setBusy(false);}
 }
 const filtered=questions.filter(q=>(q.question+' '+q.id+' '+quizCategories[q.category]).includes(filter));
 return <section className={styles.root}>
  <header className={styles.header}><div><h2><BookOpenCheck size={24}/> إدارة ألعاب 967</h2><p>بنك أسئلة «اختبر معرفتك باليمن». راجع الإجابات والمصادر أولاً، ثم انشر الأسئلة. يمكن إخفاء الأسئلة الأساسية دون حذفها.</p></div><button type="button" className="btn btn-outline" onClick={()=>{if(checkLeave())load();}} disabled={busy}><RefreshCcw size={16}/> تحديث</button></header>
  {notice&&<p role={notice.startsWith('خطأ')?'alert':'status'} className={styles.notice}>{notice}</p>}
  {loading?<p role="status">جارٍ تحميل بنك الأسئلة…</p>:<div className={styles.layout}>
   <aside className={styles.list}>
    <div className={styles.listHead}><h3>الأسئلة ({questions.length})</h3><button type="button" onClick={()=>{if(checkLeave())select(newQuestion());}} disabled={busy}><Plus size={16}/> سؤال جديد</button></div>
    <label className={styles.search}>بحث في الأسئلة <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="بحث بالعنوان أو التصنيف"/></label>
    <div className={styles.items}>{filtered.map(q=><button type="button" key={q.id} className={form?.id===q.id?styles.active:''} onClick={()=>choose(q)}><strong>{q.question}</strong><small>{quizCategories[q.category]} · {q.isPublished?'منشور':'مسودة'}</small></button>)}</div>
   </aside>
   {form&&<form className={styles.form} onSubmit={save}>
    <div className={styles.formHead}><h3>تحرير السؤال</h3><span>{form.id}</span></div>
    <fieldset disabled={busy}>
     <label className={styles.field}>نص السؤال <textarea rows={3} minLength={15} maxLength={240} required value={form.question} onChange={e=>patch('question',e.target.value)}/></label>
     <div className={styles.pair}><label className={styles.field}>القسم<select value={form.category} onChange={e=>patch('category',e.target.value)}>{Object.entries(quizCategories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className={styles.field}>الصعوبة<select value={form.difficulty} onChange={e=>patch('difficulty',Number(e.target.value))}>{Object.entries(difficultyLabels).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label></div>
     <div className={styles.answers}><h4>الاختيارات والإجابة الصحيحة</h4><p>اختر الدائرة المجاورة للإجابة الصحيحة.</p>
      {form.options.map((option,i)=><label key={i} className={styles.option}><input type="radio" name="correct" checked={form.correct===i} onChange={()=>patch('correct',i)}/><span>{['أ','ب','ج','د'][i]}</span><input aria-label={'الخيار '+(i+1)} required maxLength={135} value={option} onChange={e=>patch('options',form.options.map((value,j)=>j===i?e.target.value:value))}/></label>)}
     </div>
     <label className={styles.field}>شرح الإجابة (25 حرفاً على الأقل)<textarea required minLength={25} maxLength={1100} rows={5} value={form.explanation} onChange={e=>patch('explanation',e.target.value)}/></label>
     <div className={styles.pair}><label className={styles.field}>عنوان المصدر<input required maxLength={200} value={form.source?.title||''} onChange={e=>patch('source',{...form.source,title:e.target.value})}/></label><label className={styles.field}>رابط المصدر (HTTPS)<input type="url" dir="ltr" required pattern="https://.*" value={form.source?.url||''} onChange={e=>patch('source',{...form.source,url:e.target.value})}/></label></div>
     <label className={styles.publish}><input type="checkbox" checked={form.isPublished} onChange={e=>patch('isPublished',e.target.checked)}/> نشر السؤال للزوار</label>
    </fieldset>
    <div className={styles.actions}><button className="btn btn-red" disabled={busy} type="submit"><Save size={16}/> حفظ السؤال</button>{canDelete&&form.id.startsWith('custom-')&&questions.some(q=>q.id===form.id)&&<button type="button" className="btn btn-outline" onClick={remove} disabled={busy}><Trash2 size={16}/> حذف</button>}{form.source.url&&<a href={form.source.url} rel="noopener noreferrer" target="_blank">فتح المصدر <ExternalLink size={15}/></a>}{dirty&&<span className={styles.dirty}>تعديلات غير محفوظة</span>}{editor.draft&&<button className="btn btn-outline" type="button" onClick={editor.restoreDraft}>استعادة مسودة</button>}</div>
   </form>}
  </div>}
 </section>;
}

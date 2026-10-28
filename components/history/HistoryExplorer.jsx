'use client';
import {useMemo,useState,useEffect} from 'react';
import Link from '@/components/SiteLink';
import {ArrowUpLeft,BookOpen,CalendarDays,MapPinned,Search,ScrollText,SlidersHorizontal,Layers,GitCompareArrows} from 'lucide-react';
import {historyEras,historyKinds,historyEntryPath,historyYear} from '@/lib/yemenHistory';
import styles from './HistoryExplorer.module.css';
import HistoryTimeline from './HistoryTimeline';
import HistoryMedia from './HistoryMedia';

function normalized(s){return String(s||'').normalize('NFKD').replace(/[\u064B-\u065F]/g,'').replace(/[أإآ]/g,'ا').toLowerCase();}
export default function HistoryExplorer({entries,initialEra='',initialType=''}) {
 const [era,setEra]=useState(initialEra),[type,setType]=useState(initialType),[query,setQuery]=useState(''),[mode,setMode]=useState('timeline'),[more,setMore]=useState(12);
 const [first,setFirst]=useState(''),[second,setSecond]=useState('');
 useEffect(()=>{
  const onBack=()=>{const p=new URLSearchParams(location.search);setEra(p.get('era')||'');setType(p.get('type')||'');};
  addEventListener('popstate',onBack);return()=>removeEventListener('popstate',onBack);
 },[]);
 const change=(nextEra,nextType)=>{
  setEra(nextEra);setType(nextType);setMore(12);
  const p=new URLSearchParams(location.search);
  if(nextEra)p.set('era',nextEra);else p.delete('era');
  if(nextType)p.set('type',nextType);else p.delete('type');
  history.replaceState(history.state,'',location.pathname+(p.size?'?'+p:''));
 };
 const published=useMemo(()=>entries.filter(e=>e.isPublished!==false),[entries]);
 const selected=useMemo(()=>published.filter(e=>(!era||e.era===era)&&(!type||e.kind===type)&&(!query||normalized([e.title,e.summary,e.period,e.location].join(' ')).includes(normalized(query)))),[published,era,type,query]);
 const states=published.filter(e=>e.kind==='state');
 const a=states.find(e=>e.slug===first),b=states.find(e=>e.slug===second);
 return <div className={styles.wrap}>
  <div className={styles.eras} aria-label="اختر عصراً تاريخياً لاستكشاف محطاته على الخط الزمني">
   {historyEras.map((item,index)=><button key={item.id} className={era===item.id?styles.eraSelected:styles.era} type="button" onClick={()=>change(era===item.id?'':item.id,type)} aria-pressed={era===item.id}>
    <span className={styles.eraNumber}>{String(index+1).padStart(2,'0')}</span>
    <strong>{item.title}</strong><small>{item.period}</small>
   </button>)}
  </div>
  <section className={styles.intro}>
   <div><span className="eyebrow">رحلة عبر الزمن</span><h2>{era?historyEras.find(x=>x.id===era)?.title:'العصور والدول والأحداث'}</h2><p>{era?historyEras.find(x=>x.id===era)?.summary:'اقرأ الأحداث والسير والآثار في سياقها الزمني، مع إظهار المصادر والفترات التقريبية.'}</p></div>
   <div className={styles.stats}><span><strong>{published.length.toLocaleString('ar')}</strong> مادة معرفية</span><span><strong>{historyEras.length.toLocaleString('ar')}</strong> عصور</span></div>
  </section>
  <section className={styles.controls} aria-label="خيارات استكشاف تاريخ اليمن">
   <label className={styles.search}><Search size={19}/><span className="sr-only">بحث في تاريخ اليمن</span><input value={query} onChange={e=>{setQuery(e.target.value);setMore(12);}} placeholder="ابحث عن دولة أو حدث أو موقع..." maxLength={120}/></label>
   <label className={styles.select}><SlidersHorizontal size={17}/><span className="sr-only">نوع المحتوى</span><select value={type} onChange={e=>change(era,e.target.value)}><option value="">جميع الموضوعات</option>{Object.entries(historyKinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <div className={styles.viewModes} role="group" aria-label="طريقة العرض"><button type="button" className={mode==='cards'?styles.active:''} aria-pressed={mode==='cards'} onClick={()=>setMode('cards')}><Layers size={17}/> البطاقات</button><button type="button" className={mode==='timeline'?styles.active:''} aria-pressed={mode==='timeline'} onClick={()=>setMode('timeline')}><CalendarDays size={17}/> الخط الزمني</button></div>
  </section>
  <div className={styles.resultCount} role="status">المواد المطابقة: <strong>{selected.length.toLocaleString('ar')}</strong> {era&&<button onClick={()=>change('',type)} type="button">جميع العصور ×</button>}</div>
  {selected.length===0?<div className={styles.empty}>لا توجد مواد مطابقة. جرّب إزالة الفلاتر أو استخدام عبارة أخرى. <button type="button" onClick={()=>{change('','');setQuery('');}}>إعادة ضبط البحث</button></div>:mode==='timeline'?<HistoryTimeline entries={selected}/>:<div className={styles.cards}>{selected.slice(0,more).map((entry,i)=><article key={entry.slug} className={styles.card}>
    <div className={styles.cardTop}><span className={styles.kind}>{historyKinds[entry.kind]}</span><span className={styles.date}>{historyYear(entry.year)}</span></div>
    <HistoryMedia entry={entry} variant="thumbnail"/>
    <h3><Link href={historyEntryPath(entry.slug)}>{entry.title}</Link></h3><small className={styles.period}>{entry.period}</small>
    <p>{entry.summary}</p>
    <div className={styles.cardBottom}><span><BookOpen size={15}/> {entry.sources?.length||0} مصادر</span>{entry.location&&<span><MapPinned size={15}/>{entry.location}</span>}<Link href={historyEntryPath(entry.slug)} aria-label={'قراءة '+entry.title}>اقرأ الملف <ArrowUpLeft size={16}/></Link></div>
   </article>)}</div>}
  {mode==='cards'&&selected.length>more&&<button className={styles.more} type="button" onClick={()=>setMore(x=>x+12)}>عرض المزيد ({Math.min(12,selected.length-more).toLocaleString('ar')})</button>}
  <section id="compare" className={styles.compare} aria-labelledby="history-compare-heading">
   <div><span className="eyebrow">معرفة في سياقها</span><h2 id="history-compare-heading"><GitCompareArrows size={24}/> قارن بين دولتين</h2><p>قارن التواريخ التقريبية ومراكز الارتباط والمراجع، دون افتراض تطابق الحدود القديمة مع الخريطة الحديثة.</p></div>
   <div className={styles.compareSelectors}><label>الدولة الأولى<select value={first} onChange={e=>setFirst(e.target.value)}><option value="">اختر دولة</option>{states.map(x=><option key={x.slug} value={x.slug}>{x.title}</option>)}</select></label><label>الدولة الثانية<select value={second} onChange={e=>setSecond(e.target.value)}><option value="">اختر دولة</option>{states.map(x=><option key={x.slug} value={x.slug}>{x.title}</option>)}</select></label></div>
   {a&&b&&(a.slug!==b)?<div className={styles.compareGrid}>{[a,b].map(x=><div key={x.slug}><h3>{x.title}</h3><dl><dt>الفترة</dt><dd>{x.period}</dd><dt>التاريخ المرجعي</dt><dd>{historyYear(x.year)}</dd><dt>المكان المرتبط</dt><dd>{x.location||'مناطق متعددة'}</dd><dt>المصادر</dt><dd>{x.sources?.length||0}</dd></dl><Link href={historyEntryPath(x.slug)}>الملف الكامل <ArrowUpLeft size={15}/></Link></div>)}</div>:<p className={styles.compareHint}>اختر دولتين مختلفتين لعرض المقارنة.</p>}
  </section>
  <section className={styles.evidence}><ScrollText size={24}/><div><h2>كيف نعرف ما حدث؟</h2><p>نعتمد في المواد على النقوش والمواقع الأثرية والدراسات التاريخية والمراجع المنشورة. التواريخ القديمة تقريبية وقد تتداخل الممالك والدول؛ لا تعرض الخريطة الحالية حدوداً سياسية قديمة.</p></div></section>
 </div>;
}

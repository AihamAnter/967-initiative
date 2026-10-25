'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {taskApi} from '@/lib/taskClient';
export default function TaskSummary({db}){
 const [summary,setSummary]=useState(null);
 useEffect(()=>{const controller=new AbortController();taskApi(db,{params:'summary=1&tz='+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'),signal:controller.signal}).then(result=>setSummary(result.summary)).catch(()=>{});return()=>controller.abort();},[db]);
 return <section className="admin-panel" style={{marginBottom:20}} aria-label="ملخص مهام الفريق"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}><div><h2 style={{marginBottom:6}}>مركز المهام</h2>{summary&&<p style={{fontSize:13,margin:0}}>مهامي اليوم: {summary.mine_today.toLocaleString('ar-u-nu-latn',{numberingSystem:'latn'})} · المتأخرة: {summary.overdue.toLocaleString('ar-u-nu-latn',{numberingSystem:'latn'})} · غير المكتملة: {summary.open.toLocaleString('ar-u-nu-latn',{numberingSystem:'latn'})}</p>}<p className="small-muted">التذكيرات داخل مركز المهام عند فتحه، ولا ترسل إشعارات خارج الموقع.</p>{summary?.overdue>0&&<Link className="text-link" href="/admin/tasks?scope=overdue">{summary.overdue.toLocaleString('ar-u-nu-latn',{numberingSystem:'latn'})} مهمة متأخرة تحتاج متابعة</Link>}</div><Link className="btn btn-outline" href="/admin/tasks"><span className="task-summary-full">فتح مركز المهام</span><span className="task-summary-short">المهام</span></Link></div></section>;
}

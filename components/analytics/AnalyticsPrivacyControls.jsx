'use client';
import {useEffect,useState} from 'react';
const KEY='967-analytics-opt-out';
export default function AnalyticsPrivacyControls(){
 const [choice,setChoice]=useState(null);
 useEffect(()=>{try{setChoice(localStorage.getItem(KEY)==='1');}catch{setChoice(true);}},[]);
 function toggle(){
  const next=!choice;
  try{if(next)localStorage.setItem(KEY,'1');else localStorage.removeItem(KEY);setChoice(next);}
  catch{setChoice(true);}
 }
 return <section className="container" aria-labelledby="privacy-analytics" style={{paddingBlock:'20px 40px'}}>
  <div style={{padding:'24px',border:'1px solid var(--line)',borderRadius:'12px',background:'var(--surface)'}}>
   <h2 id="privacy-analytics" style={{fontSize:'23px'}}>تحليلات الاستخدام وخصوصيتك</h2>
   <p style={{lineHeight:1.9,fontSize:'14px'}}>نقيس مشاهدات أقسام الموقع وعمليات البحث بلا نتائج على شكل عدادات يومية مجمّعة، لتحسين الخدمة. لا نحتفظ في جدول التحليلات بعناوين IP أو معرّفات الزوار أو الروابط التفصيلية أو نصوص البحث. ولا نستخدم ملفات تعريف الارتباط لهذه العدادات. يحترم النظام إشارة منع التتبع في متصفحك.</p>
   <p style={{lineHeight:1.9,fontSize:'13px'}}>يمكنك تعطيل إرسال هذه العدادات من متصفحك. يُحفظ اختيارك في هذا الجهاز فقط؛ ولا يمكن إلغاء الأعداد المجمّعة سابقًا لأنها لا ترتبط بحسابك.</p>
   {choice===null?<p role="status">جارٍ قراءة تفضيل الخصوصية…</p>:<button type="button" onClick={toggle} className="btn btn-outline" aria-pressed={choice} style={{minHeight:'44px'}}>{choice?'إعادة السماح بالعدّ المجمّع':'تعطيل العدّ المجمّع على هذا الجهاز'}</button>}
   {choice!==null&&<p role="status" style={{fontSize:'12px',color:'var(--muted)',marginTop:'10px'}}>{choice?'تم تعطيل إرسال تحليلات الاستخدام من هذا المتصفح.':'تحليلات الاستخدام المجمّعة مفعلة؛ يمكنك تعطيلها في أي وقت.'}</p>}
  </div>
 </section>;
}

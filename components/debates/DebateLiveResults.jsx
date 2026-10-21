'use client';
import DebateDisclosure from './DebateDisclosure';
const number=value=>new Intl.NumberFormat('ar-YE-u-nu-latn',{maximumFractionDigits:1}).format(value);
export default function DebateLiveResults({data,loading,error,refresh,debateType='prerecorded'}){
 if(!loading&&!error&&!data)return null;
 const results=data?.results||{},phases=['before','after'].filter(phase=>results[phase]);
 if(!loading&&!error&&!phases.length)return null;
 return <DebateDisclosure id="results" title="نتائج الاستطلاع" description="مباشرة · تتحدث تلقائياً"><p className="small-muted">تعكس النتائج آراء المشاركين فقط، دون عرض اختياراتهم الفردية.</p>
  {loading&&<p role="status">جارٍ تحميل النتائج…</p>}{error&&<p role="status">{error} {data&&'المعروض آخر نتيجة متاحة.'} <button className="btn btn-outline" onClick={refresh}>إعادة المحاولة</button></p>}
  <div className="debate-poll-grid" aria-live="polite">{phases.map(phase=>{const result=results[phase];return <div key={phase} data-results-phase={phase}><h3>{phase==='before'?(debateType==='prerecorded'?'قبل المشاهدة':'قبل المناظرة'):(debateType==='prerecorded'?'بعد المشاهدة':'بعد المناظرة')}</h3><p className="debate-result-total">إجمالي الأصوات: <bdi>{number(result.participants)}</bdi></p>{result.participants===0&&<p className="small-muted">لم تُسجّل أصوات بعد.</p>}{result.options.map(option=><div className="debate-result" key={option.option_id} data-result-option={option.option_id}><div><span>{option.label}</span><bdi>{number(option.count)} صوت · {number(option.percent)}٪</bdi></div><div className="debate-result-track" aria-hidden="true"><span style={{width:option.percent+'%'}}/></div></div>)}</div>;})}</div>
  {results.before&&results.after&&results.before.participants>0&&results.after.participants>0&&<div><h3>تغيّر النسب بين المرحلتين</h3><p className="small-muted">قد يختلف عدد المشاركين بين المرحلتين.</p>{results.after.options.map(option=>{const before=results.before.options.find(o=>o.option_id===option.option_id);if(!before)return null;const difference=Math.round((option.percent-before.percent)*10)/10;return <p key={option.option_id}>{option.label}: <bdi>{difference>0?'+':''}{number(difference)}</bdi> نقطة مئوية</p>;})}</div>}
  {results.paired&&<p>صوّت في المرحلتين <bdi>{number(results.paired.participants)}</bdi> مستخدماً؛ غيّر <bdi>{number(results.paired.changed_percent)}٪</bdi> منهم اختيارهم.</p>}
 </DebateDisclosure>;
}

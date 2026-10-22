'use client';
import {useEffect,useRef} from 'react';
const number=value=>typeof value==='number'&&Number.isFinite(value)?new Intl.NumberFormat('ar-YE-u-nu-latn',{maximumFractionDigits:1}).format(value):'—';
const phaseLabel=phase=>phase==='before'?'قبل المشاهدة':'بعد المشاهدة';

function ResultPhase({result,phase}){
 return <section className="debate-results-phase" data-results-phase={phase}><h3>النتائج — {phaseLabel(phase)}</h3><p className="debate-result-total">إجمالي الأصوات: <bdi>{number(result.participants)}</bdi>{result.approximate&&' · أرقام تقريبية'}</p>{result.participants===0&&<p className="small-muted">لم تُسجّل أصوات بعد.</p>}{(result.options||[]).map(option=><div className="debate-result" key={option.option_id} data-result-option={option.option_id}><div><span>{option.label}</span><bdi>{number(option.count)} صوت · {typeof option.percent==='number'?number(option.percent)+'٪':'النسبة محجوبة للعينة الصغيرة'}</bdi></div><div className="debate-result-track" aria-hidden="true"><span style={{width:(typeof option.percent==='number'?Math.max(0,Math.min(100,option.percent)):0)+'%'}}/></div></div>)}</section>;
}

export default function DebateLiveResults({data,loading,error,refresh,currentPhase='before'}){
 const comparison=useRef(null),results=data?.results||{},current=results[currentPhase],hasComparison=Boolean(currentPhase==='after'&&results.before&&results.after);
 useEffect(()=>{
  const reveal=()=>{if(location.hash==='#vote-before'&&hasComparison&&comparison.current)comparison.current.open=true;};
  reveal();window.addEventListener('hashchange',reveal);return()=>window.removeEventListener('hashchange',reveal);
 },[hasComparison]);
 return <div className="debate-integrated-results">
  {loading&&<p role="status">جارٍ تحميل النتائج…</p>}
  {error&&<p role="status">{error} {data&&'المعروض آخر نتيجة متاحة.'} <button type="button" className="btn btn-outline" onClick={refresh}>إعادة المحاولة</button></p>}
  {!loading&&data?.results_visible===false?<p className="small-muted">النتائج غير متاحة للعامة وفق إعدادات الإدارة.</p>:<>
   {current?<ResultPhase result={current} phase={currentPhase}/>:!loading&&!error&&<p className="small-muted">لا توجد نتائج متاحة لهذه المرحلة حالياً.</p>}
   {currentPhase==='after'&&results.before&&<p className="debate-previous-result-summary">استطلاع قبل المشاهدة: <bdi>{number(results.before.participants)}</bdi> صوت. تبقى الأصوات السابقة محفوظة.</p>}
   {currentPhase==='after'&&results.before&&results.after&&<details ref={comparison} className="debate-results-comparison"><summary>كيف تغيرت آراء الجمهور؟</summary><div className="debate-comparison-grid"><ResultPhase result={results.before} phase="before"/><ResultPhase result={results.after} phase="after"/></div><h3>الفرق بين النسب الإجمالية</h3><p className="small-muted">قد يختلف المشاركون بين المرحلتين؛ تغير النسب لا يعني أن الأشخاص أنفسهم غيّروا رأيهم.</p>{(results.after.options||[]).map(option=>{const before=results.before.options?.find(item=>item.option_id===option.option_id);if(typeof before?.percent!=='number'||typeof option.percent!=='number')return null;const difference=Math.round((option.percent-before.percent)*10)/10;return <p key={option.option_id}>{option.label}: من <bdi>{number(before.percent)}٪</bdi> إلى <bdi>{number(option.percent)}٪</bdi> · <bdi>{difference>0?'+':''}{number(difference)}</bdi> نقطة مئوية</p>;})}
    {results.paired&&typeof results.paired.changed_percent==='number'&&<p>شارك <bdi>{number(results.paired.participants)}</bdi> شخصاً في المرحلتين، وغيّر <bdi>{number(results.paired.changed_percent)}٪</bdi> منهم اختيارهم.</p>}
   </details>}
  </>}
  <p className="small-muted">تعكس النتائج آراء المشاركين فقط. لا تُعرض أسماء المصوّتين أو اختياراتهم الفردية.</p>
 </div>;
}

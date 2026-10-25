'use client';

import {useState,useRef,useEffect} from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import ExplorationProgress, {useExplorationTrail} from '@/components/ExplorationProgress';
import {yemenGovernorates} from '@/lib/yemeniFigures';
import styles from './YemenDiscovery.module.css';
import {ArrowUpLeft, Compass, UsersRound} from 'lucide-react';
const YemenMap = dynamic(() => import('./YemenMap'), {ssr:false, loading:()=><div className="ymap-loading" role="status"><Image src="/images/yemen-preview.svg" width={1343} height={760} alt="معاينة خريطة اليمن" sizes="(max-width:760px) 90vw, 65vw"/><p>جارٍ تجهيز الخريطة التفاعلية…</p></div>});
const YemeniFiguresDirectory=dynamic(()=>import('./YemeniFiguresDirectory'),{loading:()=><p className="container section" role="status">جارٍ تجهيز دليل الشخصيات…</p>});

export default function YemenDiscovery({showFigures=true, initialGovernorateId = null, initialDistrictId = null}) {
  const [selectedGovernorateId, setSelectedGovernorateId] = useState(initialGovernorateId);
  const [selectedDistrictId,setSelectedDistrictId]=useState(initialDistrictId);
  useEffect(()=>{const sync=()=>{const p=new URLSearchParams(location.search);setSelectedGovernorateId(p.get('region')||null);setSelectedDistrictId(p.get('district')||null);};window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[]);
  const [exploredPlaces, explorePlace, restartTour, tourSaved] = useExplorationTrail('967-map-tour-v1', yemenGovernorates);
  const directoryRef=useRef(null);
  const [directoryOpen,setDirectoryOpen]=useState(Boolean(initialGovernorateId)),[figures,setFigures]=useState(null),[figureError,setFigureError]=useState(''),[figureAttempt,setFigureAttempt]=useState(0);
  useEffect(()=>{if(selectedGovernorateId)setDirectoryOpen(true);},[selectedGovernorateId]);
  useEffect(()=>{
    const reveal=()=>{if(window.location.hash==='#yemeni-figures')setDirectoryOpen(true);};
    reveal();window.addEventListener('hashchange',reveal);
    return()=>window.removeEventListener('hashchange',reveal);
  },[]);
  useEffect(()=>{
    if(!showFigures||!directoryOpen||figures!==null)return;
    const controller=new AbortController();setFigureError('');
    fetch('/api/figures',{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();return response.json();}).then(result=>{if(!controller.signal.aborted)setFigures(result.figures);}).catch(error=>{if(error.name!=='AbortError')setFigureError('تعذر تحميل دليل الشخصيات. حاول مجددًا.');});
    return()=>controller.abort();
  },[showFigures,directoryOpen,figures,figureAttempt]);

  function handleMapGovernorateChange(governorateId,districtId=null) {
    setSelectedGovernorateId(governorateId);
    setSelectedDistrictId(districtId);
    const p=new URLSearchParams(location.search);if(governorateId)p.set('region',governorateId);else p.delete('region');if(districtId)p.set('district',districtId);else p.delete('district');history.replaceState(history.state,'',location.pathname+(p.size?'?'+p:'')+location.hash);
  }

  return <>
    <nav className={'container '+styles.exploreChoices} aria-label="اختر طريقة اكتشاف اليمن">
      <a href="#map"><Compass size={25} aria-hidden="true"/><div><strong>استكشف المحافظات والمديريات</strong><span>الخريطة ومعلومات الأماكن</span></div><ArrowUpLeft size={18} aria-hidden="true"/></a>
      {showFigures&&<a href="#yemeni-figures" onClick={()=>setDirectoryOpen(true)}><UsersRound size={25} aria-hidden="true"/><div><strong>اكتشف الشخصيات اليمنية</strong><span>ابحث بالاسم أو المجال أو المحافظة</span></div><ArrowUpLeft size={18} aria-hidden="true"/></a>}
    </nav>
    <section className="ymap-section" id="map">
      <div className="container ymap-container">
        <header className="ydiscovery-section-head">
          <div><h2>اختر مكاناً على الخريطة</h2></div>
          <p>ابحث عن محافظة أو مديرية، أو اضغط عليها لاستكشافها.</p>
        </header>
        <ExplorationProgress items={exploredPlaces} title="اليمن، ثلاث محطات أقرب." description="اختر ثلاث محافظات مختلفة على الخريطة وتعرّف على تفاصيل كل مكان." completeLabel="أكملت جولتك! ما زالت أماكن كثيرة تنتظرك." onRestart={restartTour} persistent={tourSaved}/>
        <YemenMap
          focusedGovernorateId={selectedGovernorateId}
          initialDistrictId={selectedDistrictId}
          onGovernorateChange={handleMapGovernorateChange}
          onGovernorateExplore={explorePlace}
          showFigures={showFigures}
        />
      </div>
    </section>
    {showFigures&&<details className="figures-directory-shell" id="yemeni-figures" ref={directoryRef} open={directoryOpen} onToggle={event=>setDirectoryOpen(event.currentTarget.open)}><summary><span>شخصيات يمنية مرتبطة بالأماكن</span><span>افتح الدليل وابحث بالاسم أو المجال</span></summary>{directoryOpen&&(figures?<YemeniFiguresDirectory
      embedded
      figures={figures}
      selectedGovernorateId={selectedGovernorateId}
      selectedDistrictId={selectedDistrictId}
      onGovernorateChange={setSelectedGovernorateId}
    />:figureError?<div className="container section"><p className="feedback error" role="alert">{figureError}</p><button type="button" className="btn btn-outline" onClick={()=>setFigureAttempt(value=>value+1)}>إعادة تحميل الشخصيات</button></div>:<p className="container section" role="status">جارٍ تحميل الشخصيات المنشورة…</p>)}</details>}
  </>;
}

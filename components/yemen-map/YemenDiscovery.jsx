'use client';

import {useState,useRef,useEffect} from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import YemeniFiguresDirectory from './YemeniFiguresDirectory';
import ExplorationProgress, {useExplorationTrail} from '@/components/ExplorationProgress';
import {yemenGovernorates} from '@/lib/yemeniFigures';
import styles from './YemenDiscovery.module.css';
const YemenMap = dynamic(() => import('./YemenMap'), {ssr:false, loading:()=><div className="ymap-loading" role="status"><Image src="/images/yemen-preview.svg" width={1343} height={760} alt="معاينة خريطة اليمن" sizes="(max-width:760px) 90vw, 65vw"/><p>جارٍ تجهيز الخريطة التفاعلية…</p></div>});

export default function YemenDiscovery({figures, initialGovernorateId = null, initialDistrictId = null}) {
  const [selectedGovernorateId, setSelectedGovernorateId] = useState(initialGovernorateId);
  const [exploredPlaces, explorePlace, restartTour, tourSaved] = useExplorationTrail('967-map-tour-v1', yemenGovernorates);
  const directoryRef=useRef(null);
  useEffect(()=>{if(selectedGovernorateId&&directoryRef.current)directoryRef.current.open=true;},[selectedGovernorateId]);
  useEffect(()=>{
    const reveal=()=>{if(window.location.hash==='#yemeni-figures'&&directoryRef.current)directoryRef.current.open=true;};
    reveal();window.addEventListener('hashchange',reveal);
    return()=>window.removeEventListener('hashchange',reveal);
  },[]);

  function handleMapGovernorateChange(governorateId) {
    setSelectedGovernorateId(governorateId);
  }

  return <>
    <nav className={'container '+styles.exploreChoices} aria-label="اختر طريقة اكتشاف اليمن">
      <a href="#map"><strong>استكشف المحافظات والمديريات</strong><span>الخريطة ومعلومات الأماكن</span></a>
      <a href="#yemeni-figures" onClick={()=>{if(directoryRef.current)directoryRef.current.open=true;}}><strong>اكتشف الشخصيات اليمنية</strong><span>ابحث بالاسم أو المجال أو المحافظة</span></a>
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
          initialDistrictId={initialDistrictId}
          onGovernorateChange={handleMapGovernorateChange}
          onGovernorateExplore={explorePlace}
        />
      </div>
    </section>
    <details className="figures-directory-shell" id="yemeni-figures" ref={directoryRef} open={Boolean(initialGovernorateId)}><summary><span>شخصيات يمنية مرتبطة بالأماكن</span><span>افتح الدليل وابحث بالاسم أو المجال</span></summary><YemeniFiguresDirectory
      embedded
      figures={figures}
      selectedGovernorateId={selectedGovernorateId}
      onGovernorateChange={setSelectedGovernorateId}
    /></details>
  </>;
}

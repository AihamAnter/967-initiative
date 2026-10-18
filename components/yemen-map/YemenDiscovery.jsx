'use client';

import {useState,useRef,useEffect} from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import YemeniFiguresDirectory from './YemeniFiguresDirectory';
const YemenMap = dynamic(() => import('./YemenMap'), {ssr:false, loading:()=><div className="ymap-loading" role="status"><Image src="/images/yemen-preview.svg" width={1343} height={760} alt="معاينة خريطة اليمن" sizes="(max-width:760px) 90vw, 65vw"/><p>جارٍ تجهيز الخريطة التفاعلية…</p></div>});

export default function YemenDiscovery({figures, initialGovernorateId = null, initialDistrictId = null}) {
  const [selectedGovernorateId, setSelectedGovernorateId] = useState(initialGovernorateId);
  const directoryRef=useRef(null);
  useEffect(()=>{if(selectedGovernorateId&&directoryRef.current)directoryRef.current.open=true;},[selectedGovernorateId]);

  function handleMapGovernorateChange(governorateId) {
    setSelectedGovernorateId(governorateId);
  }

  return <>
    <section className="ymap-section" id="map">
      <div className="container ymap-container">
        <header className="ydiscovery-section-head">
          <div><h2>اختر مكاناً على الخريطة</h2></div>
          <p>ابحث عن محافظة أو مديرية، أو اضغط عليها لاستكشافها.</p>
        </header>
        <YemenMap
          focusedGovernorateId={selectedGovernorateId}
          initialDistrictId={initialDistrictId}
          onGovernorateChange={handleMapGovernorateChange}
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

'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import YemeniFiguresDirectory from './YemeniFiguresDirectory';
const YemenMap = dynamic(() => import('./YemenMap'), {ssr:false, loading:()=><div className="ymap-loading" role="status">جارٍ تحميل الأطلس…</div>});

export default function YemenDiscovery({figures, initialGovernorateId = null, initialDistrictId = null}) {
  const [selectedGovernorateId, setSelectedGovernorateId] = useState(initialGovernorateId);

  function handleMapGovernorateChange(governorateId) {
    setSelectedGovernorateId(governorateId);
  }

  return <>
    <section className="ymap-section" id="map">
      <div className="container ymap-container">
        <header className="ydiscovery-section-head">
          <div><span className="eyebrow">الخريطة التفاعلية</span><h2>المحافظات والمديريات</h2></div>
          <p>اختر محافظة لاستكشاف بياناتها والعثور على الشخصيات المرتبطة بها.</p>
        </header>
        <YemenMap
          focusedGovernorateId={selectedGovernorateId}
          initialDistrictId={initialDistrictId}
          onGovernorateChange={handleMapGovernorateChange}
        />
      </div>
    </section>
    <YemeniFiguresDirectory
      figures={figures}
      selectedGovernorateId={selectedGovernorateId}
      onGovernorateChange={setSelectedGovernorateId}
    />
  </>;
}

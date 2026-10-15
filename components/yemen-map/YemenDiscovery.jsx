'use client';

import {useState} from 'react';
import YemenMap from './YemenMap';
import YemeniFiguresDirectory from './YemeniFiguresDirectory';

export default function YemenDiscovery({figures}) {
  const [selectedGovernorateId, setSelectedGovernorateId] = useState(null);

  function handleMapGovernorateChange(governorateId) {
    setSelectedGovernorateId(governorateId);
  }

  return <>
    <section className="ymap-section">
      <div className="container ymap-container">
        <header className="ydiscovery-section-head">
          <div><span className="eyebrow">الخريطة التفاعلية</span><h2>المحافظات والمديريات</h2></div>
          <p>اختر محافظة لاستكشاف بياناتها والعثور على الشخصيات المرتبطة بها.</p>
        </header>
        <YemenMap
          focusedGovernorateId={selectedGovernorateId}
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

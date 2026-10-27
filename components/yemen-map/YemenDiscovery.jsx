'use client';

import {useState,useEffect} from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import ExplorationProgress, {useExplorationTrail} from '@/components/ExplorationProgress';
import {yemenGovernorates} from '@/lib/yemeniFigures';
import styles from './YemenDiscovery.module.css';
import {ArrowUpLeft, Compass} from 'lucide-react';
const YemenMap = dynamic(() => import('./YemenMap'), {ssr:false, loading:()=><div className="ymap-loading" role="status"><Image src="/images/yemen-preview.svg" width={1343} height={760} alt="معاينة خريطة اليمن" sizes="(max-width:760px) 90vw, 65vw"/><p>جارٍ تجهيز الخريطة التفاعلية…</p></div>});

export default function YemenDiscovery({showFigures=true, initialGovernorateId = null, initialDistrictId = null}) {
  const [selectedGovernorateId, setSelectedGovernorateId] = useState(initialGovernorateId);
  const [selectedDistrictId,setSelectedDistrictId]=useState(initialDistrictId);
  useEffect(()=>{const sync=()=>{const p=new URLSearchParams(location.search);setSelectedGovernorateId(p.get('region')||null);setSelectedDistrictId(p.get('district')||null);};window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[]);
  const [exploredPlaces, explorePlace, restartTour, tourSaved] = useExplorationTrail('967-map-tour-v1', yemenGovernorates);
  // Forward old atlas anchors to the independent figures page.
  useEffect(()=>{
    if(window.location.hash==='#yemeni-figures'){
      const p=new URLSearchParams(window.location.search);p.delete('district');
      window.location.replace('/yemeni-figures'+(p.size?'?'+p:''));
    }
  },[]);

  function handleMapGovernorateChange(governorateId,districtId=null) {
    setSelectedGovernorateId(governorateId);
    setSelectedDistrictId(districtId);
    const p=new URLSearchParams(location.search);if(governorateId)p.set('region',governorateId);else p.delete('region');if(districtId)p.set('district',districtId);else p.delete('district');history.replaceState(history.state,'',location.pathname+(p.size?'?'+p:'')+location.hash);
  }

  return <>
    <nav className={'container '+styles.exploreChoices} aria-label="اختر طريقة اكتشاف اليمن">
      <a href="#map"><Compass size={25} aria-hidden="true"/><div><strong>استكشف المحافظات والمديريات</strong><span>الخريطة ومعلومات الأماكن</span></div><ArrowUpLeft size={18} aria-hidden="true"/></a>
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
    <section className={'container '+styles.governorateCatalog} aria-label="ملفات محافظات اليمن">
      <header><div><span className="eyebrow">اعرف المكان</span><h2>ملفات المحافظات الـ22</h2></div><p>اقرأ عن تاريخ المحافظة وطبيعتها واقتصادها ومعالمها في صفحة مستقلة، أو استكشف مديرياتها على الخريطة.</p></header>
      <div className={styles.governorateGrid}>{yemenGovernorates.map(item=><a key={item.id} href={'/yemen-map/governorates/'+item.id}>{item.name}<ArrowUpLeft size={14} aria-hidden="true"/></a>)}</div>
    </section>

  </>;
}

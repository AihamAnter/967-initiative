'use client';
import {ChevronRight,Eye,EyeOff,Layers,Minus,Plus,RotateCcw,ZoomIn,Settings2} from 'lucide-react';

export default function MapControls({
  canBack,
  labelsVisible,
  labelSizeMode,
  districtsVisible,
  onBack,
  onReset,
  onZoomIn,
  onZoomOut,
  onToggleLabels,
  onLabelSizeChange,
  onToggleDistricts,
}) {
  const labelSizes = [
    {id: 'small', label: 'صغير'},
    {id: 'medium', label: 'متوسط'},
    {id: 'large', label: 'كبير'},
  ];

  return <div className="ymap-controls" role="group" aria-label="أدوات التحكم بالخريطة">
    <button type="button" onClick={onZoomIn} title="تكبير" aria-label="تكبير"><Plus size={17}/></button>
    <button type="button" onClick={onZoomOut} title="تصغير" aria-label="تصغير"><Minus size={17}/></button>
    <button type="button" className="ymap-reset" onClick={onReset} title="عرض اليمن كاملة" aria-label="عرض اليمن كاملة"><RotateCcw size={17}/><span>اليمن كاملة</span></button>
    <button type="button" disabled={!canBack} onClick={onBack} title="العودة إلى المستوى السابق" aria-label="العودة إلى المستوى السابق"><ChevronRight size={17}/></button>
    <details className="ymap-display-options"><summary><Settings2 size={17}/><span>العرض</span></summary><div className="ymap-display-panel">
    <button type="button" onClick={onToggleLabels} aria-pressed={labelsVisible} title={labelsVisible ? 'إخفاء الأسماء' : 'إظهار الأسماء'} aria-label={labelsVisible ? 'إخفاء الأسماء' : 'إظهار الأسماء'}>{labelsVisible ? <Eye size={17}/> : <EyeOff size={17}/>}<span>الأسماء</span></button>
    <button type="button" onClick={onToggleDistricts} aria-pressed={districtsVisible} title={districtsVisible ? 'إخفاء حدود المديريات' : 'إظهار حدود المديريات'} aria-label={districtsVisible ? 'إخفاء حدود المديريات' : 'إظهار حدود المديريات'} className={districtsVisible ? 'active' : ''}>{districtsVisible ? <Layers size={17}/> : <ZoomIn size={17}/>}<span>المديريات</span></button>
    <div className="ymap-label-size" role="group" aria-label="حجم أسماء الخريطة">
      <span>حجم أسماء الأماكن</span>
      {labelSizes.map(item => <button
        key={item.id}
        type="button"
        className={labelSizeMode === item.id ? 'active' : ''}
        onClick={() => onLabelSizeChange(item.id)}
        aria-pressed={labelSizeMode === item.id}
        title={`حجم أسماء ${item.label}`}
        aria-label={`حجم أسماء ${item.label}`}
      >
        {item.label}
      </button>)}
    </div>
    </div></details>
  </div>;
}

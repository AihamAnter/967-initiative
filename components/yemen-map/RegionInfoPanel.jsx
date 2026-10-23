'use client';
import {ArrowUpLeft,ChevronRight,MapPinned,X} from 'lucide-react';
import {formatNumber} from './mapGeometry';
import InlineTarget from '../inline/InlineTarget';

const missing = 'البيانات غير متوفرة حاليًا';

function Field({label, value}) {
  return <div className="ymap-info-field"><span>{label}</span><strong>{value || missing}</strong></div>;
}

export default function RegionInfoPanel({
  country,
  region,
  regionType,
  districts,
  profiles,
  source,
  onClose,
  onDistrictSelect,
  onGovernorateBack,
}) {
  const isDistrict = regionType === 'district';
  const isGovernorate = regionType === 'governorate';
  const profile = region ? profiles[region.id] || {} : {};
  const districtList = isGovernorate ? districts.filter(item => item.governorateId === region.id) : [];
  const title = region?.nameAr || 'اكتشف اليمن';

  return <aside className={'ymap-info-panel ' + (region ? 'has-region' : '')} aria-label="لوحة معلومات المنطقة">
    <div className="ymap-info-head">
      <div><span className="eyebrow">{region ? (isDistrict ? 'مديرية' : 'محافظة') : 'أطلس 967'}</span><h2>{title}</h2></div>
      {region && <button type="button" onClick={onClose} title="إغلاق اللوحة" aria-label="إغلاق اللوحة"><X size={18}/></button>}
    </div>

    {!region && <div className="ymap-info-empty">
      <MapPinned size={30}/>
      <p>اختر محافظة من الخريطة أو استخدم البحث لعرض المديريات والمعلومات المتاحة. لا تُعرض أرقام غير موثقة؛ الحقول غير المتوفرة تظهر بوضوح.</p>
      <dl>
        <div><dt>المحافظات</dt><dd>{formatNumber(22)}</dd></div>
        <div><dt>المديريات</dt><dd>{formatNumber(335)}</dd></div>
        <div><dt>المصدر</dt><dd>{source.provider}</dd></div>
      </dl>
    </div>}

    {region && <div className="ymap-info-body">
      <InlineTarget kind={isDistrict?'district':'governorate'} id={region.id} title={title} href={'/yemen-map?'+(isDistrict?'district=':'region=')+encodeURIComponent(region.id)+'#map'}/>
      {isDistrict && <button type="button" className="ymap-backline" onClick={onGovernorateBack}><ChevronRight size={16}/> العودة إلى محافظة {region.governorateNameAr}</button>}
      <div className="ymap-info-grid">
        <Field label={isDistrict ? 'اسم المديرية' : 'اسم المحافظة'} value={region.nameAr}/>
        <Field label="الاسم الإنجليزي" value={region.nameEn}/>
        <Field label="المعرّف الإداري" value={region.pcode}/>
        {isDistrict && <Field label="المحافظة" value={region.governorateNameAr}/>}
        <Field label="المركز الإداري" value={profile.capital}/>
        <Field label="المساحة كم²" value={region.areaKm2 ? formatNumber(region.areaKm2) : profile.area_km2 ? formatNumber(profile.area_km2) : missing}/>
        <Field label="السكان" value={profile.population ? `${formatNumber(profile.population)}${profile.population_year ? ` · ${profile.population_year}` : ''}` : missing}/>
        {isGovernorate && <Field label="عدد المديريات" value={formatNumber(region.districtCount)}/>}
      </div>

      <section>
        <h3>نبذة تعريفية</h3>
        <p>{profile.description || missing}</p>
      </section>
      <section>
        <h3>نبذة تاريخية</h3>
        <p>{profile.history || missing}</p>
      </section>
      <section>
        <h3>الطبيعة والتضاريس</h3>
        <p>{profile.geography || missing}</p>
      </section>
      <section>
        <h3>المعالم والأنشطة</h3>
        <p>{profile.landmarks || profile.economy || missing}</p>
      </section>

      {isGovernorate && <section>
        <a className="text-link" href="#yemeni-figures">اكتشف الشخصيات المرتبطة بمحافظة {region.nameAr}<ArrowUpLeft size={14}/></a>
        <h3>المديريات التابعة</h3>
        <div className="ymap-district-list">
          {districtList.map(district => <button type="button" key={district.id} onClick={() => onDistrictSelect(district)}>
            {district.nameAr}<ArrowUpLeft size={14}/>
          </button>)}
        </div>
      </section>}
    </div>}

    <footer>
      <span>المصدر: {source.title}</span>
      <span>{source.license}</span>
    </footer>
  </aside>;
}

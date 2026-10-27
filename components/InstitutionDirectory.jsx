'use client';

import Link from '@/components/SiteLink';
import {useMemo} from 'react';
import {ArrowUpLeft,Building2,ChevronDown,GraduationCap,MapPin,Phone,Search,Stethoscope,X} from 'lucide-react';
import ActiveFilters from './ActiveFilters';
import Pagination from './Pagination';
import ContentSurface from './design/ContentSurface';
import SaveForLater from './reading/SaveForLater';
import InstitutionLogo from './InstitutionLogo';
import useListState from './useListState';
import {collectionDefaults,listStateSearch} from '@/lib/listState';
import {matchesSearch} from '@/lib/search';
import {formatNumber} from '@/lib/format';
import {institutionSearchFields,ownershipLabels,universityTypeLabels,medicalTypeLabels} from '@/lib/institutionDirectories';

const ALL={governorate:'كل المحافظات',city:'كل المدن',type:'كل الأنواع',ownership:'كل الجهات',focus:'كل المجالات',level:'كل المستويات',mode:'كل أنماط الدراسة',specialty:'كل التخصصات',service:'كل الخدمات',emergency:'الكل'};
const pageSize=12;
const optionList=(label,values)=>[label,...new Set(values.filter(Boolean))];
const relationNames=(rows,key='name')=>rows.map(row=>row[key]).filter(Boolean);

function SelectFilter({label,value,onChange,children}){return <label className="institution-filter"><span>{label}</span><span className="institution-select"><select value={value} onChange={event=>onChange(event.target.value)}>{children}</select><ChevronDown size={15}/></span></label>;}

export default function InstitutionDirectory({kind,items}){
  const medical=kind==='medical',defaults=medical?collectionDefaults.medicalCenters:collectionDefaults.universities;
  const [state,update]=useListState(defaults);
  const set=(key,value)=>update({[key]:value,page:1});
  const hasEmergencyData=medical&&items.some(item=>item.emergencyAvailable===true);
  const fields=useMemo(()=>({
    governorates:optionList(ALL.governorate,items.map(item=>item.governorate)),
    cities:optionList(ALL.city,items.filter(item=>state.governorate===ALL.governorate||item.governorate===state.governorate).map(item=>item.city)),
    types:optionList(ALL.type,items.map(item=>item.type)),ownerships:optionList(ALL.ownership,items.map(item=>item.ownership)),
    focuses:optionList(ALL.focus,items.flatMap(item=>item.programs||[]).map(row=>row.field)),levels:optionList(ALL.level,items.flatMap(item=>[...(item.educationLevels||[]),...(item.programs||[]).map(row=>row.qualification)])),modes:optionList(ALL.mode,items.flatMap(item=>[...(item.studyModes||[]),...(item.programs||[]).map(row=>row.study_mode)])),
    specialties:optionList(ALL.specialty,items.flatMap(item=>relationNames(item.specialties||[]))),services:optionList(ALL.service,items.flatMap(item=>relationNames(item.services||[]))),
  }),[items,state.governorate]);
  const results=useMemo(()=>items.filter(item=>{
    const shared=matchesSearch(state.q,institutionSearchFields(item,medical?'medical':'university'))
      &&(state.governorate===ALL.governorate||item.governorate===state.governorate)
      &&(state.city===ALL.city||item.city===state.city)
      &&(state.type===ALL.type||item.type===state.type)
      &&(state.ownership===ALL.ownership||item.ownership===state.ownership);
    if(!shared)return false;
    return medical
      &&(state.specialty===ALL.specialty||relationNames(item.specialties).includes(state.specialty))
      &&(state.service===ALL.service||relationNames(item.services).includes(state.service))
      &&(state.emergency==='الكل'||state.emergency==='موثق'&&item.emergencyAvailable===true)
      ||!medical
      &&(state.focus===ALL.focus||item.programs.some(row=>row.field===state.focus))
      &&(state.level===ALL.level||item.educationLevels.includes(state.level)||item.programs.some(row=>row.qualification===state.level))
      &&(state.mode===ALL.mode||item.studyModes.includes(state.mode)||item.programs.some(row=>row.study_mode===state.mode));
  }).sort((a,b)=>state.sort==='newest'?String(b.createdAt||'').localeCompare(String(a.createdAt||'')):state.sort==='updated'?String(b.updatedAt||b.verifiedAt||'').localeCompare(String(a.updatedAt||a.verifiedAt||'')):a.name.localeCompare(b.name,'ar')),[items,medical,state]);
  const page=Math.min(state.page,Math.max(1,Math.ceil(results.length/pageSize))),basePath=medical?'/medical-centers':'/universities',anchor=medical?'#medical-directory':'#universities-directory';
  const returnTo=basePath+listStateSearch('',{...state,page},defaults)+anchor;
  const clear=()=>update(defaults);
  const active=Object.entries(state).filter(([key,value])=>!['page','sort'].includes(key)&&value!==defaults[key]&&value!=='').map(([key,value])=>({key,label:(key==='q'?'البحث':{governorate:'المحافظة',city:'المدينة',type:'النوع',ownership:'الجهة',focus:'المجال',level:'المستوى',mode:'نمط الدراسة',specialty:'التخصص',service:'الخدمة',emergency:'الطوارئ'}[key])+': '+value,onRemove:()=>set(key,defaults[key])}));
  const typeLabels=medical?medicalTypeLabels:universityTypeLabels;
  return <div className={'institution-directory '+(medical?'medical':'education')}>
    <div className="institution-toolbar">
      <label className="institution-search"><Search size={19}/><input value={state.q} onChange={event=>set('q',event.target.value)} placeholder={medical?'ابحث باسم المنشأة أو التخصص أو الخدمة...':'ابحث باسم الجامعة أو المعهد أو المجال...'} aria-label={medical?'البحث في المراكز الطبية':'البحث في الجامعات والمعاهد'}/>{state.q&&<button type="button" onClick={()=>set('q','')} aria-label="مسح البحث"><X size={17}/></button>}</label>
      {fields.governorates.length>1&&<SelectFilter label="المحافظة" value={state.governorate} onChange={value=>set('governorate',value)}>{fields.governorates.map(value=><option key={value}>{value}</option>)}</SelectFilter>}
      {fields.cities.length>1&&<SelectFilter label="المدينة / المديرية" value={state.city} onChange={value=>set('city',value)}>{fields.cities.map(value=><option key={value}>{value}</option>)}</SelectFilter>}
      {fields.types.length>1&&<SelectFilter label="نوع المؤسسة" value={state.type} onChange={value=>set('type',value)}>{fields.types.map(value=><option value={value} key={value}>{value===ALL.type?value:typeLabels[value]||value}</option>)}</SelectFilter>}
      {fields.ownerships.length>1&&<SelectFilter label="الجهة" value={state.ownership} onChange={value=>set('ownership',value)}>{fields.ownerships.map(value=><option value={value} key={value}>{value===ALL.ownership?value:ownershipLabels[value]||value}</option>)}</SelectFilter>}
      {medical?<>
        {fields.specialties.length>1&&<SelectFilter label="التخصص الطبي" value={state.specialty} onChange={value=>set('specialty',value)}>{fields.specialties.map(value=><option key={value}>{value}</option>)}</SelectFilter>}
        {fields.services.length>1&&<SelectFilter label="الخدمة" value={state.service} onChange={value=>set('service',value)}>{fields.services.map(value=><option key={value}>{value}</option>)}</SelectFilter>}
        {hasEmergencyData&&<SelectFilter label="الطوارئ" value={state.emergency} onChange={value=>set('emergency',value)}><option>الكل</option><option>موثق</option></SelectFilter>}
      </>:<>
        {fields.focuses.length>1&&<SelectFilter label="المجال الدراسي" value={state.focus} onChange={value=>set('focus',value)}>{fields.focuses.map(value=><option key={value}>{value}</option>)}</SelectFilter>}
        {fields.levels.length>1&&<SelectFilter label="المستوى" value={state.level} onChange={value=>set('level',value)}>{fields.levels.map(value=><option key={value}>{value}</option>)}</SelectFilter>}
        {fields.modes.length>1&&<SelectFilter label="نمط الدراسة" value={state.mode} onChange={value=>set('mode',value)}>{fields.modes.map(value=><option key={value}>{value}</option>)}</SelectFilter>}
      </>}
      <SelectFilter label="الترتيب" value={state.sort} onChange={value=>set('sort',value)}><option value="name">أبجديًا</option><option value="newest">الأحدث إضافة</option><option value="updated">الأحدث تحديثًا</option></SelectFilter>
    </div>
    <ActiveFilters filters={active} onClear={clear}/>
    <div className="institution-results-line" aria-live="polite"><span>{medical?'المنشآت الطبية المطابقة':'المؤسسات التعليمية المطابقة'}</span><strong>{formatNumber(results.length)} نتيجة</strong></div>
    {results.length?<div className="institution-grid">{results.slice((page-1)*pageSize,page*pageSize).map(item=><ContentSurface kind="directory" className="institution-card" key={item.id}>
      <Link className="institution-card-link" href={`${basePath}/${encodeURIComponent(item.id)}?from=${encodeURIComponent(returnTo)}`}>
        <div className="institution-card-icon"><InstitutionLogo src={item.logoUrl} name={item.name} maxSize={62} kind={medical?'medical':'university'}>{medical?<Stethoscope size={32}/>:<GraduationCap size={34}/>}</InstitutionLogo></div>
        <div className="institution-card-body"><div className="institution-card-meta"><span>{item.typeLabel}</span><span>{item.ownershipLabel}</span></div><h2>{item.name}</h2>
          <p className="institution-location"><MapPin size={15}/>{[item.governorate,item.city].filter(Boolean).join(' · ')||'الموقع يحتاج استكمالًا'}</p><p>{item.summary}</p>
          <div className="institution-tags">{uniqCard(medical?[...relationNames(item.specialties),...relationNames(item.services)]:[...item.programs.map(row=>row.field),...item.educationLevels]).slice(0,4).map(value=><span key={value}>{value}</span>)}</div>
          {medical&&item.phone&&<span className="institution-phone"><Phone size={14}/>{item.phone}</span>}<span className="institution-details-link">عرض التفاصيل <ArrowUpLeft size={16}/></span>
        </div>
      </Link><div className="card-save-action"><SaveForLater compact item={{kind:medical?'medicalCenter':'university',href:`${basePath}/${encodeURIComponent(item.id)}`,title:item.name}}/></div>
    </ContentSurface>)}</div>:<div className="institution-empty"><Building2 size={36}/><h2>لا توجد نتائج مطابقة</h2><p>جرّب توسيع نطاق البحث أو مسح عوامل التصفية.</p><button className="btn btn-outline" type="button" onClick={clear}>مسح الفلاتر</button></div>}
    <Pagination page={page} count={results.length} pageSize={pageSize} onChange={value=>update({page:value})}/>
  </div>;
}
function uniqCard(values){return [...new Set(values.filter(Boolean))];}

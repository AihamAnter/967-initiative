import universitiesDataset from '../data/directories/universities.json' with {type:'json'};
import medicalCentersDataset from '../data/directories/medical-centers.json' with {type:'json'};

export const universityTypeLabels={
  university:'جامعة',community_college:'كلية مجتمع',independent_college:'كلية مستقلة',higher_institute:'معهد عالٍ',
  technical_institute:'معهد تقني',vocational_institute:'معهد مهني',specialized_institution:'مؤسسة تعليمية متخصصة',
};
export const medicalTypeLabels={
  referral_hospital:'مستشفى مرجعي / هيئة',specialized_hospital:'مستشفى تخصصي',hospital:'مستشفى',medical_center:'مركز طبي',
  health_center:'مركز صحي',health_unit:'وحدة صحية',medical_complex:'مجمع طبي',specialized_clinic:'عيادة متخصصة',laboratory:'مختبر',diagnostic_center:'مركز أشعة وتشخيص',dental_center:'مركز أسنان',eye_center:'مركز عيون',other:'منشأة صحية أخرى',
};
export const ownershipLabels={government:'حكومي',private:'خاص',community:'أهلي / مجتمعي',civil:'أهلي / مجتمعي',other:'غير محدد'};
export const verificationLabels={verified:'تم التحقق من الهوية والمصدر',incomplete:'معلومات غير مكتملة',needs_review:'يحتاج مراجعة حديثة'};
export const operatingLabels={fully_operational:'كان يعمل بشكل كامل',partially_operational:'كان يعمل بشكل جزئي',not_operational:'غير عامل حسب المصدر',listed_for_admission:'مدرج للتنسيق والقبول',unknown:'حالة التشغيل غير مؤكدة'};

const list=value=>Array.isArray(value)?value:[];
const nullable=value=>value||null;
export function mapUniversity(row){
  return {
    databaseId:row.id||null,id:row.slug,stableKey:row.stable_key,name:row.name_ar,englishName:nullable(row.name_en),type:row.institution_type,
    typeLabel:universityTypeLabels[row.institution_type]||row.institution_type,ownership:row.ownership,ownershipLabel:ownershipLabels[row.ownership]||ownershipLabels.other,
    foundedYear:row.founded_year??null,summary:row.summary||'',governorate:row.governorate||'',city:row.city||'',district:row.district||'',address:row.address||'',
    latitude:row.latitude??null,longitude:row.longitude??null,mapUrl:nullable(row.map_url),logoUrl:nullable(row.logo_url),website:nullable(row.website),phone:nullable(row.phone),email:nullable(row.email),socialLinks:list(row.social_links),
    admissionInfo:row.admission_info||'',tuitionInfo:row.tuition_info||'',tuitionAsOf:nullable(row.tuition_as_of),registrationUrl:nullable(row.registration_url),
    languages:list(row.languages),studyModes:list(row.study_modes),educationLevels:list(row.education_levels),accreditationStatus:row.accreditation_status||'not_asserted',
    accreditingBody:row.accrediting_body||'',operatingStatus:row.operating_status||'unknown',verificationStatus:row.verification_status||'incomplete',verifiedAt:nullable(row.verified_at),
    programs:list(row.programs),branches:list(row.branches),sources:list(row.sources),isPublished:row.is_published!==false,is_published:row.is_published!==false,
    revision:row.revision||1,createdAt:row.created_at||null,updatedAt:row.updated_at||null,deletedAt:row.deleted_at||null,
  };
}
export function mapMedicalCenter(row){
  return {
    databaseId:row.id||null,id:row.slug,stableKey:row.stable_key,officialCode:row.official_code||'',name:row.name_ar,englishName:nullable(row.name_en),type:row.institution_type,
    typeLabel:medicalTypeLabels[row.institution_type]||row.institution_type,ownership:row.ownership,ownershipLabel:ownershipLabels[row.ownership]||ownershipLabels.other,operatorName:row.operator_name||'',
    summary:row.summary||'',governorate:row.governorate||'',city:row.city||'',district:row.district||'',address:row.address||'',latitude:row.latitude??null,longitude:row.longitude??null,mapUrl:nullable(row.map_url),
    logoUrl:nullable(row.logo_url),website:nullable(row.website),phone:nullable(row.phone),emergencyPhone:nullable(row.emergency_phone),email:nullable(row.email),socialLinks:list(row.social_links),bookingUrl:nullable(row.booking_url),
    emergencyAvailable:typeof row.emergency_available==='boolean'?row.emergency_available:null,operatingStatus:row.operating_status||'unknown',operatingStatusAsOf:nullable(row.operating_status_as_of),
    verificationStatus:row.verification_status||'needs_review',verifiedAt:nullable(row.verified_at),facilityPresence:row.facility_presence||'',careLevel:row.care_level||'',accessStatus:row.access_status||'',
    buildingStatus:row.building_status||'',equipmentStatus:row.equipment_status||'',specialties:list(row.specialties),services:list(row.services),hours:list(row.hours),branches:list(row.branches),sources:list(row.sources),
    isPublished:row.is_published!==false,is_published:row.is_published!==false,revision:row.revision||1,createdAt:row.created_at||null,updatedAt:row.updated_at||null,deletedAt:row.deleted_at||null,
  };
}

export const fallbackUniversities=universitiesDataset.records.map(mapUniversity);
export const fallbackMedicalCenters=medicalCentersDataset.records.map(mapMedicalCenter);

export function institutionSearchFields(item,kind){
  if(kind==='university')return [item.name,item.englishName,item.summary,item.governorate,item.city,item.district,item.typeLabel,item.ownershipLabel,...item.educationLevels,...item.studyModes,...item.programs.flatMap(program=>[program.name,program.field,program.faculty,program.department,program.qualification,program.level])];
  return [item.name,item.englishName,item.summary,item.governorate,item.city,item.district,item.typeLabel,item.ownershipLabel,...item.specialties.map(row=>row.name),...item.services.map(row=>row.name)];
}

export function relatedInstitutions(current,items,kind,limit=3){
  return items.filter(item=>item.id!==current.id).map(item=>({item,score:(item.governorate&&item.governorate===current.governorate?3:0)+(item.type===current.type?2:0)+(kind==='university'&&item.programs.some(program=>current.programs.some(value=>value.field&&value.field===program.field))?1:0)+(kind==='medical'&&item.specialties.some(row=>current.specialties.some(value=>value.name===row.name))?1:0)})).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.item.name.localeCompare(b.item.name,'ar')).slice(0,limit).map(row=>row.item);
}

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const ROOT=process.cwd();
const SOURCE_DIR=path.join(ROOT,'docs','research');
const OUTPUT_DIR=path.join(ROOT,'data','directories');
const VERIFIED_AT='2026-10-25';
const HEALTH_SOURCE_DATE='2023-12-31';
const YEMEN_GOVERNORATES=['أمانة العاصمة','أبين','عدن','البيضاء','الضالع','تعز','حضرموت','ذمار','شبوة','صنعاء','عمران','حجة','الحديدة','المحويت','الجوف','ريمة','صعدة','سقطرى','لحج','مأرب','المهرة','إب'];

const sources={
  caqa:{url:'https://caqa.gov.ye/',title:'دليل المؤسسات التعليمية',publisher:'مجلس الاعتماد الأكاديمي وضمان جودة التعليم العالي',source_type:'official_directory'},
  tanseekGovernment:{url:'https://tanseek.net/gatecg.php',title:'التنسيق في كليات المجتمع الحكومية',publisher:'بوابة التنسيق الإلكتروني - وزارة التربية والتعليم والبحث العلمي',source_type:'official_directory'},
  tanseekPrivate:{url:'https://www.tanseek.net/gatecs.php',title:'التنسيق في الكليات الخاصة',publisher:'بوابة التنسيق الإلكتروني - وزارة التربية والتعليم والبحث العلمي',source_type:'official_directory'},
  yemenEdu:{url:'https://yemen-edu.com/universities',title:'دليل المؤسسات التعليمية',publisher:'Yemen Edu',source_type:'independent_directory'},
  health:{url:'https://moh-ye.org/?page_id=7297',document_url:'https://drive.google.com/file/d/11fiQwF5nBWogpQPX1QIa4zxjf98ybCDX/view?usp=sharing',title:'القائمة الأساسية للمرافق الصحية - ديسمبر 2023',publisher:'وزارة الصحة العامة والسكان - الإدارة العامة للمعلومات والبحوث',source_type:'official_directory'},
};

function read(file){return fs.readFileSync(path.join(SOURCE_DIR,file),'utf8');}
function clean(value){return String(value||'').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();}
function normalized(value){return clean(value).normalize('NFKC').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ـ/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim().toLowerCase();}
function hash(value){return crypto.createHash('sha1').update(value).digest('hex').slice(0,12);}
function slug(prefix,key){return `${prefix}-${hash(key)}`;}
function uniq(values){return [...new Set(values.filter(Boolean))];}
function standardGovernorate(value){
  const key=normalized(value);
  const map={
    'امانه العاصمه':'أمانة العاصمة','العاصمه صنعاء':'أمانة العاصمة','صنعاء':'صنعاء','ابين':'أبين','اب':'إب','البيضـاء':'البيضاء',
    'الحديده':'الحديدة','المهره':'المهرة','مارب':'مأرب','شبوه':'شبوة','حجه':'حجة','حضرموت':'حضرموت','تعز':'تعز',
    'ذمار':'ذمار','عدن':'عدن','عمران':'عمران','لحج':'لحج','المحويت':'المحويت','الجوف':'الجوف','الضالع':'الضالع',
    'ريمه':'ريمة','صعده':'صعدة','سقطري':'سقطرى','ارخبيل سقطري':'سقطرى',
  };
  return map[key]||clean(value);
}
function governorateIn(value){
  const key=normalized(value);
  if(key.includes('امانه العاصمه'))return 'أمانة العاصمة';
  return [...YEMEN_GOVERNORATES].sort((a,b)=>b.length-a.length).find(name=>key.includes(normalized(name)))||'';
}
function tokens(value){return new Set(normalized(value).split(' ').filter(word=>word.length>2&&!['جامعه','الجامعه','كليه','الكليه','للعلوم','الدوليه'].includes(word)));}
function similarity(a,b){
  const aa=tokens(a),bb=tokens(b);if(!aa.size||!bb.size)return 0;
  const intersection=[...aa].filter(value=>bb.has(value)).length;
  return intersection/Math.max(aa.size,bb.size);
}
function parseYemenEdu(){
  const html=read('yemen-edu-universities.html');
  const matches=[...html.matchAll(/class="inst-card[^"]*" data-name="([^"]+)" data-gov="([^"]*)" data-type="([^"]+)"/g)];
  return matches.map((match,index)=>{
    const next=matches[index+1]?.index??html.length;
    const body=html.slice(match.index,next);
    const id=body.match(/href="\/university\/(\d+)"/)?.[1];
    return {id,name:clean(match[1]),governorate:standardGovernorate(match[2]),type:match[3],url:id?`https://yemen-edu.com/university/${id}`:sources.yemenEdu.url};
  });
}
function parseCaqa(){
  const html=read('caqa-home.html');
  return uniq([...html.matchAll(/\salt="([^"]+)"/g)].map(match=>clean(match[1])).filter(name=>/^(جامعة|الجامعة|كلية|الكلية|الأكاديمية|الاكاديمية)/.test(name)));
}
function parseTanseek(file,ownership,source){
  const html=read(file);
  const regex=/<h3><a href='crgate\.php\?cg=(\d+)' class='color-blue'>([^<]+)<\/a><\/h3>\s*<div class='institution-city' title='([^']*)'>📍\s*([^<]+)<\/div>\s*<div class='institution-phone'><a href='tel:([^']*)'/g;
  return [...html.matchAll(regex)].map(match=>({
    id:match[1],name:clean(match[2]),address:clean(match[3].replace(/^📌\s*/,'')),governorate:standardGovernorate(match[4]),phone:clean(match[5]),ownership,source,
  }));
}
function bestEducationMatch(name,rows){
  const exact=rows.find(row=>normalized(row.name)===normalized(name));if(exact)return exact;
  return rows.map(row=>({row,score:similarity(name,row.name)})).sort((a,b)=>b.score-a.score)[0]?.score>=0.72
    ?rows.map(row=>({row,score:similarity(name,row.name)})).sort((a,b)=>b.score-a.score)[0].row:null;
}
function educationType(name,sourceType){
  if(sourceType==='institute'||/^معهد|^المعهد/.test(name))return name.includes('تقني')?'technical_institute':'vocational_institute';
  if(sourceType==='college'||/^كلية|^الكلية/.test(name))return name.includes('المجتمع')?'community_college':'independent_college';
  return 'university';
}
function ownershipFromYemenEdu(type){return type==='gov-uni'?'government':type==='priv-uni'?'private':'other';}
function sourceRow(source,verifiedAt=VERIFIED_AT,supports=['identity']){return {...source,verified_at:verifiedAt,supports};}

function buildUniversities(){
  const discovery=parseYemenEdu();
  const records=[];
  for(const [index,name] of parseCaqa().entries()){
    const match=bestEducationMatch(name,discovery);
    const key=`caqa:${normalized(name)}`;
    records.push({
      stable_key:key,slug:slug('edu',key),name_ar:name,name_en:null,institution_type:educationType(name,match?.type),ownership:match?ownershipFromYemenEdu(match.type):'other',
      founded_year:null,summary:'مؤسسة تعليم عالٍ مدرجة في دليل المؤسسات التعليمية لدى مجلس الاعتماد الأكاديمي وضمان جودة التعليم العالي في اليمن.',
      governorate:match?.governorate||'',city:'',district:'',address:'',latitude:null,longitude:null,map_url:null,logo_url:null,website:null,phone:null,email:null,social_links:[],
      admission_info:'',tuition_info:'',tuition_as_of:null,registration_url:null,languages:[],study_modes:[],education_levels:[],
      accreditation_status:'not_asserted',accrediting_body:'',operating_status:'unknown',verification_status:match?'verified':'incomplete',verified_at:VERIFIED_AT,
      is_published:true,revision:1,programs:[],branches:[],sources:[sourceRow(sources.caqa),...(match?[sourceRow({...sources.yemenEdu,url:match.url},VERIFIED_AT,['identity','location','ownership'])]:[])],
    });
  }
  const tanseek=[
    ...parseTanseek('tanseek-community-government.html','government',sources.tanseekGovernment),
    ...parseTanseek('tanseek-community-private.html','private',sources.tanseekPrivate),
  ];
  for(const row of tanseek){
    const match=bestEducationMatch(row.name,discovery),key=`tanseek:${row.id}`;
    records.push({
      stable_key:key,slug:slug('edu',key),name_ar:row.name,name_en:null,institution_type:educationType(row.name,match?.type||'college'),ownership:row.ownership,
      founded_year:null,summary:'كلية مدرجة في بوابة التنسيق الإلكتروني التابعة لوزارة التربية والتعليم والبحث العلمي.',
      governorate:row.governorate,city:row.governorate,district:'',address:row.address,latitude:null,longitude:null,map_url:null,logo_url:null,website:null,phone:row.phone,email:null,social_links:[],
      admission_info:'تُراجع شروط ومواعيد القبول الحالية في بوابة التنسيق الرسمية.',tuition_info:'',tuition_as_of:null,registration_url:row.source.url,
      languages:[],study_modes:[],education_levels:['دبلوم'],accreditation_status:'not_asserted',accrediting_body:'',operating_status:'listed_for_admission',verification_status:'verified',verified_at:VERIFIED_AT,
      is_published:true,revision:1,programs:[],branches:[],sources:[sourceRow(row.source,VERIFIED_AT,['identity','location','contact','admission']),...(match?[sourceRow({...sources.yemenEdu,url:match.url},VERIFIED_AT,['identity','location'])]:[])],
    });
  }
  const seen=new Set();
  return records.filter(record=>{const key=normalized(record.name_ar)+'|'+normalized(record.governorate);if(seen.has(key))return false;seen.add(key);return true;});
}

const columns=[
  ['row',50,70],['governorate',70,108],['district',108,145],['pcode',145,185],['name_ar',185,238],['name_en',238,285],['facility_type',285,330],
  ['care_level',330,388],['fixed_type',388,430],['area_type',430,470],['sector',470,515],['presence',515,550],['building_status',550,630],
  ['equipment_status',630,697],['operating_status_raw',697,740],['access_status',740,820],
];
function columnFor(x){return columns.find(([,min,max])=>x>=min&&x<max)?.[0];}
function joinItems(items){return clean(items.sort((a,b)=>b.y-a.y||b.x-a.x).map(item=>item.str).join(' '));}
async function extractHealthRows(){
  const data=new Uint8Array(fs.readFileSync(path.join(SOURCE_DIR,'mophp-health-facilities-dec-2023.pdf')));
  const document=await pdfjs.getDocument({data}).promise;
  const rows=[];
  for(let pageNumber=1;pageNumber<=document.numPages;pageNumber++){
    const page=await document.getPage(pageNumber),content=await page.getTextContent();
    const items=content.items.map(item=>({str:clean(item.str),x:item.transform[4],y:item.transform[5]})).filter(item=>item.str);
    const anchors=items.filter(item=>item.x>=50&&item.x<70&&item.y<555&&item.y>35&&/^\d{1,5}$/.test(item.str)).sort((a,b)=>b.y-a.y);
    for(let index=0;index<anchors.length;index++){
      const anchor=anchors[index],upper=index===0?555:(anchors[index-1].y+anchor.y)/2,lower=index===anchors.length-1?35:(anchor.y+anchors[index+1].y)/2;
      const grouped=Object.fromEntries(columns.map(([key])=>[key,[]]));
      for(const item of items){if(item.y>upper||item.y<=lower)continue;const key=columnFor(item.x);if(key)grouped[key].push(item);}
      const row=Object.fromEntries(columns.map(([key])=>[key,joinItems(grouped[key])]));
      row.page=pageNumber;
      if(/^\d{6,9}$/.test(row.pcode)&&row.name_ar)rows.push(row);
    }
  }
  return [...new Map(rows.map(row=>[row.pcode,row])).values()];
}
function medicalType(value){
  if(/مختبر/.test(value))return 'laboratory';
  if(/أشعة|تشخيص/.test(value))return 'diagnostic_center';
  if(/مستشفى مرجعي|هيئة/.test(value))return 'referral_hospital';
  if(/مستشفى تخصصي/.test(value))return 'specialized_hospital';
  if(/مستشفى/.test(value))return 'hospital';
  if(/مركز صحي/.test(value))return 'health_center';
  if(/مركز/.test(value))return 'medical_center';
  return 'health_unit';
}
function medicalOwnership(value){return /حكومي/.test(value)?'government':/خاص/.test(value)?'private':/تعاون|أهلي/.test(value)?'community':'other';}
function operatingStatus(value){return /بشكل كامل/.test(value)?'fully_operational':/بشكل جزئي/.test(value)?'partially_operational':/لا يعمل|ال يعمل/.test(value)?'not_operational':'unknown';}
function arabicFacilityName(value){
  return clean(String(value||'').replace(/[A-Za-z][A-Za-z0-9&/'(). -]*/g,' ').replace(/\s+/g,' '));
}
function healthPriority(row){
  const type=medicalType(row.facility_type),typeScore={referral_hospital:0,specialized_hospital:1,hospital:2,medical_center:3,health_center:4,laboratory:5,diagnostic_center:5,health_unit:8}[type]??7;
  return typeScore+(operatingStatus(row.operating_status_raw)==='partially_operational'?1:0);
}
function buildMedicalRecord(row){
  const key=`mophp:${row.pcode}`,status=operatingStatus(row.operating_status_raw),governorate=standardGovernorate(row.governorate);
  return {
    stable_key:key,slug:`health-${row.pcode}`,official_code:row.pcode,name_ar:arabicFacilityName(row.name_ar),name_en:row.name_en||null,institution_type:medicalType(row.facility_type),ownership:medicalOwnership(row.sector),operator_name:row.sector||'',
    summary:`منشأة صحية مدرجة في القائمة الأساسية للمرافق الصحية العامة بوزارة الصحة. نوع المنشأة المسجل: ${row.facility_type}.`,governorate,city:row.district,district:row.district,address:'',
    latitude:null,longitude:null,map_url:null,logo_url:null,website:null,phone:null,emergency_phone:null,email:null,social_links:[],booking_url:null,
    emergency_available:null,operating_status:status,operating_status_as_of:HEALTH_SOURCE_DATE,verification_status:'needs_review',verified_at:HEALTH_SOURCE_DATE,
    facility_presence:row.presence,care_level:row.care_level,access_status:row.access_status,building_status:row.building_status,equipment_status:row.equipment_status,
    is_published:true,revision:1,specialties:[],services:[],hours:[],branches:[],sources:[sourceRow(sources.health,HEALTH_SOURCE_DATE,['identity','type','location','ownership','operating_status'])],
  };
}
async function buildMedicalCenters(){
  const extracted=await extractHealthRows(),prefixGovernorate=new Map(),districtByPrefix=new Map();
  for(const row of extracted){
    const combined=clean(row.governorate+' '+row.district),governorate=governorateIn(combined);
    if(governorate)prefixGovernorate.set(row.pcode.slice(0,2),governorate);
    const district=clean(combined.replace(new RegExp(normalized(governorate).split(' ').join('[\\sـ]*'),'i'),' '));
    if(governorate&&district&&district!==governorate)districtByPrefix.set(row.pcode.slice(0,4),district);
  }
  const rows=extracted.map(row=>{
    const combined=clean(row.governorate+' '+row.district),governorate=governorateIn(combined)||prefixGovernorate.get(row.pcode.slice(0,2))||'';
    const directDistrict=clean([row.governorate,row.district].map(value=>governorate?value.replace(new RegExp(governorate,'g'),' '):value).join(' '));
    return {...row,governorate,district:directDistrict||districtByPrefix.get(row.pcode.slice(0,4))||''};
  }).filter(row=>row.governorate&&row.presence.includes('موجود')&&!/لا يعمل|ال يعمل|مغلق/.test(row.operating_status_raw+' '+row.presence));
  const groups=new Map();for(const row of rows){const governorate=standardGovernorate(row.governorate),list=groups.get(governorate)||[];list.push(row);groups.set(governorate,list);}
  const chosen=[],used=new Set();
  for(const [governorate,list] of [...groups].sort(([a],[b])=>a.localeCompare(b,'ar'))){
    const take=list.sort((a,b)=>healthPriority(a)-healthPriority(b)||a.pcode.localeCompare(b.pcode)).slice(0,7);
    for(const row of take){chosen.push(row);used.add(row.pcode);}
  }
  if(chosen.length<160){
    for(const row of rows.sort((a,b)=>healthPriority(a)-healthPriority(b)||a.pcode.localeCompare(b.pcode))){if(used.has(row.pcode))continue;chosen.push(row);used.add(row.pcode);if(chosen.length===160)break;}
  }
  return chosen.sort((a,b)=>standardGovernorate(a.governorate).localeCompare(standardGovernorate(b.governorate),'ar')||a.pcode.localeCompare(b.pcode)).map(buildMedicalRecord);
}
function coverage(records){
  const byGovernorate={},byType={};
  for(const record of records){const governorate=record.governorate||'غير محددة';byGovernorate[governorate]=(byGovernorate[governorate]||0)+1;byType[record.institution_type]=(byType[record.institution_type]||0)+1;}
  return {total:records.length,governorates:Object.keys(byGovernorate).filter(value=>value!=='غير محددة').length,with_location:records.filter(record=>record.governorate).length,with_contact:records.filter(record=>record.phone||record.email||record.website).length,needs_review:records.filter(record=>record.verification_status!=='verified').length,by_governorate:byGovernorate,by_type:byType};
}
function validate(records,kind){
  const seenKeys=new Set(),seenSlugs=new Set();
  for(const record of records){
    if(!record.stable_key||!record.slug||!record.name_ar||!record.sources?.length)throw Error(`${kind}: سجل ناقص ${record.name_ar||record.stable_key||'unknown'}`);
    if(seenKeys.has(record.stable_key)||seenSlugs.has(record.slug))throw Error(`${kind}: تكرار في المفتاح أو الرابط ${record.name_ar}`);
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug))throw Error(`${kind}: رابط غير صالح ${record.slug}`);
    seenKeys.add(record.stable_key);seenSlugs.add(record.slug);
  }
}

const universities=buildUniversities();
const medicalCenters=await buildMedicalCenters();
validate(universities,'universities');validate(medicalCenters,'medical-centers');
fs.mkdirSync(OUTPUT_DIR,{recursive:true});
fs.writeFileSync(path.join(OUTPUT_DIR,'universities.json'),JSON.stringify({generated_at:VERIFIED_AT,source_policy:'Official directory identity is not presented as accreditation. Missing facts remain empty.',records:universities},null,2)+'\n');
fs.writeFileSync(path.join(OUTPUT_DIR,'medical-centers.json'),JSON.stringify({generated_at:VERIFIED_AT,source_policy:'Operating status is historical and explicitly dated 2023-12-31; it must not be presented as open now.',records:medicalCenters},null,2)+'\n');
fs.writeFileSync(path.join(OUTPUT_DIR,'coverage.json'),JSON.stringify({generated_at:VERIFIED_AT,universities:coverage(universities),medical_centers:coverage(medicalCenters)},null,2)+'\n');
console.log(JSON.stringify({universities:coverage(universities),medical_centers:coverage(medicalCenters)},null,2));

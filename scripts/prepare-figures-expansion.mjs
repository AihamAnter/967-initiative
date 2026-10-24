import {readFile,writeFile} from 'node:fs/promises';
import {validateFigureProfile,emptyFigureProfile} from '../lib/figureProfiles.js';
import {validateFigureRecord} from '../lib/figureProfileRepository.js';
import {mapYemeniFigure,yemenGovernorates} from '../lib/yemeniFigures.js';
import {createHash} from 'node:crypto';
const date='2026-10-24',root='.audit-tools/figures-expansion';
const baseline=JSON.parse(await readFile(root+'/live-baseline.json','utf8'));
const candidates=JSON.parse(await readFile('data/yemeni-figures/expansion-2026-10.json','utf8'));
const supplements=JSON.parse(await readFile('data/yemeni-figures/editorial-supplements-2026-10.json','utf8'));
const labels=JSON.parse(await readFile(root+'/labels.json','utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const norm=s=>String(s).replace(/[\u064B-\u065Fـ]/g,'').replace(/[أإآ]/g,'ا').replace(/\s+/g,' ').trim();
const clean=s=>s.replace(/\[\d+\]/g,'').replace(/\s+/g,' ').replace(/لا يزال يعمل فيه حتى اليوم/g,'عمل فيه وفق السيرة المنشورة').replace(/حالياً|حاليًا|حتى اليوم/g,'وفق السيرة المنشورة').trim();
function blocks(text){const bits=text.split(/^={2,6}\s*(.*?)\s*={2,6}\s*$/gm),out=[{title:'التعريف والمسيرة',text:bits[0]}];for(let i=1;i<bits.length;i+=2)out.push({title:bits[i],text:bits[i+1]||''});return out;}
function source(page){return {id:'encyclopedia-2026-10',title:page.title+' — السيرة الموسوعية',url:'https://ar.wikipedia.org/wiki/'+encodeURIComponent(page.title.replaceAll(' ','_')),publisher:'ويكيبيديا العربية ومساهموها',accessedAt:date,license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',revisionUrl:'https://ar.wikipedia.org/w/index.php?oldid='+page.revisions[0].revid};}
function claims(entity,pid){return (entity?.claims?.[pid]||[]).filter(c=>c.rank!=='deprecated'&&c.mainsnak?.datavalue);}
function claimYear(c,pid){const v=c.qualifiers?.[pid]?.find(x=>x.datavalue?.value?.precision>=9)?.datavalue?.value?.time;return v?Number(v.slice(1,5)):null;}
function year(entity,pid){const years=[...new Set(claims(entity,pid).filter(c=>c.mainsnak.datavalue.value.precision>=9).map(c=>Number(c.mainsnak.datavalue.value.time.slice(1,5))))];return years.length===1?years[0]:null;}
function addFactsFromData(profile,entity,body){
 const sid='wikidata-2026-10',before=profile.facts.length;
 const add=(id,label,value)=>{if(!value||profile.facts.some(f=>norm(f.value)===norm(value)))return;profile.facts.push({id:'expanded-'+id.toLowerCase(),label,value,sourceIds:[sid]});};
 for(const [pid,label] of [['P69','الدراسة والتكوين'],['P108','مؤسسات العمل في المسيرة'],['P166','جوائز وأوسمة'],['P800','أعمال ومساهمات بارزة'],['P641','الرياضة']]){
  const values=claims(entity,pid).map(c=>labels[c.mainsnak.datavalue.value.id]?.ar).filter(Boolean).filter(v=>pid!=='P69'||(norm(body).includes(norm(v))&&!/فخري|فخرية/.test(body.slice(Math.max(0,body.indexOf(v)-80),body.indexOf(v)+100))));
  if(values.length)add(pid,label,[...new Set(values)].join('، '));
 }
 for(const [i,c]of claims(entity,'P39').entries()){
  const title=labels[c.mainsnak.datavalue.value.id]?.ar,start=claimYear(c,'P580'),end=claimYear(c,'P582');
  // Closed periods only: no inference that an old office is held today.
  if(title&&start&&end&&end<=2026&&start<=end)add('office-'+i,'مسؤولية مؤرخة',title+' ('+start+'–'+end+')');
 }
 if(profile.facts.length>before&&!profile.sources.some(s=>s.id===sid))profile.sources.push({id:sid,title:'بيانات '+(entity.labels?.ar?.value||entity.id)+' ومراجعها',url:'https://www.wikidata.org/wiki/'+entity.id,publisher:'ويكي بيانات',accessedAt:date,license:'CC0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',revisionUrl:''});
}
function enrichExisting(entry,research){
 const {record}=entry,profile=structuredClone(entry.profile),body=profile.sections.flatMap(s=>s.paragraphs).join('\n');
 addFactsFromData(profile,research.entity,body);
 // Expose concrete career details that previously existed only in long prose.
 // Preserve their original references and never turn a quotation into a fact.
 let n=0;
 for(const section of profile.sections){
  if(/نسب|أسر|صفات|اغتيال|مقتل|اتهام|خلاف|اعتقال|وفاة|أقوال|قصائد|مراجع|التعريف/.test(section.title))continue;
  const sentence=section.paragraphs.flatMap(p=>p.split(/(?<=[.؟!])\s+|\n/)).map(clean).find(s=>s.length>65&&s.length<550&&!/[«»"*]|حتى الآن|قال|اتهم|أول من|الأول في|أكبر|أعظم/.test(s));
  if(!sentence||profile.facts.some(f=>norm(f.value).includes(norm(sentence)))||!section.sourceIds.length)continue;
  profile.facts.push({id:'career-detail-'+n,label:section.title,value:sentence,sourceIds:[...section.sourceIds]});
  n++;if(n===3)break;
 }
 // Sparse historical and sports files get a sourced, useful summary as well.
 if(!n){const section=profile.sections.find(s=>s.paragraphs.some(p=>p.length>70)&&s.sourceIds.length);if(section){const sentences=section.paragraphs.join(' ').split(/(?<=[.؟!])\s+/).filter(s=>s.length>65&&s.length<700);const sentence=sentences.find(s=>!norm(record.short_bio).includes(norm(s)))||sentences.at(-1);if(sentence)profile.facts.push({id:'career-detail-0',label:'من المسيرة والإسهام',value:clean(sentence),sourceIds:section.sourceIds});}}
 // Dated events are extracted only from explicitly Gregorian modern dates.
 const seenYears=new Set(profile.timeline.map(e=>e.year));let t=0;
 for(const s of profile.sections){if(/نسب|أسر|وفاة|اغتيال|مقتل|اتهام|خلاف|أقوال|قصائد/.test(s.title))continue;for(const p of s.paragraphs){for(const sentence of p.split(/(?<=[.؟!])\s+|\n/)){
  if(sentence.length<50||sentence.length>500||/هجري|هـ|اتهام|قال|أول من|أكبر|أعظم|حتى اليوم/.test(sentence))continue;
  const years=[...sentence.matchAll(/\b(18[5-9]\d|19\d{2}|20[0-2]\d)\s*(?:م|ميلادي)?\b/g)].map(m=>Number(m[1]));
  if(years.length!==1||years[0]>2026||years[0]===record.birth_year||years[0]===record.death_year||seenYears.has(years[0])||!s.sourceIds.length)continue;
  profile.timeline.push({id:'expanded-event-'+t,year:years[0],dateLabel:String(years[0]),title:s.title,description:clean(sentence),sourceIds:s.sourceIds});seenYears.add(years[0]);if(++t===3)break;
 }if(t===3)break;}if(t===3)break;}
 profile.timeline.sort((a,b)=>(a.year??0)-(b.year??0));profile.reviewedAt=date;
 // Add missing context to short directory introductions, keeping them concise.
 const extras=profile.facts.filter(f=>f.id.startsWith('career-detail-')).map(f=>f.value).filter(s=>!norm(record.short_bio).includes(norm(s)));
 let summary=record.short_bio;if(summary.length<280&&extras.length){const sentence=extras.find(s=>summary.length+s.length<620);if(sentence)summary+=' '+sentence;}
 return {record:validateFigureRecord({...record,short_bio:summary}),profile:validateFigureProfile(profile)};
}
const political={
 'qahtan-al-shaabi':[['النشأة والعمل الوطني','ارتبط قحطان الشعبي بالحركة الوطنية في جنوب اليمن، وكان من قادة الجبهة القومية التي شاركت في إنهاء الحكم البريطاني.'],['رئاسة الدولة','تولى رئاسة جمهورية اليمن الجنوبية الشعبية عند الاستقلال في 30 نوفمبر 1967. وانتهت رئاسته في يونيو 1969، في مرحلة مبكرة من بناء مؤسسات الدولة الجنوبية.']],
 'salim-rubai-ali':[['المسيرة السياسية','اشتهر سالم ربيع علي باسم سالمين، وكان من قادة الجبهة القومية في جنوب اليمن.'],['رئاسة مجلس الرئاسة','ترأس مجلس الرئاسة في اليمن الجنوبي بين 1969 و1978. تزامنت هذه المرحلة مع تحول اسم الدولة إلى جمهورية اليمن الديمقراطية الشعبية عام 1970.']],
 'abdul-fattah-ismail':[['التكوين والنشاط','جمع عبد الفتاح إسماعيل بين العمل السياسي والكتابة، وارتبط نشاطه بعدن والحركة الوطنية في جنوب اليمن.'],['المسؤوليات السياسية','كان من مؤسسي الحزب الاشتراكي اليمني، وتولى قيادة الحزب ورئاسة هيئة رئاسة مجلس الشعب الأعلى في أواخر السبعينيات. عاد إلى النشاط السياسي في عدن في الثمانينيات، وتوفي في أحداث يناير 1986.']],
 'ali-nasser-mohammed':[['المسيرة والمسؤوليات','شغل علي ناصر محمد رئاسة الوزراء في اليمن الجنوبي خلال السبعينيات وبداية الثمانينيات، وتولى قيادة الدولة والحزب في الفترة من 1980 إلى 1986.'],['الكتابة والتوثيق','نشر مؤلفات ومذكرات تتناول تاريخ الجنوب وتجربته السياسية. وتُقرأ هذه الكتب بوصفها شهادة صاحب دور في الأحداث، مع الرجوع إلى مصادر أخرى عند دراسة الخلافات السياسية.']],
 'abdulrahman-al-iryani':[['العلم والعمل الوطني','تلقى عبد الرحمن الإرياني تعليمًا دينيًا، وعمل في القضاء، ثم شارك في الحركة الوطنية اليمنية وفي الحياة السياسية بعد ثورة سبتمبر 1962.'],['المجلس الجمهوري','ترأس المجلس الجمهوري في الجمهورية العربية اليمنية بين 1967 و1974. ارتبطت سنوات رئاسته بحصار صنعاء ثم المصالحة التي أنهت مرحلة الحرب بين الجمهوريين والملكيين.']],
 'ali-abdullah-saleh':[['المسيرة العسكرية والسياسية','بدأ علي عبد الله صالح مسيرته في القوات المسلحة، وتدرج في المسؤوليات العسكرية قبل انتخابه رئيسًا للجمهورية العربية اليمنية سنة 1978.'],['الرئاسة والوحدة','أصبح رئيسًا للجمهورية اليمنية عند إعلان الوحدة في 22 مايو 1990، واستمر في الرئاسة حتى انتقال السلطة سنة 2012. قُتل في صنعاء في ديسمبر 2017.']],
 'ahmed-mohammed-noman':[['التعليم والحركة الوطنية','كان أحمد محمد نعمان مربيًا وسياسيًا من الحجرية بمحافظة تعز. ارتبط اسمه بالتعليم وبالحركة الإصلاحية وتأسيس نشاط الأحرار اليمنيين في عدن إلى جانب محمد محمود الزبيري.'],['العمل السياسي والتأليف','تولى رئاسة الوزراء في الجمهورية العربية اليمنية، وترك شهادات وكتابات عن الحركة الوطنية وتجربته السياسية. وتساعد سيرته في تتبع الصلة بين التعليم والصحافة والإصلاح السياسي في اليمن الحديث.']],
 'abdullah-al-ahmar':[['الدور القبلي والسياسي','ارتبط عبد الله بن حسين الأحمر بقيادة قبيلة حاشد، وشارك في الحياة السياسية للجمهورية العربية اليمنية ثم الجمهورية اليمنية.'],['المجلس النيابي والتنظيم الحزبي','كان من مؤسسي التجمع اليمني للإصلاح سنة 1990، وتولى رئاسة مجلس النواب بعد انتخابات 1993 حتى وفاته سنة 2007. وله مذكرات تتناول مسيرته السياسية.']],
};
function newProfile(candidate,research,index){
 const [slug,,field,governorateId,knownFor]=candidate,{page,entity}=research;
 const wiki=source(page),profile=emptyFigureProfile();profile.reviewedAt=date;profile.sources=[wiki,{id:'wikidata',title:'البيانات التعريفية '+entity.id,url:'https://www.wikidata.org/wiki/'+entity.id,publisher:'ويكي بيانات',accessedAt:date,license:'CC0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',revisionUrl:''}];
 const name=({'balqees-fathi':'بلقيس فتحي','hussein-al-mihdhar':'حسين أبو بكر المحضار','abdullah-al-ahmar':'عبد الله بن حسين الأحمر','ahmed-al-muhajir':'أحمد بن عيسى المهاجر'})[slug]||page.title.replace(/ \((مغني|مغنية|سياسي يمني)\)$/,'');
 const intro=name+' '+knownFor+'.';profile.sections.push({id:'intro',title:'التعريف',paragraphs:[intro],sourceIds:[wiki.id]});
 const parsed=blocks(page.extract);
 if(political[slug])for(const [i,[title,text]]of political[slug].entries())profile.sections.push({id:'biography-'+i,title,paragraphs:[text],sourceIds:[wiki.id]});
 else{
  for(const [i,b]of parsed.entries()){
   if(i&&(!/نشأ|مولد|حياة|دراس|تعليم|مسير|مشوار|عمل|خبرة|مؤهل|مساهم|شعره|مناصب|جوائز|تكريم|مؤلف|روايات|إصدارات|أغاني|دواوين/.test(b.title)||/نسب|أسر|شخصية|زواج|وفاة|اغتيال|اعتقال|أقوال|نماذج|قصائد|محاولة|مصادر|مراجع/.test(b.title)))continue;
   const paragraphs=b.text.split(/\n+/).map(clean).filter(p=>p.length>65&&!/\*\*|\* \*|«|»|قال عنه|قالت عنه|اتهام|تهم|هدد|أول من|أول خريج|الأول في|أول من يصبح|أعظم|أفضل|الأشهر|حتى الآن/.test(p)).map(p=>{
    const sentences=p.split(/(?<=[.؟!])\s+/);let out='';for(const s of sentences){if(out.length+s.length>1000)break;out+=(out?' ':'')+s;}return out;
   }).filter(p=>p.length>65).slice(0,3);
   if(paragraphs.length)profile.sections.push({id:'biography-'+i,title:i?b.title:'النشأة والمسار',paragraphs,sourceIds:[wiki.id]});
   if(profile.sections.length>=7)break;
  }
 }
 // Titles only; never reproduce song lyrics or poems.
 const workBlocks=parsed.filter(b=>/أغاني|مؤلف|روايات|دواوين|دواوينه|مجموعه من أغاني/.test(b.title)&&!/دراسات عن|مراجع/.test(b.title));let w=0;
 for(const b of workBlocks)for(const raw of b.text.split('\n').map(clean).filter(Boolean)){
  if(raw.length<3||raw.length>160||/[«»؟!]|^(له|من|أصدر|غنى|غنّى|نشر|صدرت|صدر|غنت|لدى) /.test(raw))continue;
  const title=raw.replace(/^[\d.\-–\s]+/,'').replace(/[،:؛.\s-]+$/,'');if(!title||profile.works.some(x=>norm(x.title)===norm(title)))continue;
  profile.works.push({id:'work-'+w,title,kind:/أغاني/.test(b.title)?'أغنية':/شعر|دواوين/.test(b.title)?'ديوان شعر':/روايات/.test(b.title)?'رواية':'إصدار',year:null,description:'عنوان وارد في قائمة '+b.title+' بالمصدر الموسوعي.',url:'',sourceIds:[wiki.id]});if(++w>=12)break;
 }
 const supplement=supplements[slug];
 if(supplement){
  const refs=[wiki.id];
  if(supplement.source){const [title,url,publisher]=supplement.source;profile.sources.push({id:'editorial-reference',title,url,publisher,accessedAt:date,license:'',licenseUrl:'',revisionUrl:''});refs.push('editorial-reference');}
  if(supplement.sections)profile.sections=[profile.sections[0],...supplement.sections.map(([title,text],i)=>({id:'reviewed-biography-'+i,title,paragraphs:[text],sourceIds:refs}))];
  if(supplement.works)profile.works=supplement.works.map(([title,kind],i)=>({id:'reviewed-work-'+i,title,kind,year:null,description:'من الأعمال الواردة في مصادر السيرة.',url:'',sourceIds:refs}));
 }
 profile.works=profile.works.filter(w=>!/^للصنعاني مصنفات|^صدر له|^غنت |^لدى |منها$/.test(w.title)).map(w=>w.title.startsWith('الشيخة زعفران')?{...w,title:'الشيخة زعفران'}:w.title.startsWith('موت نشوان ونكبة الراعية')?{...w,title:'موت نشوان ونكبة الراعية'}:w);
 let birth=year(entity,'P569'),death=year(entity,'P570');
 if(slug==='al-amir-al-sanani'){birth=null;profile.notes.push('تذكر السيرة الموسوعية سنة 1687 للميلاد، بينما تذكر ويكي بيانات 1688؛ تُترك سنة الميلاد في البطاقة غير محسومة.');}
 if(slug==='lutfi-jafar-aman'){death=1971;profile.notes.push('اعتمدت سنة الوفاة 1971 كما في السيرة الموسوعية؛ تورد ويكي بيانات 1972، ويُصرّح بهذا الاختلاف بدل إخفائه.');}
 for(const [pid,label]of [['P569','الميلاد'],['P570','الوفاة']]){const years=[...new Set(claims(entity,pid).filter(c=>c.mainsnak.datavalue.value.precision>=9).map(c=>Number(c.mainsnak.datavalue.value.time.slice(1,5))))];if(years.length>1)profile.notes.push('تختلف بيانات '+label+' في ويكي بيانات بين السنوات '+years.join(' / ')+'؛ تُذكر رواية السيرة في النص وتُترك السنة غير المحسومة في البطاقة فارغة.');}
 for(const [key,label]of [['P19','مكان الميلاد'],['P20','مكان الوفاة'],['P106','مجالات العمل']]){let values=claims(entity,key).map(c=>labels[c.mainsnak.datavalue.value.id]?.ar).filter(Boolean);if(slug==='mohammed-juma-khan'&&key==='P19')values=['قرن ماجد، وادي دوعن — وفق السيرة الموسوعية'];if(values.length)profile.facts.push({id:'fact-'+key.toLowerCase(),label,value:[...new Set(values)].join('، '),sourceIds:[slug==='mohammed-juma-khan'&&key==='P19'?wiki.id:'wikidata']});}
 for(const [key,title]of [[birth,'الميلاد'],[death,'الوفاة']])if(key){const refs=[slug==='lutfi-jafar-aman'&&title==='الوفاة'?wiki.id:'wikidata'];profile.timeline.push({id:title==='الميلاد'?'birth':'death',year:key,dateLabel:String(key),title,description:'السنة بحسب البيانات التعريفية للمصدر؛ لا يُستنتج يوم أو شهر غير محسوم.',sourceIds:refs});profile.facts.push({id:title==='الميلاد'?'birth':'death',label:title,value:String(key),sourceIds:refs});}
 addFactsFromData(profile,entity,profile.sections.flatMap(s=>s.paragraphs).join('\n'));
 profile.license={name:'CC BY-SA 4.0',url:'https://creativecommons.org/licenses/by-sa/4.0/',attribution:'أُعدّت السيرة بالاستناد إلى مقالة «'+page.title+'» لمساهمي ويكيبيديا العربية، بالاختصار وإعادة التنظيم. الأجزاء المقتبسة أو المعدلة متاحة برخصة النسب والمشاركة بالمثل 4.0. بيانات ويكي بيانات متاحة برخصة CC0.',sourceUrl:wiki.url,revisionUrl:wiki.revisionUrl};
 const bio=profile.sections.slice(1).flatMap(s=>s.paragraphs).find(p=>p.length>=100&&p.length<550);
 const record=validateFigureRecord({slug,full_name:name,known_for:knownFor,field,governorate_id:governorateId,era:birth&&birth<1800?'تاريخية':'معاصرة',birth_year:birth,death_year:death,short_bio:(intro+(bio?' '+bio:'')).slice(0,650),display_order:121+index,is_published:true});
 return enrichExisting({record,profile},research);
}
const expanded=[],changes=[];
for(const entry of baseline.entries){const research=JSON.parse(await readFile(root+'/'+entry.record.slug+'.json','utf8'));const result=enrichExisting(entry,research);expanded.push(result);changes.push({slug:entry.record.slug,name:entry.record.full_name,kind:'update',expectedRevision:entry.record.updated_at,beforeHash:hash({record:validateFigureRecord(entry.record),profile:entry.profile}),afterHash:hash(result),factsAdded:result.profile.facts.length-entry.profile.facts.length,eventsAdded:result.profile.timeline.length-entry.profile.timeline.length,bioExpanded:result.record.short_bio!==entry.record.short_bio});}
const knownQids=new Set(baseline.entries.flatMap(x=>x.profile.sources.map(s=>s.url.match(/wikidata.org\/wiki\/(Q\d+)/)?.[1]).filter(Boolean)));
for(const [index,candidate]of candidates.entries()){
 const research=JSON.parse(await readFile(root+'/'+candidate[0]+'.json','utf8'));if(!research.page.extract||!research.entity)throw Error('Incomplete research '+candidate[0]);if(knownQids.has(research.entity.id))throw Error('Duplicate identity '+candidate[0]);knownQids.add(research.entity.id);
 const result=newProfile(candidate,research,index);expanded.push(result);changes.push({slug:result.record.slug,name:result.record.full_name,kind:'create',wikidataId:research.entity.id,afterHash:hash(result)});
}
expanded.sort((a,b)=>a.record.display_order-b.record.display_order);
await writeFile('data/yemeni-figures/profiles.json',JSON.stringify(expanded,null,2)+'\n');
const cards=expanded.map(({record})=>({...mapYemeniFigure({...record,id:'catalog-'+record.slug}),isDemo:true}));
await writeFile('lib/yemeniFiguresCatalog.js','// Generated from the reviewed profiles bundle; no database fallback when configured.\nexport const yemeniFiguresCatalog = '+JSON.stringify(cards,null,2)+';\n');
const counts=rows=>Object.fromEntries(['sections','facts','timeline','works','gallery','sources'].map(k=>[k,rows.reduce((n,x)=>n+x.profile[k].length,0)]));
const plan={reviewedAt:date,beforeCount:baseline.entries.length,afterCount:expanded.length,addedCount:candidates.length,updatedCount:changes.filter(x=>x.kind==='update'&&(x.factsAdded||x.eventsAdded||x.bioExpanded)).length,before:counts(baseline.entries),after:counts(expanded),changes};
await writeFile('data/yemeni-figures/expansion-plan-2026-10.json',JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({...plan,changes:undefined},null,2));

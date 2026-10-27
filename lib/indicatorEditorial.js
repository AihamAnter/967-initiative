// Portable editorial data shape shared by the admin editor, public page and tests.
// Public exposure is controlled by RLS and the published flag, never by this helper.
export const emptyIndicatorEditorial = Object.freeze({
  intro:'', why_it_matters:'', historical_context:'', limitations:'',
  source_notes:'', reference_links:[], reviewed_on:'', is_published:false,
});
export const editorialFieldLimits = Object.freeze({
  intro:1600, why_it_matters:4000, historical_context:5000,
  limitations:4000, source_notes:3000,
});

export function normalizeIndicatorEditorial(row) {
  return {
    ...emptyIndicatorEditorial,
    ...Object.fromEntries(Object.keys(editorialFieldLimits).map(key=>[key,String(row?.[key]??'')])),
    reference_links:Array.isArray(row?.reference_links)?row.reference_links.filter(x=>x&&typeof x.title==='string'&&typeof x.url==='string'):[],
    reviewed_on:String(row?.reviewed_on??''),
    is_published:row?.is_published===true,
  };
}

export function safeEditorialReference(value) {
  if (!value || typeof value.url!=='string' || typeof value.title!=='string') return null;
  const title=value.title.trim(),input=value.url.trim();
  if (title.length<2||title.length>160||input.length>1500||/\s/.test(input))return null;
  try {
    const parsed=new URL(input);
    if (!['http:','https:'].includes(parsed.protocol)||!parsed.hostname||parsed.username||parsed.password) return null;
    return {title,url:parsed.href};
  } catch {return null;}
}

export function editorialReferencesToText(refs) {
  return (Array.isArray(refs)?refs:[]).map(ref=>[ref.title,ref.url].join(' | ')).join('\n');
}

export function parseEditorialReferences(text) {
  const rows=String(text??'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  if (rows.length>10) throw new Error('الحد الأقصى للمراجع عشرة روابط.');
  const references=[],seen=new Set();
  for (const row of rows) {
    const divider=row.indexOf('|');
    if(divider<2)throw new Error('اكتب كل مرجع بصيغة: اسم المرجع | https://example.org');
    const normalized=safeEditorialReference({title:row.slice(0,divider).trim(),url:row.slice(divider+1).trim()});
    if(!normalized)throw new Error('راجع اسم المرجع والرابط: يجب أن يكون رابط HTTP أو HTTPS صالحاً دون بيانات دخول.');
    if(seen.has(normalized.url))throw new Error('لا تكرر الرابط نفسه في قائمة المراجع.');
    seen.add(normalized.url);references.push(normalized);
  }
  return references;
}

export function validateIndicatorEditorial(value) {
  for(const [key,limit] of Object.entries(editorialFieldLimits)) {
    if(typeof value?.[key]!=='string'||value[key].length>limit)throw new Error('تجاوز أحد حقول الشرح الحد المسموح.');
  }
  const references=(value.reference_links||[]).map(safeEditorialReference);
  if(references.length>10||references.some(x=>!x))throw new Error('تحقق من روابط المراجع.');
  if(value.reviewed_on && !/^\d{4}-\d{2}-\d{2}$/.test(value.reviewed_on))throw new Error('تاريخ مراجعة المصدر غير صالح.');
  if(value.is_published){
    if(value.intro.trim().length<40||value.limitations.trim().length<30)throw new Error('قبل النشر أكمل الخلاصة وحدود البيانات.');
    if(!references.length||!value.reviewed_on)throw new Error('قبل النشر أضف مرجعاً وتاريخ مراجعة المصادر.');
  }
  return {...Object.fromEntries(Object.keys(editorialFieldLimits).map(key=>[key,value[key].trim()])),reference_links:references,
    reviewed_on:value.reviewed_on||null,is_published:Boolean(value.is_published)};
}

export const electricityEditorialDraft = Object.freeze({
  intro:'وفق تقديرات البنك الدولي، بلغت نسبة سكان اليمن الذين لديهم إمكانية الوصول إلى الكهرباء 86.3% في سنة القياس 2024. هذا المؤشر لا يقيس انتظام التيار أو عدد ساعات التغذية، ولا يمثل قياساً مباشراً لاستقرار شبكة الكهرباء.',
  why_it_matters:'يساعد الوصول إلى الكهرباء في الإنارة والدراسة وحفظ الطعام والتواصل والعمل. لكن توفر وسيلة للحصول على الكهرباء لا يعني أن الخدمة مستقرة أو ميسورة التكلفة. لفهم واقع الأسر يجب دراسة ساعات التزويد والانقطاعات ومصادر الكهرباء وتكاليفها في بيانات منفصلة.',
  historical_context:'تُظهر السلسلة المسجلة في 967 نسبة 44.1% عام 1992، و49.2% عام 2000، و66.1% عام 2014، و62.0% عام 2018، و73.9% عام 2020، و86.3% عام 2024. الارتفاع من 1992 إلى 2024 يساوي 42.2 نقطة مئوية، وليس 42.2% نمواً نسبياً. ولا تحدد الأرقام وحدها أسباب التغير.',
  limitations:'لا تقيس النسبة ساعات التغذية أو انتظام الكهرباء أو تكلفتها أو الاختلافات بين المحافظات. لا تفصل السلسلة المعروضة بين أنواع مصادر الطاقة. قيمة سنة 2024 ليست قياساً مباشراً لحالة الكهرباء اليوم، ولا يصح الاستنتاج منها بانتهاء أزمة الكهرباء.',
  source_notes:'الرمز الدولي للمؤشر EG.ELC.ACCS.ZS. القيم تقديرات وصول إحصائية وقد تُراجعها الجهة الناشرة. تدقيق المرجع والسنة ضروري قبل النشر؛ لا تغيّر هذه المادة الأرقام الأصلية المعتمدة.',
  reference_links:[
    {title:'البنك الدولي — الوصول إلى الكهرباء في اليمن',url:'https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS?locations=YE'},
    {title:'البنك الدولي — تعريف المؤشر والمنهجية',url:'https://databank.worldbank.org/metadataglossary/world-development-indicators/series/EG.ELC.ACCS.ZS'},
  ],
  reviewed_on:'',is_published:false,
});

export const contributionActions={create:'إضافة',update:'تعديل',publish:'نشر',unpublish:'إلغاء نشر',delete:'حذف',restore:'استعادة',correction:'تصحيح'};
export const contributionSections={magazine:'المجلة',works:'الأعمال الإعلامية',debates:'المناظرات',figures:'الشخصيات',products:'المنتجات والشركات',professionals:'المهنيون',statistics:'اليمن بالأرقام',rankings:'ترتيب اليمن',atlas:'الأطلس',pages:'الصفحات',settings:'إعدادات المحتوى'};
export const contributionTypes={issue:'عدد مجلة',work:'عمل إعلامي',debate:'مناظرة',speaker:'متحدث',figure:'شخصية',company:'شركة',professional:'مهني',statistic:'مؤشر',statistic_value:'قيمة إحصائية',statistic_section:'قسم إحصائي',statistic_domain:'مجال إحصائي',statistic_source:'مصدر إحصائي',ranking:'مؤشر ترتيب',governorate:'محافظة',district:'مديرية',page:'صفحة',setting:'إعداد محتوى'};
export const contributionKeys=['period','from','to','member','section','action','q','sort','page','contentPage'];
export function contributionEditorHref(row){
 const tabs={issue:'issues',work:'works',company:'companies',professional:'professionals',figure:'figures',ranking:'rankings',page:'pages',setting:'settings',statistic:'statistics',statistic_value:'statistics',statistic_source:'statistics',statistic_domain:'statistics',statistic_section:'statistics',governorate:'map',district:'map'};
 if(row.content_type==='debate')return '/admin/debates?debate='+encodeURIComponent(row.content_id);
 if(row.content_type==='speaker')return '/admin/debates';
 const p=new URLSearchParams({tab:tabs[row.content_type]||'issues'});
 if(!['setting','statistic_source','statistic_domain','statistic_section'].includes(row.content_type))p.set('item',row.content_type==='statistic_value'?String(row.current_path||row.path||'').split('/').at(-1):row.content_id);
 if(['governorate','district'].includes(row.content_type))p.set('region',row.content_type);return '/admin?'+p;
}
export function contributionFilters(params,now=new Date()){
 const out={};for(const key of ['member','section','action','q','sort','page','contentPage'])if(params.get(key))out[key]=params.get(key);
 const period=params.get('period')||'30';
 const today=new Date(now.getTime()+3*3600000).toISOString().slice(0,10);
 if(period==='custom'){
  for(const key of ['from','to']){const v=params.get(key);if(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('اختر تاريخًا صحيحًا.');out[key]=new Date(v+'T00:00:00+03:00');}}
  if(out.to)out.to=new Date(out.to.getTime()+86400000);
 }else if(['today','7','30'].includes(period)){
  const end=new Date(today+'T00:00:00+03:00');out.from=new Date(end.getTime()-(period==='today'?0:Number(period)-1)*86400000);out.to=new Date(end.getTime()+86400000);
 }else if(period!=='all')throw Error('نطاق التاريخ غير صالح.');
 if(out.from&&out.to&&out.from>=out.to)throw Error('تاريخ البداية يجب أن يسبق النهاية.');
 if(out.member&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(out.member))throw Error('العضو غير صالح.');
 if(out.section&&!contributionSections[out.section]||out.action&&!contributionActions[out.action])throw Error('فلتر غير صالح.');
 if(out.sort&&!['newest','oldest','title','member'].includes(out.sort))throw Error('الترتيب غير صالح.');
 if(out.page&&!/^[1-9]\d{0,5}$/.test(out.page)||out.contentPage&&!/^[1-9]\d{0,5}$/.test(out.contentPage)||out.q?.length>200)throw Error('طلب البحث غير صالح.');
 return out;
}

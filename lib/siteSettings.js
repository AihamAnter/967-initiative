import {defaultMarqueeItems, site} from './config.js';

export const SITE_CONTENT_KEY = 'site_content';
export const ABOUT_TAGS_KEY = 'home_marquee_items'; // Preserve existing saved words.
export const defaultSiteSettings = {
  heroEyebrow:'من اليمن، لكل اليمنيين', heroTitle:'اليمن،', heroHighlight:'أقرب إليك.',
  heroDescription:'حكايات نرويها، ومعرفة نتشاركها، ومساحة تجمعنا.\nاكتشف بلدك، افهم واقعه، وكن جزءاً من حكايته.',
  searchPlaceholder:'ما الذي تريد معرفته عن اليمن؟',
  aboutTitle:'مساحة واحدة.\nتتسع لنا جميعاً.',
  aboutDescription:'967 مبادرة إعلامية ومجتمعية يمنية، تجمع المعرفة والحوار والمشاركة في مساحة مفتوحة لكل اليمنيين.',
  aboutVision:'مجتمع أكثر وعياً ومشاركة، عبر المعرفة الواضحة والحوار المفتوح والعمل المشترك.',
  aboutFields:'إنتاج المحتوى الإعلامي والمعرفي، إتاحة البيانات مع مصادرها، وتطوير مساحات الحوار والمبادرات المجتمعية.',
  aboutTags:[...defaultMarqueeItems],
  headerActionLabel:'كن جزءاً من الحكاية',
  footerTitle:'من اليمن. ولكل اليمنيين.',
  footerDescription:'مساحة نلتقي فيها على المعرفة، ونفتح بها أبواب الحوار والمشاركة.',
  participationEyebrow:'المساحة مساحتك',
  participationTitle:'لديك حكاية، معلومة، أو فكرة؟ نسمعك.',
  participationButtonLabel:'تواصل وشارك',
  instagram:site.instagram, youtube:site.youtube, facebook:site.facebook, tiktok:site.tiktok,
};

export const siteSettingsGroups = [
  {title:'مقدمة الصفحة الرئيسية',description:'العنوان والنص الذي يراه الزائر أولاً.',fields:[
    {key:'heroEyebrow',label:'العبارة أعلى العنوان',maxLength:100},
    {key:'heroTitle',label:'العنوان الرئيسي',maxLength:80},
    {key:'heroHighlight',label:'الجزء الملوّن من العنوان',maxLength:80,optional:true},
    {key:'heroDescription',label:'النص التعريفي',maxLength:600,multiline:true},
    {key:'searchPlaceholder',label:'النص داخل حقل البحث',maxLength:120},
  ]},
  {title:'عن المبادرة',description:'الكلمات التي كانت تظهر في الشريط أصبحت كلمات تعريفية داخل هذا القسم.',fields:[
    {key:'aboutTitle',label:'عنوان القسم',maxLength:160,multiline:true},
    {key:'aboutDescription',label:'نبذة المبادرة',maxLength:1500,multiline:true},
    {key:'aboutVision',label:'رؤيتنا ورسالتنا',maxLength:1500,multiline:true},
    {key:'aboutFields',label:'مجالات عملنا',maxLength:1500,multiline:true},
  ]},
  {title:'دعوة المشاركة',description:'الدعوة التي تظهر أسفل الصفحة الرئيسية وتفتح صفحة التواصل والمساهمة.',fields:[
    {key:'participationEyebrow',label:'العبارة التمهيدية',maxLength:100},
    {key:'participationTitle',label:'عنوان دعوة المشاركة',maxLength:180},
    {key:'participationButtonLabel',label:'نص زر المشاركة',maxLength:40},
  ]},
  {title:'الترويسة والتذييل',description:'نصوص مشتركة تظهر في صفحات الموقع.',fields:[
    {key:'headerActionLabel',label:'نص زر المشاركة في الترويسة',maxLength:40},
    {key:'footerTitle',label:'عنوان التذييل',maxLength:120},
    {key:'footerDescription',label:'وصف التذييل',maxLength:600,multiline:true},
  ]},
  {title:'روابط التواصل الاجتماعي',description:'اترك الرابط فارغاً لإخفاء المنصة من التذييل. استخدم رابطاً عاماً يبدأ بـ https:// أو http://.',fields:[
    {key:'instagram',label:'إنستغرام',maxLength:2048,url:true,optional:true},
    {key:'youtube',label:'يوتيوب',maxLength:2048,url:true,optional:true},
    {key:'facebook',label:'فيسبوك',maxLength:2048,url:true,optional:true},
    {key:'tiktok',label:'تيك توك',maxLength:2048,url:true,optional:true},
  ]},
];
const fields=siteSettingsGroups.flatMap(group=>group.fields);

function validUrl(value) {
  try {const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password;} catch {return false;}
}
export function parseAboutTags(value) {
  return (Array.isArray(value)?value:String(value||'').split(/\r?\n|،|,/)).filter(item=>typeof item==='string').map(item=>item.trim()).filter(Boolean);
}

// Only explicitly editable, public fields are passed to pages or stored by the form.
export function validateSiteSettings(input) {
  const value={},errors=[];
  for(const field of fields){
    const text=typeof input?.[field.key]==='string'?input[field.key].trim():'';
    if((!text&&!field.optional)||text.length>field.maxLength||(text&&field.url&&!validUrl(text)))errors.push(`تحقق من حقل «${field.label}»${field.url?' واستخدم رابطاً عاماً صالحاً.':'.'}`);
    value[field.key]=text;
  }
  const tags=parseAboutTags(input?.aboutTags);
  if(!tags.length||tags.length>12||tags.some(tag=>tag.length>40))errors.push('أضف من كلمة تعريفية واحدة إلى 12 كلمة، وبحد أقصى 40 حرفاً لكل كلمة.');
  value.aboutTags=[...new Set(tags)];
  return {value,errors};
}

export function resolveSiteSettings(rows=[]) {
  const value={...defaultSiteSettings,aboutTags:[...defaultSiteSettings.aboutTags]};
  const saved=rows.find(row=>row.key===SITE_CONTENT_KEY)?.value;
  if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
    for(const field of fields){
      const text=typeof saved[field.key]==='string'?saved[field.key].trim():null;
      if(text!==null&&(text||field.optional)&&text.length<=field.maxLength&&(!text||!field.url||validUrl(text)))value[field.key]=text;
    }
  }
  const tags=parseAboutTags(rows.find(row=>row.key===ABOUT_TAGS_KEY)?.value);
  if(tags.length)value.aboutTags=tags;
  return value;
}

export function buildSiteSettingsRows(input,updatedAt=new Date().toISOString()) {
  const {value,errors}=validateSiteSettings(input);
  if(errors.length)throw new Error(errors.join('\n'));
  const {aboutTags,...content}=value;
  return [{key:SITE_CONTENT_KEY,value:content,updated_at:updatedAt},{key:ABOUT_TAGS_KEY,value:aboutTags,updated_at:updatedAt}];
}

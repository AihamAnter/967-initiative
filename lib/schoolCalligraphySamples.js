// Teaching references are intentionally distinct from student practice text.
// The three historical exemplars below are externally hosted works with verified
// public-domain / CC0 status. Do not claim that their text equals lesson.example.
export const SCHOOL_SCRIPT_OPTIONS=[
 {value:'naskh',label:'النسخ'},
 {value:'ruqah',label:'الرقعة'},
 {value:'kufi',label:'الكوفي الحديث'},
 {value:'thuluth',label:'الثلث'},
 {value:'diwani',label:'الديواني'},
 {value:'nastaliq',label:'الفارسي (النستعليق)'},
 {value:'maghribi',label:'المغربي'}
];
export const SCHOOL_SCRIPT_IDS=SCHOOL_SCRIPT_OPTIONS.map(item=>item.value);
const CALLIGRAPHY_STAGE_SCRIPTS=[
 'naskh','naskh','naskh','naskh','ruqah','ruqah',
 'kufi','thuluth','diwani','nastaliq','maghribi','naskh'
];
export function schoolScriptForStage(slug,index){
 return slug==='arabic-calligraphy'&&Number.isInteger(index)?
  CALLIGRAPHY_STAGE_SCRIPTS[index]||'naskh':'naskh';
}
export function validSchoolScript(script){
 return SCHOOL_SCRIPT_IDS.includes(script);
}
// Only vetted fixed URLs are used. No arbitrary CMS-provided image URLs.
export const SCHOOL_HISTORICAL_SAMPLES={
 thuluth:{
  image:'https://upload.wikimedia.org/wikipedia/commons/5/5c/Arabic_calligraphy_thuluth.svg',
  width:706,height:409,
  scriptLabel:'خط الثلث — نموذج خطي حقيقي',
  description:'نص مرجعي مستقل عن نص التمرين، مكتوب بخط الثلث',
  source:'https://commons.wikimedia.org/wiki/File:Arabic_calligraphy_thuluth.svg',
  credit:'Snowstormfigorion · ويكيميديا كومنز · CC0'
 },
 diwani:{
  image:'https://upload.wikimedia.org/wikipedia/commons/d/d9/Diwani.jpg',
  width:390,height:105,
  scriptLabel:'خط الديواني — نموذج خطي حقيقي',
  description:'نموذج أصيل للديواني؛ عبارته ليست بالضرورة كلمة التدريب',
  source:'https://commons.wikimedia.org/wiki/File:Diwani.jpg',
  credit:'ويكيميديا كومنز · ملكية عامة'
 },
 maghribi:{
  image:'https://upload.wikimedia.org/wikipedia/commons/2/2e/Maghribi_script.jpg',
  width:1024,height:1096,
  scriptLabel:'الخط المغربي — مخطوطة تاريخية',
  description:'جزء من مخطوطة مغربية يعود إلى نحو 1250–1350م؛ ليس نص التمرين',
  source:'https://commons.wikimedia.org/wiki/File:Maghribi_script.jpg',
  credit:'مكتبة الكونغرس · خطاط مجهول · ملكية عامة'
 }
};

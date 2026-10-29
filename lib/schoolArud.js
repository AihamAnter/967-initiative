// First four independently graded stages of the 967 School Arabic prosody course.
export const ARUD_STAGES=[
 {index:0,id:'spoken-written',title:'ما يُنطق وما يُكتب',subtitle:'ابدأ من صوت الكلام',duration:'5 دقائق',
  summary:'تعرّف على قاعدة الكتابة العروضية: نكتب ما ننطق.',intro:'في العروض لا نزن شكل الكلمة في المصحف أو المعجم، بل الأصوات التي تُنطق عند الإنشاد. لذلك قد نظهر ألفًا منطوقة أو نفكّ الشدة إلى حرفين، ويُكتب التنوين نونًا ساكنة.',
  tips:['العروض يقيس الأصوات المنطوقة، لا عدد الحروف المرسومة.','الشدة تعني حرفين في النطق: ساكنًا ثم متحركًا.','التنوين عند الوصل يُنطق نونًا ساكنة، والحروف التي لا تُنطق لا تُحسب.'],
  examples:[{label:'هذا ← هاذا',note:'نثبت الألف المسموعة.'},{label:'لكن ← لاكن',note:'نكتب المد المسموع.'},{label:'إنَّ ← إنْنَ',note:'نفك الشدة إلى حرفين.'}]},
 {index:1,id:'moving-resting',title:'الحركة والسكون',subtitle:'رمزان لصوت كل حرف',duration:'6 دقائق',
  summary:'كوّن سلسلة / و0 من كلمات مشكّلة.',intro:'في التقطيع الأولي نرمز إلى الحرف المتحرك بـ / وإلى الساكن بـ 0. حروف المد بعد الحركة صوت طويل يضم متحركًا وساكنًا، أما الحركات القصيرة فهي متحرك فقط.',
  tips:['/ = متحرك، و0 = ساكن.','تظهر حروف المد في التقطيع في صورة موضع ساكن بعد حركة.','هذه أمثلة مضبوطة للتدرّب بعيدًا عن الوقف والهمزات المعقدة.'],
  examples:[{label:'مَنْ ← /0',note:'ميم متحركة ونون ساكنة.'},{label:'كَتَبَ ← ///',note:'ثلاثة أحرف متحركة.'},{label:'مَا ← /0',note:'متحرك وبعده مد ساكن.'}]},
 {index:2,id:'syllable-steps',title:'المقاطع الصوتية',subtitle:'قصير أم طويل؟',duration:'7 دقائق',
  summary:'رتّب المقاطع القصيرة ᴗ والطويلة —.',intro:'يمكن النظر إلى إيقاع الكلام بوصفه مقاطع قصيرة وطويلة. المقطع القصير يكون غالبًا متحركًا يتلوه متحرك آخر، والطويل يتكون من حركة ومد أو من حركة وسكون.',
  tips:['ᴗ = مقطع قصير، و— = مقطع طويل.','كَتَبَ ثلاثة مقاطع قصيرة؛ ومَنْ مقطع طويل.','التقطيع هنا على النطق المبيّن بالحركات، وليس على الإملاء غير المشكّل.'],
  examples:[{label:'كَتَبَ ← ᴗ ᴗ ᴗ',note:'ثلاثة مقاطع قصيرة.'},{label:'مَنْ ← —',note:'حركة ثم سكون.'},{label:'كَاتِبْ ← — —',note:'مد ثم مقطع مغلق.'}]},
 {index:3,id:'first-feet',title:'أولى التفعيلات',subtitle:'تعرّف على وحدات الوزن',duration:'8 دقائق',
  summary:'ميّز إيقاع فعولن وفاعلن ومفاعيلن وغيرها.',intro:'تتكوّن البحور من تفعيلات تتكرر بأنماط معروفة. بعد فهم المقاطع القصيرة والطويلة تستطيع الآن تمييز بعض التفعيلات الأصلية، دون الدخول بعدُ في الزحافات والعلل.',
  tips:['فعولن = ᴗ — —، وفاعلن = — ᴗ —.','مفاعيلن = ᴗ — — —، وفاعلاتن = — ᴗ — —.','المطلوب التمييز بين الأنماط التعليمية الأصلية قبل دراسة تغيّراتها.'],
  examples:[{label:'فعولن ← ᴗ — —',note:'قصير، طويل، طويل.'},{label:'فاعلن ← — ᴗ —',note:'طويل، قصير، طويل.'},{label:'مستفعلن ← — — ᴗ —',note:'طويل، طويل، قصير، طويل.'}]}
];
export const ARUD_SOURCE='https://www.uoanbar.edu.iq/QECollege/catalog/file/muhadrat%20aruth%20%26qafia.pdf';
export function arudStage(index){return Number.isInteger(index)?ARUD_STAGES[index]??null:null;}
export function arudProgress(records=[]){
 const passed=new Set(records.filter(x=>x.status==='passed').map(x=>x.stage_index));
 const next=ARUD_STAGES.find(s=>!passed.has(s.index));
 return {completed:ARUD_STAGES.filter(s=>passed.has(s.index)).map(s=>s.index),
 unlocked:next?.index??ARUD_STAGES.length-1,finished:!next,attempts:records.length};
}

// Shared public curriculum metadata. No answer keys or private attempt data here.
export const MUSNAD_SLUG='musnad';
export const MUSNAD_STAGES=[
 {id:'first-letters',index:0,title:'الحروف الأولى',subtitle:'تعرّف على شكل الحرف وصوته',duration:'5 دقائق',summary:'ابدأ بأربعة حروف: م، ل، و، هـ.',icon:'letters',
  intro:'المسند خط قديم استُخدم لكتابة لغات جنوب الجزيرة العربية، وليس لغة عربية حديثة مكتوبة بحروف أخرى. تبدأ رحلتك بتعرّف أشكال الحروف.',
  tips:['يضم خط المسند 29 حرفًا ساكنًا.','هذه الرموز تمثل أصواتًا؛ ولا تُكتب الحركات القصيرة مثل الكتابة العربية الحديثة.','تعرّف الآن على 𐩣 (م)، 𐩡 (ل)، 𐩥 (و)، 𐩠 (هـ).'],
  letters:[{glyph:'𐩣',name:'ميم',latin:'m'},{glyph:'𐩡',name:'لام',latin:'l'},{glyph:'𐩥',name:'واو',latin:'w'},{glyph:'𐩠',name:'هاء',latin:'h'}]},
 {id:'read-the-symbol',index:1,title:'ميّز الرموز',subtitle:'فرّق بين الحروف المتقاربة',duration:'6 دقائق',summary:'أضف الراء والقاف والحاء والشين، وميّز الحروف الثمانية.',
  intro:'في المحطة الثانية تتوسع حصيلتك. بعض الأصوات في النقوش القديمة تختلف في قيمتها عن أقرب حروف العربية؛ استخدم المقابلات العربية بوصفها وسيلة تعليمية مبدئية.',
  tips:['تعلّم 𐩧 (ر)، 𐩤 (ق)، 𐩢 (ح)، 𐩦 (ش).','لاحظ شكل كل حرف قبل اختيار المقابل العربي.','الهدف هنا التعرّف البصري، وليس ترجمة الكلمات السبئية.'],
  letters:[{glyph:'𐩧',name:'راء',latin:'r'},{glyph:'𐩤',name:'قاف',latin:'q'},{glyph:'𐩢',name:'حاء',latin:'ḥ'},{glyph:'𐩦',name:'شين',latin:'š'}]},
 {id:'build-a-line',index:2,title:'ركّب واقرأ',subtitle:'رتّب الحروف في اتجاه المسند',duration:'7 دقائق',summary:'كوّن سلاسل قصيرة من حروف المسند بنفسك.',
  intro:'بعد التعرّف على الحروف، جرّب تركيبها في تسلسلات قصيرة. التمارين هنا لتعلّم القراءة والكتابة الحرفية، وليست ادعاءً بأن كل تسلسل كلمة تاريخية موثّقة.',
  tips:['اتجاه كتابة المسند الغالب من اليمين إلى اليسار.','اختر الحروف حسب ترتيبها المبيّن في المطلوب، من الحرف الأول إلى الأخير.','التقطيع هنا حرفي، لا ترجمة لمعنى أو لغة قديمة.'],
  letters:[]}
];
export const MUSNAD_SOURCE='https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-10/';
export const MUSNAD_NAMES='https://www.unicode.org/Public/16.0.0/charts/nameslist/n_10A60.html';
export function musnadStage(index){return Number.isInteger(index)?MUSNAD_STAGES[index]||null:null;}
export function musnadPublicProgress(attempts=[]){
 const passed=new Set(attempts.filter(a=>a.status==='passed').map(a=>a.stage_index));
 const unlocked=Math.min(MUSNAD_STAGES.length-1,MUSNAD_STAGES.findIndex(s=>!passed.has(s.index))===-1?MUSNAD_STAGES.length-1:MUSNAD_STAGES.findIndex(s=>!passed.has(s.index)));
 return {completed:[...passed].filter(i=>i>=0&&i<MUSNAD_STAGES.length).sort((a,b)=>a-b),
  unlocked,finished:MUSNAD_STAGES.every(s=>passed.has(s.index)),
  attempts:attempts.length};
}

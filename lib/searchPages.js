// Public navigation and home sections, with the same destinations shown on the site.
import {contentPagesForSearch,createDefaultContentPages} from './contentPages.js';
export const searchPages = [
  {title:'مناظرات 967',description:'نختلف لنفهم. مساحة يمنية للحوار المنظم والأسئلة والاستطلاعات ومشاهدة التسجيلات.',href:'/debates',keywords:'مناظرة حوار نقاش مشاركون مباشر مسجل أسئلة تصويت'},
  {title:'ترتيب اليمن',description:'اكتشف ترتيب اليمن عالمياً وعربياً في الاقتصاد والصحة والتعليم والتقنية والخدمات والعمل، وقارن الدول والسنة ومصادر البيانات.',href:'/yemen-ranking',keywords:'ترتيب تصنيف مقارنة دول العالم دخل ناتج محلي سكان تعليم صحة إنترنت'},
  {title:'مبادرة 967',description:'مساحة يمنية للمعرفة والإعلام والثقافة والبيانات والمشاركة المجتمعية.',href:'/',keywords:'الرئيسية المنصة اليمن'},
  {title:'الأعمال الإعلامية',description:'الفيديوهات والحوارات والتغطيات من مبادرة 967.',href:'/works',keywords:'أعمالنا المكتبة الإعلامية'},
  {title:'مجلة 967',description:'قراءة المجلة وتحميل ملفات PDF وتصفح أرشيف الأعداد.',href:'/magazine',keywords:'مجلة أعداد أرشيف'},
  {title:'اليمن بالأرقام',description:'المؤشرات الوطنية ومصادرها وسنوات قياسها ومنهجيتها.',href:'/yemen-in-numbers',keywords:'الإحصاءات البيانات المرصد'},
  {title:'اليمن عبر الزمن',description:'مقارنة السلاسل الزمنية والقيم ونسب التغير وتنزيل البيانات.',href:'/yemen-in-numbers/timeline',keywords:'مقارنة رسوم بيانية CSV'},
  {title:'خريطة اليمن',description:'الأطلس التفاعلي لمحافظات اليمن ومديرياته وأماكنه.',href:'/yemen-map',keywords:'جغرافيا خريطة محافظات مديريات أماكن'},
  {title:'ألعاب 967',description:'ألعاب ثقافية تفاعلية عن اليمن، اختبر معلوماتك في التاريخ والجغرافيا والتراث وتحدَّ نفسك كل يوم.',href:'/games',keywords:'مسابقة لعبة ألعاب تحدي يومي ترفيه تعليم ثقافة يمني'},
  {title:'اختبر معرفتك باليمن',description:'10 أسئلة عن اليمن، مع النقاط والإجابات المشروحة والمصادر.',href:'/games/quiz',keywords:'اختبار ثقافة عامة تاريخ جغرافيا أسئلة'},
  {title:'خمن المكان',description:'لعبة صور لمعالم ومدن يمنية، تخمين المكان ومؤقت وتحدي يومي.',href:'/games/place',keywords:'صور خمن مكان محافظة مدينة'},
  {title:'رتب التاريخ',description:'رتب الأحداث التاريخية في اليمن من الأقدم إلى الأحدث ضمن تحدٍ زمني.',href:'/games/timeline',keywords:'ترتيب تاريخ سنوات أحداث ممالك'},
  {title:'أين تقع؟',description:'لعبة اختيار محافظة اليمن الصحيحة على خريطة تفاعلية.',href:'/games/map',keywords:'لعبة خريطة محافظات جغرافيا'},
  {title:'تاريخ اليمن',description:'خط زمني وموسوعة للممالك والدول والأحداث والآثار والمجتمع اليمني مع المصادر.',href:'/yemen-history',keywords:'تاريخ ممالك سبأ حمير معين قتبان دولة رسولية صليحية وثائق نقوش'},
  {title:'شخصيات يمنية',description:'دليل مستقل للسير اليمنية التاريخية والمعاصرة، مع البحث بالمجال والفترة والمحافظة.',href:'/yemeni-figures',keywords:'شخصيات سير تاريخ أعلام أدباء علماء قادة فنانون'},
  {title:'منتجات يمنية',description:'دليل الشركات والمنتجات المحلية والقطاعات.',href:'/yemeni-products',keywords:'دليل شركات منتجات صناعة'},
  {title:'المهنيون',description:'دليل أصحاب المهارات والمهن والخدمات.',href:'/professionals',keywords:'حرف خدمات مهن تخصصات'},
  {title:'دليل الجامعات والمعاهد',description:'دليل المؤسسات التعليمية اليمنية الموثقة مع البحث حسب المحافظة والنوع.',href:'/universities',keywords:'جامعات معاهد كليات تعليم عال قبول تخصصات'},
  {title:'دليل المراكز الطبية',description:'دليل المنشآت الصحية اليمنية الموثقة ومعلومات مواقعها وحالة بياناتها.',href:'/medical-centers',keywords:'مستشفيات مراكز صحية طبية عيادات خدمات تخصصات'},
  {title:'عن المبادرة',description:'رؤية 967 ورسالتها ومجالات عملها في المعرفة والحوار والمشاركة.',href:'/#about',keywords:'من نحن رؤيتنا رسالتنا'},
  {title:'مشاريعنا',description:'967 في الشارع، مناظرات 967، ومشاريع مجتمعية.',href:'/#projects',keywords:'أنشطة مشاريع مناظرات'},
  {title:'تواصل وشارك',description:'اقتراح موضوع أو شخصية أو شركة، وتصحيح معلومة وطلب إضافة ملف مهني والتطوع.',href:'/contribute',keywords:'تواصل معنا مشاركة مساهمة تطوع اقتراح تصحيح'},
];

export function getSettingsSearchPages(settings) {
  const pages=searchPages.map(page=>{
    if(page.href==='/')return {...page,description:[settings.heroTitle,settings.heroHighlight,settings.heroDescription].filter(Boolean).join(' '),keywords:[page.keywords,settings.heroEyebrow,settings.footerTitle,settings.footerDescription].join(' ')};
    if(page.href==='/#about')return {...page,description:settings.aboutDescription,keywords:[page.keywords,settings.aboutTitle,settings.aboutVision,settings.aboutFields,...settings.aboutTags].join(' ')};
    if(page.href==='/#projects')return {...page,description:page.description+(settings.debatesProjectStatus?' حالة مناظرات 967: '+settings.debatesProjectStatus:'')};
    if(page.href==='/contribute')return {...page,keywords:[page.keywords,settings.headerActionLabel,settings.participationEyebrow,settings.participationTitle,settings.participationButtonLabel].join(' ')};
    return page;
  });
  return [...pages,...contentPagesForSearch(settings.contentPages===null?[]:settings.contentPages??createDefaultContentPages(settings))];
}

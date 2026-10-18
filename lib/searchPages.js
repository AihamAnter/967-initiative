// Public navigation and home sections, with the same destinations shown on the site.
import {contentPagesForSearch,createDefaultContentPages} from './contentPages.js';
export const searchPages = [
  {title:'ترتيب اليمن',description:'اكتشف ترتيب اليمن عالمياً وعربياً في الاقتصاد والصحة والتعليم والتقنية والخدمات والعمل، وقارن الدول والسنة ومصادر البيانات.',href:'/yemen-ranking',keywords:'ترتيب تصنيف مقارنة دول العالم دخل ناتج محلي سكان تعليم صحة إنترنت'},
  {title:'مبادرة 967',description:'مساحة يمنية للمعرفة والإعلام والثقافة والبيانات والمشاركة المجتمعية.',href:'/',keywords:'الرئيسية المنصة اليمن'},
  {title:'الأعمال الإعلامية',description:'الفيديوهات والحوارات والتغطيات من مبادرة 967.',href:'/works',keywords:'أعمالنا المكتبة الإعلامية'},
  {title:'مجلة 967',description:'قراءة المجلة وتحميل ملفات PDF وتصفح أرشيف الأعداد.',href:'/magazine',keywords:'مجلة أعداد أرشيف'},
  {title:'اليمن بالأرقام',description:'المؤشرات الوطنية ومصادرها وسنوات قياسها ومنهجيتها.',href:'/yemen-in-numbers',keywords:'الإحصاءات البيانات المرصد'},
  {title:'اليمن عبر الزمن',description:'مقارنة السلاسل الزمنية والقيم ونسب التغير وتنزيل البيانات.',href:'/yemen-in-numbers/timeline',keywords:'مقارنة رسوم بيانية CSV'},
  {title:'اكتشف اليمن',description:'الأطلس التفاعلي للمحافظات والمديريات والشخصيات اليمنية.',href:'/yemen-map',keywords:'جغرافيا خريطة أماكن شخصيات تاريخ'},
  {title:'منتجات يمنية',description:'دليل الشركات والمنتجات المحلية والقطاعات.',href:'/yemeni-products',keywords:'دليل شركات منتجات صناعة'},
  {title:'المهنيون',description:'دليل أصحاب المهارات والمهن والخدمات.',href:'/professionals',keywords:'حرف خدمات مهن تخصصات'},
  {title:'عن المبادرة',description:'رؤية 967 ورسالتها ومجالات عملها في المعرفة والحوار والمشاركة.',href:'/#about',keywords:'من نحن رؤيتنا رسالتنا'},
  {title:'مشاريعنا',description:'967 في الشارع، مناظرات 967، ومشاريع مجتمعية مخطط لها وقيد التحضير.',href:'/#projects',keywords:'أنشطة مشاريع مناظرات'},
  {title:'تواصل وشارك',description:'اقتراح موضوع أو شخصية أو شركة، وتصحيح معلومة وطلب إضافة ملف مهني والتطوع.',href:'/contribute',keywords:'تواصل معنا مشاركة مساهمة تطوع اقتراح تصحيح'},
];

export function getSettingsSearchPages(settings) {
  const pages=searchPages.map(page=>{
    if(page.href==='/')return {...page,description:[settings.heroTitle,settings.heroHighlight,settings.heroDescription].filter(Boolean).join(' '),keywords:[page.keywords,settings.heroEyebrow,settings.footerTitle,settings.footerDescription].join(' ')};
    if(page.href==='/#about')return {...page,description:settings.aboutDescription,keywords:[page.keywords,settings.aboutTitle,settings.aboutVision,settings.aboutFields,...settings.aboutTags].join(' ')};
    if(page.href==='/contribute')return {...page,keywords:[page.keywords,settings.headerActionLabel,settings.participationEyebrow,settings.participationTitle,settings.participationButtonLabel].join(' ')};
    return page;
  });
  return [...pages,...contentPagesForSearch(settings.contentPages===null?[]:settings.contentPages??createDefaultContentPages(settings))];
}

// Verified reference families; a link is contextual reading, not proof of every
// sentence. Tentative UNESCO nominations are explicitly not inscribed sites.
const S={
 prehistoric:{title:'بحث علمي محكّم: الاستيطان في اليمن في الهولوسين المبكر والأوسط (2009)',url:'https://www.sciencedirect.com/science/article/pii/S1631071309001308'},
 lithics:{title:'بحث علمي: تقنيات الأدوات الحجرية في موقع منايزة باليمن',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7406013/'},
 monuments:{title:'مجلة Antiquity: المنشآت الحجرية قبل التاريخ في حضرموت',url:'https://www.cambridge.org/core/journals/antiquity/article/prehistoric-small-scale-monument-types-in-hadramawt-southern-arabia-convergences-in-ethnography-linguistics-and-archaeology/C9B79EF9D8471B34D85874807955ED27'},
 preirrigation:{title:'Journal of Archaeological Science: زراعة مأرب والري قبل سبأ',url:'https://www.sciencedirect.com/science/article/pii/S0305440309004920'},
 socotraart:{title:'Arabian Archaeology and Epigraphy: النقوش الصخرية في سقطرى',url:'https://onlinelibrary.wiley.com/doi/10.1111/aae.12077'},
 marib:{title:'اليونسكو: معالم مملكة سبأ في مأرب (موقع تراث عالمي)',url:'https://whc.unesco.org/en/list/1700/'},
 qad:{title:'اليونسكو: مواقع مملكة قتبان في بيحان (قائمة تمهيدية، غير مدرجة)',url:'https://whc.unesco.org/en/tentativelists/6856/'},
 had:{title:'اليونسكو: المواقع الأثرية لمملكة حضرموت في شبوة (قائمة تمهيدية)',url:'https://whc.unesco.org/en/tentativelists/6855/'},
 tentative:{title:'اليونسكو: قائمة اليمن التمهيدية للتراث العالمي (ترشيحات لا تعني الإدراج)',url:'https://whc.unesco.org/en/tentativelists/action%3Dlisttentative%26order%3Dstates%26state%3Dye'},
 museum:{title:'المتحف البريطاني: حضارات جنوب الجزيرة العربية القديمة',url:'https://www.britishmuseum.org/collection/galleries/ancient-south-arabia'},
 antiquities:{title:'المتحف البريطاني: دليل المقتنيات والنقوش والعطور والبخور من اليمن القديم',url:'https://www.britishmuseum.org/sites/default/files/2019-09/Arab_World_Resource_Web.pdf'},
 sana:{title:'اليونسكو: مدينة صنعاء القديمة',url:'https://whc.unesco.org/en/list/385/'},
 zabid:{title:'اليونسكو: حاضرة زبيد التاريخية',url:'https://whc.unesco.org/en/list/611/'},
 shibam:{title:'اليونسكو: مدينة شبام القديمة المسوّرة',url:'https://whc.unesco.org/en/list/192/'},
 dyn:{title:'موسوعة الشرق الأوسط وشمال أفريقيا: سلالات الحكم في اليمن',url:'https://www.encyclopedia.com/humanities/encyclopedias-almanacs-transcripts-and-maps/yemen-dynasties'},
 modern:{title:'بي بي سي: تسلسل أحداث التاريخ اليمني الحديث',url:'https://www.bbc.com/news/world-middle-east-14704852'},
 historical:{title:'وزارة الخارجية الأمريكية، مكتب المؤرخ: خلفية تاريخية عن اليمن',url:'https://history.state.gov/countries/yemen'},
 crs:{title:'خدمة أبحاث الكونغرس: خلفية تاريخية عن اليمن وعلاقاته الخارجية',url:'https://www.everycrsreport.com/files/20100113_RL34170_4e65e571a5ebf301fee9ba754eb4a6a1524c641f.pdf'},
 un:{title:'الأمم المتحدة: سياق الانتقال السياسي والحوار الوطني في اليمن',url:'https://dppa.un.org/es/yemen'},
 dialogue:{title:'الأمم المتحدة: مؤتمر الحوار الوطني ومخرجاته 2013–2014',url:'https://yemen.un.org/en/download/4043/21008'},
 envoy:{title:'مكتب المبعوث الأممي لليمن: خلفية ومسار الهدنة',url:'https://osesgy.unmissions.org/en/osesgy-background'},
 truce:{title:'الأمم المتحدة: بيان إعلان الهدنة اليمنية 2022م',url:'https://www.un.org/sg/en/content/sg/statement/2022-04-01/secretary-generals-statement-nationwide-truce-yemen'},
 parliament:{title:'مكتبة مجلس العموم البريطاني: اليمن ومسارات التفاوض (2023م)',url:'https://commonslibrary.parliament.uk/research-briefings/cbp-9327/'},
};
const ANCHORS={origins:['first-settlements','early-irrigation'],ancient:['saba','ancient-inscriptions','incense-trade'],islam:['arrival-islam','zabid','zaydi-imamate'],dynasties:['sulayhids','rasulids'],empires:['ottoman-first','aden-british','qasimi-state'],modern:['northern-independence','revolution-1962','unity-1990']};
const NOTES={
 origins:'تحديد السنة هنا مرجع تقريبي للترتيب في الخط الزمني، وليس تاريخاً قطعياً للاكتشاف. ينبغي التمييز بين نتائج التنقيب والنماذج المقترحة لتفسيرها.',
 ancient:'تعاقبت سلطات وممالك قديمة وتداخلت في جنوب الجزيرة العربية؛ ولا تمثل المحافظات الحالية حدوداً تاريخية. تُراجع النقوش والشواهد الأثرية قبل تثبيت التسلسل الدقيق.',
 islam:'اختلفت مراكز السلطة والثقافة بين تهامة والمرتفعات والمدن الساحلية؛ لذلك لا يعني ظهور حدث في سنة بعينها حدوثه بالوتيرة نفسها في جميع المناطق.',
 dynasties:'شهد اليمن الوسيط دولاً محلية متزامنة وسلطات متنازعة. والسنوات هنا نقاط مرجعية لدراسة المرحلة، لا حدوداً حاسمة لفترة سيادة موحّدة.',
 empires:'تغيرت أشكال الإدارة والولاءات المحلية والموانئ عبر القرون. وينبغي التفريق بين النفوذ السياسي والوجود العسكري والسلطة الفعلية في كل منطقة.',
 modern:'هذا مدخل تاريخي سياقي يركز على الوقائع القابلة للتوثيق؛ وقد تختلف تفسيرات الأطراف للأسباب والنتائج. تُراجع المصادر الأصلية عند دراسة التفاصيل المختلف عليها.'
};
// Array record: slug,title,kind,year,period,summary,distinct explanation,source keys,
// optional metadata {related,location,governorate,certainty}.
export function expandHistoryRecords(records,era){
 if(!ANCHORS[era])throw Error('Unknown Yemen history era '+era);
 return records.map(([slug,title,kind,year,period,summary,description,sourceKeys,extra={}])=>{
  const primary=sourceKeys.map(key=>{if(!S[key])throw Error('Unknown bibliography '+key);return S[key];});
  return {slug,title,kind,era,year,period,summary,
   paragraphs:[description,extra.note||NOTES[era]],
   sources:primary,
   related:[...new Set([...(extra.related||[]),...ANCHORS[era].filter(x=>x!==slug).slice(0,2)])].filter(x=>x!==slug),
   isPublished:true,
   ...(extra.location?{location:extra.location}:{}),
   ...(extra.governorate?{governorate:extra.governorate}:{}),
   ...(extra.certainty?{certainty:extra.certainty}:{}),
  };
 });
}

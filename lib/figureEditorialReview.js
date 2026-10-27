// Reviewed supplemental research notes. These notes complement but NEVER
// silently rewrite Supabase figure dossiers or their immutable Storage revisions.
// Each note cites the specific scholarly/institutional source that supports it.
export const editorialFigureReviews = Object.freeze({
  'sayf-ibn-dhi-yazan':{
    title:'التاريخ والسيرة الشعبية ليسا مصدراً واحداً',
    text:'تفيد مكتبة الكونغرس بأن السيرة الشعبية لسيف بن ذي يزن تستند بصورة فضفاضة إلى حاكم يمني من أواخر القرن السادس الميلادي، لكنها تمزج الحدث التاريخي بالخيال الملحمي. لذلك لا ينبغي التعامل مع جميع تفاصيل السيرة الشعبية، أو التواريخ الدقيقة الواردة في الروايات المتأخرة، على أنها حقائق تاريخية ثابتة.',
    sources:[{title:'مكتبة الكونغرس — سيرة سيف بن ذي يزن الشعبية',url:'https://www.loc.gov/resource/gdcwdl.wdl_18734_009/?st=brief'}],
  },
  'dhu-nuwas':{
    title:'الفصل بين التاريخ النقشي والرواية المتأخرة',
    text:'تتناول دراسة أكاديمية منشورة في جامعة آرهوس يوسف أسأر يثأر، المعروف في المصادر العربية بذي نواس، وتحدد حكمه تقريباً بين 522 و525 ميلادية وأحداث نجران سنة 523. ويجب التمييز بين ما تدرسه الأبحاث التاريخية عن تلك الوقائع وبين التفاصيل الأدبية والدينية التي توسعت فيها المصادر اللاحقة.',
    sources:[{title:'جامعة آرهوس — ذو نواس وشهداء نجران في الأدب العربي',url:'https://pure.au.dk/portal/en/publications/dh%C5%AB-nuw%C4%81s-and-the-martyrs-of-najr%C4%81n-in-islamic-arabic-literature-/'}],
  },
  'queen-bilqis':{
    title:'اسم بلقيس بين النص الديني والموروث',
    text:'توضح دائرة المعارف الإيرانية أن ملكة سبأ ترد في القرآن والكتاب المقدس من دون ذكر اسم «بلقيس»، وأن الاسم ورد في الشروح والروايات اللاحقة. وجود مملكة سبأ تاريخياً لا يثبت بمفرده جميع تفاصيل قصة الملكة أو نسبها أو تواريخ حياتها، ولذلك يصنفها دليل 967 ضمن الموروث.',
    sources:[{title:'Encyclopaedia Iranica — Belqīs',url:'https://www.iranicaonline.org/articles/belqis-the-queen-of-sheba-saba-whose-meetings-with-solomon-solayman-are-a-favorite-theme-in-persian-and-arabic-literat/'}],
  },
  'arwa-al-sulayhi':{
    title:'الحكم الصليحي والسلطة السياسية والدينية',
    text:'تؤكد دراسة أكاديمية صادرة عن مطبعة جامعة كامبريدج أن أروى الصليحية تولت أدواراً متدرجة في الحكم من المشاركة ثم الوصاية إلى السيادة، وجمعت بين سلطة سياسية ودينية، واستمر حكمها حتى وفاتها سنة 1138. ولا يحسم هذا المصدر وحده كل تفاصيل مولدها أو روايات تربيتها التي تختلف حولها المراجع.',
    sources:[{title:'Cambridge University Press — Queen Arwa of Yemen',url:'https://www.cambridge.org/core/books/abs/unforgettable-queens-of-islam/sayyida-hurra-queen-arwa-of-yemen-the-little-queen-of-sheba/8C83F9E0585164824DA70E874E420AC4'}],
  },
  'ibrahim-al-hamdi':{
    title:'رئاسته تخص اليمن الشمالي قبل الوحدة',
    text:'يوثق مركز صنعاء للدراسات الاستراتيجية رئاسة إبراهيم الحمدي للجمهورية العربية اليمنية (اليمن الشمالي) بين يونيو 1974 وأكتوبر 1977، في سياق مجلس قيادة عسكري وتحولات مؤسسية وسياسية. لا ينبغي وصفه بأنه رئيس الجمهورية اليمنية الموحدة التي لم تكن قد تأسست آنذاك، كما يجب الفصل بين الوقائع وتقييم إرثه السياسي.',
    sources:[{title:'مركز صنعاء — المجالس الرئاسية في تاريخ اليمن',url:'https://sanaacenter.org/publications/policy-research/14140'}],
  },
});

const crowdsourced=/^(?:https?:\/\/)?(?:[a-z]{2}\.)?(?:wikipedia\.org|wikidata\.org|wikiquote\.org)(?:\/|$)/i;
export function isGeneralEncyclopediaSource(source){
  if(typeof source?.url!=='string')return false;
  return crowdsourced.test(source.url);
}
export function figureNeedsIndependentSources(profile){
  return Boolean(profile&&Array.isArray(profile.sources)&&profile.sources.length>0
    &&profile.sources.every(isGeneralEncyclopediaSource));
}
export function getFigureEditorialReview(slug){
  return editorialFigureReviews[slug]??null;
}

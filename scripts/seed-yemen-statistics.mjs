import {createClient} from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase environment variables are missing.');

const db = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});

const WORLD_BANK_YEMEN_URL = 'https://data.worldbank.org/country/yemen-rep';

const sourceGroups = {
  nationalAccounts: {
    name: 'البنك الدولي - الحسابات القومية',
    publisher: 'World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'سلاسل الحسابات القومية والاقتصاد الكلي المنشورة ضمن مؤشرات التنمية العالمية.',
  },
  economy: {
    name: 'البنك الدولي - مؤشرات الاقتصاد والتمويل',
    publisher: 'World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'مؤشرات الاقتصاد والأسعار والتمويل والتجارة والدين المنشورة عبر World Bank Open Data.',
  },
  labor: {
    name: 'منظمة العمل الدولية عبر البنك الدولي',
    publisher: 'ILO / World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'تقديرات سوق العمل الوطنية المجمعة أو المنمذجة دوليا والمنشورة عبر البنك الدولي.',
  },
  population: {
    name: 'الأمم المتحدة - بيانات السكان عبر البنك الدولي',
    publisher: 'United Nations / World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'تقديرات سكانية وديموغرافية وطنية منشورة ضمن مؤشرات التنمية العالمية.',
  },
  education: {
    name: 'معهد اليونسكو للإحصاء عبر البنك الدولي',
    publisher: 'UNESCO UIS / World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'بيانات التعليم الوطنية المجمعة دوليا والمنشورة عبر World Bank Open Data.',
  },
  health: {
    name: 'منظمة الصحة العالمية وشركاؤها عبر البنك الدولي',
    publisher: 'WHO / UNICEF / World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'مؤشرات الصحة والتغذية والخدمات الصحية المنشورة ضمن مؤشرات التنمية العالمية.',
  },
  infrastructure: {
    name: 'البنك الدولي - مؤشرات البنية التحتية والاتصالات',
    publisher: 'World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'سلاسل المياه والصرف الصحي والنقل والاتصالات والإسكان المنشورة عبر البنك الدولي.',
  },
  energy: {
    name: 'البنك الدولي - قاعدة الوصول إلى الكهرباء SDG7',
    publisher: 'World Bank / ESMAP',
    url: WORLD_BANK_YEMEN_URL,
    description: 'بيانات الوصول إلى الطاقة وكفاءة شبكات الكهرباء والطاقة المتجددة.',
  },
  agriculture: {
    name: 'البنك الدولي - مؤشرات الزراعة والحسابات القومية',
    publisher: 'World Bank / FAO',
    url: WORLD_BANK_YEMEN_URL,
    description: 'سلاسل الزراعة والإنتاج النباتي والحيواني والسمكي المنشورة عبر البنك الدولي.',
  },
  environmentFao: {
    name: 'منظمة الأغذية والزراعة عبر البنك الدولي',
    publisher: 'FAO / World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'بيانات الأرض والمياه والغابات والزراعة المجمعة دوليا والمنشورة عبر البنك الدولي.',
  },
  environment: {
    name: 'البنك الدولي - مؤشرات البيئة والمناخ',
    publisher: 'World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'مؤشرات المناخ والتلوث والمناطق المحمية والكوارث الطبيعية المنشورة عبر البنك الدولي.',
  },
  displacement: {
    name: 'مركز رصد النزوح الداخلي IDMC عبر البنك الدولي',
    publisher: 'IDMC / World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'تقديرات حركات النزوح الجديدة المرتبطة بالنزاع أو الكوارث والمنشورة عبر البنك الدولي.',
  },
  conflict: {
    name: 'مصادر النزاع والأمن عبر البنك الدولي',
    publisher: 'UCDP / UNODC / SIPRI / World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'سلاسل النزاع والوفيات العنيفة والإنفاق العسكري المجمعة من جهات دولية متخصصة.',
  },
  aid: {
    name: 'لجنة المساعدة الإنمائية عبر البنك الدولي',
    publisher: 'OECD DAC / World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'بيانات المساعدات الإنمائية الرسمية الصافية المنشورة عبر البنك الدولي.',
  },
  governance: {
    name: 'مؤشرات الحوكمة العالمية WGI',
    publisher: 'World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'تقديرات مركبة لأبعاد الحوكمة مبنية على مصادر واستطلاعات متعددة.',
  },
  tourism: {
    name: 'منظمة الأمم المتحدة للسياحة عبر البنك الدولي',
    publisher: 'UN Tourism / World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'إحصاءات السياحة الدولية المنشورة ضمن مؤشرات التنمية العالمية.',
  },
  innovation: {
    name: 'المنظمة العالمية للملكية الفكرية عبر البنك الدولي',
    publisher: 'WIPO / World Bank',
    url: WORLD_BANK_YEMEN_URL,
    description: 'مؤشرات البحث والابتكار والملكية الفكرية والتقنية المنشورة عبر البنك الدولي.',
  },
  enterprise: {
    name: 'مسوح المنشآت للبنك الدولي',
    publisher: 'World Bank Enterprise Surveys',
    url: WORLD_BANK_YEMEN_URL,
    description: 'مؤشرات بيئة الأعمال وخصائص المنشآت المستخرجة من مسوح المنشآت.',
  },
};

function indicator(code, domain, slug, name, unit, direction = 'contextual', chart = 'line', source = 'economy', definition = '') {
  return {
    code,
    domain,
    slug,
    name,
    unit,
    direction,
    chart,
    source,
    description: `سلسلة سنوية وطنية لليمن حول ${name}. تعرض السنوات المتاحة فقط دون استكمال الفجوات.`,
    definition: definition || `يقيس هذا المؤشر ${name} وفقا لتعريف الجهة الناشرة للسلسلة.`,
    method: `بيانات وطنية لليمن منشورة عبر World Bank Open Data تحت الرمز ${code}. قد تراجع الجهة الناشرة القيم التاريخية عند تحديث منهجيتها أو مصادرها.`,
  };
}

const datasets = [
  // الاقتصاد والمالية العامة
  indicator('NY.GDP.MKTP.CD', 'gdp', 'gdp-current-usd', 'الناتج المحلي الإجمالي بالأسعار الجارية', 'دولار أمريكي', 'contextual', 'area', 'nationalAccounts'),
  indicator('NY.GDP.PCAP.CD', 'gdp', 'gdp-per-capita-current-usd', 'نصيب الفرد من الناتج المحلي الإجمالي', 'دولار أمريكي للفرد', 'increase', 'line', 'nationalAccounts'),
  indicator('NY.GDP.MKTP.KD.ZG', 'gdp', 'gdp-annual-growth', 'معدل نمو الناتج المحلي الإجمالي', '% سنويا', 'increase', 'bar', 'nationalAccounts'),
  indicator('FP.CPI.TOTL.ZG', 'inflation-prices', 'consumer-price-inflation', 'التضخم في أسعار المستهلك', '% سنويا', 'decrease', 'line', 'economy'),
  indicator('SL.UEM.TOTL.ZS', 'labor-unemployment', 'unemployment-rate-total', 'معدل البطالة الإجمالي', '% من قوة العمل', 'decrease', 'line', 'labor'),
  indicator('SI.POV.NAHC', 'poverty', 'national-poverty-headcount', 'نسبة السكان تحت خط الفقر الوطني', '% من السكان', 'decrease', 'bar', 'economy'),
  indicator('PA.NUS.FCRF', 'currency-monetary', 'official-exchange-rate', 'سعر الصرف الرسمي', 'ريال لكل دولار أمريكي', 'contextual', 'line', 'economy'),
  indicator('FM.LBL.BMNY.GD.ZS', 'currency-monetary', 'broad-money-share-gdp', 'عرض النقد الواسع إلى الناتج المحلي', '% من الناتج المحلي', 'contextual', 'line', 'economy'),
  indicator('FD.AST.PRVT.GD.ZS', 'banking', 'domestic-credit-private-sector', 'الائتمان المحلي المقدم للقطاع الخاص', '% من الناتج المحلي', 'increase', 'line', 'economy'),
  indicator('NE.TRD.GNFS.ZS', 'foreign-trade', 'trade-share-gdp', 'التجارة الخارجية من الناتج المحلي', '% من الناتج المحلي', 'contextual', 'area', 'nationalAccounts'),
  indicator('NE.GDI.FTOT.ZS', 'investment', 'gross-fixed-capital-formation', 'تكوين رأس المال الثابت الإجمالي', '% من الناتج المحلي', 'increase', 'area', 'nationalAccounts'),
  indicator('BX.TRF.PWKR.CD.DT', 'remittances', 'personal-remittances-received', 'تحويلات العاملين الشخصية الواردة', 'دولار أمريكي', 'increase', 'area', 'economy'),
  indicator('DT.DOD.DECT.CD', 'public-debt', 'external-debt-stocks-total', 'إجمالي رصيد الدين الخارجي', 'دولار أمريكي', 'decrease', 'area', 'economy'),
  indicator('DT.DOD.DECT.GN.ZS', 'public-debt', 'external-debt-share-gni', 'الدين الخارجي إلى الدخل القومي الإجمالي', '% من الدخل القومي', 'decrease', 'line', 'economy'),
  indicator('SE.XPD.TOTL.GD.ZS', 'public-finance', 'government-education-expenditure', 'الإنفاق الحكومي على التعليم', '% من الناتج المحلي', 'increase', 'bar', 'education'),

  // السكان والمجتمع
  indicator('SP.POP.0014.TO.ZS', 'age-structure', 'population-age-0-14', 'السكان بعمر 0 إلى 14 سنة', '% من السكان', 'contextual', 'area', 'population'),
  indicator('SP.POP.1564.TO.ZS', 'age-structure', 'population-age-15-64', 'السكان بعمر 15 إلى 64 سنة', '% من السكان', 'contextual', 'area', 'population'),
  indicator('SP.POP.65UP.TO.ZS', 'age-structure', 'population-age-65-plus', 'السكان بعمر 65 سنة فأكثر', '% من السكان', 'contextual', 'area', 'population'),
  indicator('SP.DYN.CBRT.IN', 'births-deaths', 'crude-birth-rate', 'معدل المواليد الخام', 'لكل 1000 شخص', 'contextual', 'line', 'population'),
  indicator('SP.DYN.CDRT.IN', 'births-deaths', 'crude-death-rate', 'معدل الوفيات الخام', 'لكل 1000 شخص', 'decrease', 'line', 'population'),
  indicator('SP.DYN.TFRT.IN', 'family-marriage', 'fertility-rate-total', 'معدل الخصوبة الكلي', 'مولود لكل امرأة', 'contextual', 'line', 'population'),
  indicator('SP.POP.TOTL.FE.ZS', 'women', 'female-population-share', 'نسبة الإناث من السكان', '% من السكان', 'contextual', 'line', 'population'),
  indicator('SL.UEM.1524.ZS', 'youth', 'youth-unemployment-rate', 'معدل بطالة الشباب', '% من قوة العمل بعمر 15 إلى 24', 'decrease', 'line', 'labor'),
  indicator('SM.POP.NETM', 'migration-diaspora', 'net-migration', 'صافي الهجرة', 'شخص', 'contextual', 'bar', 'population'),

  // التعليم والمعرفة
  indicator('SE.PRM.ENRR', 'schools', 'primary-school-enrollment-gross', 'نسبة الالتحاق الإجمالية بالتعليم الابتدائي', '%', 'increase', 'line', 'education'),
  indicator('SE.SEC.ENRR', 'schools', 'secondary-school-enrollment-gross', 'نسبة الالتحاق الإجمالية بالتعليم الثانوي', '%', 'increase', 'line', 'education'),
  indicator('SE.PRM.CMPT.ZS', 'schools', 'primary-completion-rate', 'معدل إكمال المرحلة الابتدائية', '% من الفئة العمرية', 'increase', 'line', 'education'),
  indicator('SE.ADT.LITR.ZS', 'literacy', 'adult-literacy-rate', 'معدل معرفة القراءة والكتابة لدى البالغين', '% من عمر 15 فأكثر', 'increase', 'bar', 'education'),
  indicator('SE.TER.ENRR', 'higher-education', 'tertiary-enrollment-gross', 'نسبة الالتحاق الإجمالية بالتعليم العالي', '%', 'increase', 'line', 'education'),
  indicator('SE.SEC.ENRL.VO.ZS', 'vocational-education', 'vocational-secondary-enrollment-share', 'حصة التعليم المهني من طلاب المرحلة الثانوية', '% من طلاب الثانوية', 'increase', 'bar', 'education'),
  indicator('IP.JRN.ARTC.SC', 'research', 'scientific-technical-journal-articles', 'المقالات العلمية والتقنية المنشورة', 'مقالة', 'increase', 'area', 'innovation'),
  indicator('IT.NET.SECR.P6', 'digital-skills', 'secure-internet-servers', 'خوادم الإنترنت الآمنة', 'لكل مليون شخص', 'increase', 'area', 'infrastructure'),

  // الصحة والتغذية
  indicator('SP.DYN.LE00.IN', 'public-health', 'life-expectancy-at-birth', 'متوسط العمر المتوقع عند الميلاد', 'سنة', 'increase', 'line', 'population'),
  indicator('SH.MED.BEDS.ZS', 'hospitals-services', 'hospital-beds-per-thousand', 'أسرة المستشفيات', 'لكل 1000 شخص', 'increase', 'line', 'health'),
  indicator('SH.MED.PHYS.ZS', 'hospitals-services', 'physicians-per-thousand', 'الأطباء', 'لكل 1000 شخص', 'increase', 'line', 'health'),
  indicator('SH.XPD.CHEX.GD.ZS', 'hospitals-services', 'current-health-expenditure-share-gdp', 'الإنفاق الصحي الجاري', '% من الناتج المحلي', 'increase', 'area', 'health'),
  indicator('SH.TBS.INCD', 'diseases-epidemics', 'tuberculosis-incidence', 'معدل الإصابة بالسل', 'لكل 100 ألف شخص', 'decrease', 'line', 'health'),
  indicator('SH.STA.MMRT', 'maternal-child-health', 'maternal-mortality-ratio', 'نسبة وفيات الأمهات', 'لكل 100 ألف ولادة حية', 'decrease', 'line', 'health'),
  indicator('SH.DYN.MORT', 'maternal-child-health', 'under-five-mortality-rate', 'معدل وفيات الأطفال دون الخامسة', 'لكل 1000 ولادة حية', 'decrease', 'line', 'health'),
  indicator('SH.STA.STNT.ZS', 'nutrition', 'child-stunting-prevalence', 'انتشار التقزم بين الأطفال', '% من الأطفال دون الخامسة', 'decrease', 'bar', 'health'),
  indicator('SH.IMM.IDPT', 'public-health', 'dpt-immunization-rate', 'التحصين ضد الدفتيريا والسعال الديكي والكزاز', '% من الأطفال بعمر 12 إلى 23 شهرا', 'increase', 'line', 'health'),

  // البنية التحتية والخدمات
  indicator('EG.ELC.ACCS.ZS', 'electricity', 'access-to-electricity', 'نسبة السكان الذين تصلهم الكهرباء', '% من السكان', 'increase', 'line', 'energy'),
  indicator('EG.ELC.LOSS.ZS', 'electricity', 'electric-power-losses', 'فاقد نقل وتوزيع الكهرباء', '% من إنتاج الكهرباء', 'decrease', 'line', 'energy'),
  indicator('SH.H2O.BASW.ZS', 'household-water', 'basic-drinking-water-services', 'الوصول إلى خدمات مياه الشرب الأساسية', '% من السكان', 'increase', 'line', 'infrastructure'),
  indicator('SH.STA.BASS.ZS', 'sanitation', 'basic-sanitation-services', 'الوصول إلى خدمات الصرف الصحي الأساسية', '% من السكان', 'increase', 'line', 'infrastructure'),
  indicator('IT.NET.USER.ZS', 'internet-telecom', 'internet-users-share', 'مستخدمو الإنترنت', '% من السكان', 'increase', 'area', 'infrastructure'),
  indicator('IT.CEL.SETS.P2', 'internet-telecom', 'mobile-cellular-subscriptions', 'اشتراكات الهاتف المحمول', 'لكل 100 شخص', 'increase', 'area', 'infrastructure'),
  indicator('IT.MLT.MAIN.P2', 'internet-telecom', 'fixed-telephone-subscriptions', 'اشتراكات الهاتف الثابت', 'لكل 100 شخص', 'contextual', 'line', 'infrastructure'),
  indicator('IS.AIR.PSGR', 'ports-airports', 'air-transport-passengers', 'المسافرون عبر النقل الجوي', 'مسافر', 'increase', 'area', 'infrastructure'),
  indicator('IS.AIR.GOOD.MT.K1', 'ports-airports', 'air-transport-freight', 'الشحن الجوي', 'مليون طن كيلومتر', 'increase', 'area', 'infrastructure'),
  indicator('IS.SHP.GOOD.TU', 'ports-airports', 'container-port-traffic', 'حركة الحاويات في الموانئ', 'حاوية مكافئة لعشرين قدما', 'increase', 'area', 'infrastructure'),
  indicator('SH.STA.TRAF.P5', 'roads-transport', 'road-traffic-mortality-rate', 'معدل الوفيات بسبب حوادث الطرق', 'لكل 100 ألف شخص', 'decrease', 'line', 'health'),
  indicator('EN.POP.SLUM.UR.ZS', 'housing', 'urban-population-living-in-slums', 'سكان الحضر المقيمون في أحياء عشوائية', '% من سكان الحضر', 'decrease', 'line', 'infrastructure'),

  // الإنتاج والموارد
  indicator('NV.AGR.TOTL.ZS', 'agriculture', 'agriculture-value-added-share', 'مساهمة الزراعة والغابات والصيد في الناتج المحلي', '% من الناتج المحلي', 'contextual', 'area', 'agriculture'),
  indicator('AG.PRD.CROP.XD', 'agriculture', 'crop-production-index', 'مؤشر إنتاج المحاصيل', 'مؤشر 2014-2016 = 100', 'increase', 'line', 'agriculture'),
  indicator('AG.YLD.CREL.KG', 'agriculture', 'cereal-yield', 'غلة الحبوب', 'كيلوغرام للهكتار', 'increase', 'line', 'agriculture'),
  indicator('AG.PRD.LVSK.XD', 'livestock', 'livestock-production-index', 'مؤشر الإنتاج الحيواني', 'مؤشر 2014-2016 = 100', 'increase', 'line', 'agriculture'),
  indicator('ER.FSH.PROD.MT', 'fisheries', 'total-fisheries-production', 'إجمالي إنتاج الثروة السمكية', 'طن متري', 'increase', 'area', 'agriculture'),
  indicator('NY.GDP.PETR.RT.ZS', 'oil-gas', 'oil-rents-share-gdp', 'ريع النفط من الناتج المحلي', '% من الناتج المحلي', 'contextual', 'area', 'economy'),
  indicator('NY.GDP.MINR.RT.ZS', 'mining', 'mineral-rents-share-gdp', 'ريع المعادن من الناتج المحلي', '% من الناتج المحلي', 'contextual', 'area', 'economy'),
  indicator('EG.FEC.RNEW.ZS', 'renewable-energy', 'renewable-energy-consumption-share', 'استهلاك الطاقة المتجددة', '% من إجمالي الاستهلاك النهائي للطاقة', 'increase', 'line', 'energy'),

  // البيئة والمناخ
  indicator('AG.LND.FRST.ZS', 'biodiversity', 'forest-area-share', 'مساحة الغابات من مساحة اليابسة', '% من مساحة اليابسة', 'increase', 'line', 'environmentFao'),
  indicator('ER.LND.PTLD.ZS', 'biodiversity', 'terrestrial-protected-areas', 'المناطق البرية المحمية', '% من مساحة الأرض', 'increase', 'line', 'environment'),
  indicator('ER.MRN.PTMR.ZS', 'biodiversity', 'marine-protected-areas', 'المناطق البحرية المحمية', '% من المياه الإقليمية', 'increase', 'line', 'environment'),
  indicator('ER.H2O.FWAG.ZS', 'water-resources', 'agricultural-water-withdrawals-share', 'حصة الزراعة من سحب المياه العذبة', '% من سحب المياه العذبة', 'contextual', 'line', 'environmentFao'),
  indicator('ER.H2O.INTR.PC', 'water-resources', 'renewable-internal-freshwater-per-capita', 'موارد المياه العذبة الداخلية المتجددة للفرد', 'متر مكعب للفرد', 'increase', 'line', 'environmentFao'),
  indicator('EN.ATM.PM25.MC.M3', 'climate', 'pm25-air-pollution', 'متوسط التعرض لتلوث الهواء بالجسيمات الدقيقة', 'ميكروغرام لكل متر مكعب', 'decrease', 'line', 'environment'),
  indicator('AG.LND.PRCP.MM', 'climate', 'average-annual-precipitation', 'متوسط الهطول السنوي', 'ملليمتر سنويا', 'contextual', 'line', 'environmentFao'),
  indicator('AG.LND.ARBL.ZS', 'desertification', 'arable-land-share', 'الأراضي الصالحة للزراعة', '% من مساحة الأرض', 'increase', 'line', 'environmentFao'),
  indicator('VC.IDP.NWDS', 'natural-disasters', 'new-disaster-displacements', 'حالات النزوح الجديدة بسبب الكوارث', 'حالة نزوح', 'decrease', 'bar', 'displacement'),

  // الحرب والأمن والمساعدات
  indicator('VC.IDP.NWCV', 'displacement-refugees', 'new-conflict-displacements', 'حالات النزوح الجديدة بسبب الصراع والعنف', 'حالة نزوح', 'decrease', 'bar', 'displacement'),
  indicator('VC.BTL.DETH', 'war-impact', 'battle-related-deaths', 'الوفيات المرتبطة بالمعارك', 'شخص', 'decrease', 'bar', 'conflict'),
  indicator('VC.IHR.PSRC.P5', 'war-impact', 'intentional-homicide-rate', 'معدل جرائم القتل العمد', 'لكل 100 ألف شخص', 'decrease', 'line', 'conflict'),
  indicator('MS.MIL.XPND.GD.ZS', 'war-impact', 'military-expenditure-share-gdp', 'الإنفاق العسكري من الناتج المحلي', '% من الناتج المحلي', 'contextual', 'area', 'conflict'),
  indicator('MS.MIL.XPND.CD', 'war-impact', 'military-expenditure-current-usd', 'الإنفاق العسكري بالقيمة الجارية', 'دولار أمريكي', 'contextual', 'area', 'conflict'),
  indicator('DT.ODA.ODAT.CD', 'international-aid', 'net-official-development-assistance', 'صافي المساعدات الإنمائية الرسمية المستلمة', 'دولار أمريكي', 'increase', 'area', 'aid'),

  // الدولة والحوكمة
  indicator('GOV_WGI_CC_SC', 'corruption-transparency', 'control-of-corruption-score', 'درجة السيطرة على الفساد', 'درجة معيارية', 'increase', 'line', 'governance'),
  indicator('GOV_WGI_GE_SC', 'governance', 'government-effectiveness-score', 'درجة فاعلية الحكومة', 'درجة معيارية', 'increase', 'line', 'governance'),
  indicator('GOV_WGI_RL_SC', 'governance', 'rule-of-law-score', 'درجة سيادة القانون', 'درجة معيارية', 'increase', 'line', 'governance'),
  indicator('GOV_WGI_VA_SC', 'governance', 'voice-accountability-score', 'درجة المشاركة والمساءلة', 'درجة معيارية', 'increase', 'line', 'governance'),
  indicator('GOV_WGI_PV_SC', 'governance', 'political-stability-score', 'درجة الاستقرار السياسي وغياب العنف', 'درجة معيارية', 'increase', 'line', 'governance'),

  // الثقافة والسياحة والابتكار والأعمال
  indicator('ST.INT.ARVL', 'tourism-heritage', 'international-tourism-arrivals', 'عدد السياح الدوليين الوافدين', 'زائر', 'increase', 'bar', 'tourism'),
  indicator('ST.INT.RCPT.CD', 'tourism-heritage', 'international-tourism-receipts', 'إيرادات السياحة الدولية', 'دولار أمريكي', 'increase', 'area', 'tourism'),
  indicator('IP.PAT.RESD', 'entrepreneurship-tech', 'resident-patent-applications', 'طلبات براءات الاختراع للمقيمين', 'طلب', 'increase', 'bar', 'innovation'),
  indicator('TX.VAL.TECH.CD', 'entrepreneurship-tech', 'high-technology-exports', 'صادرات المنتجات عالية التقنية', 'دولار أمريكي', 'increase', 'area', 'innovation'),
  indicator('IC.FRM.FEMO.ZS', 'women', 'firms-with-female-ownership', 'المنشآت التي تشارك النساء في ملكيتها', '% من المنشآت', 'increase', 'bar', 'enterprise'),
];

async function must(query, label) {
  const {data, error} = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function fetchWorldBankSeries(code, attempt = 1) {
  const endpoint = `https://api.worldbank.org/v2/country/YEM/indicator/${code}?format=json&per_page=100`;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return (payload[1] || [])
      .filter(row => row.value !== null && Number(row.date) >= 1990)
      .map(row => ({year: Number(row.date), value: Number(row.value)}))
      .sort((a, b) => a.year - b.year);
  } catch (error) {
    if (attempt >= 3) throw new Error(`World Bank ${code}: ${error.message}`);
    await new Promise(resolve => setTimeout(resolve, 750 * attempt));
    return fetchWorldBankSeries(code, attempt + 1);
  }
}

const domains = await must(db.from('stat_domains').select('id,slug'), 'domains');
const domainIds = new Map(domains.map(domain => [domain.slug, domain.id]));

const sourceRows = await must(db.from('stat_sources').upsert(
  Object.values(sourceGroups).map(source => ({...source, is_active: true})),
  {onConflict: 'name'},
).select('id,name'), 'sources');
const sourceIdsByName = new Map(sourceRows.map(source => [source.name, source.id]));

let indicatorCount = 0;
let valueCount = 0;
const skipped = [];

for (const dataset of datasets) {
  try {
    const domainId = domainIds.get(dataset.domain);
    if (!domainId) throw new Error(`Unknown domain: ${dataset.domain}`);

    const sourceGroup = sourceGroups[dataset.source];
    const sourceId = sourceIdsByName.get(sourceGroup.name);
    if (!sourceId) throw new Error(`Missing source: ${sourceGroup.name}`);

    const series = await fetchWorldBankSeries(dataset.code);
    if (!series.length) throw new Error('No values returned from 1990 onward');

    const sourceUrl = `https://data.worldbank.org/indicator/${dataset.code}?locations=YE`;
    const savedIndicator = await must(db.from('stat_indicators').upsert({
      domain_id: domainId,
      slug: dataset.slug,
      name: dataset.name,
      short_description: dataset.description,
      definition: dataset.definition,
      unit: dataset.unit,
      improvement_direction: dataset.direction,
      measurement_method: dataset.method,
      data_status: series.length < 5 ? 'limited' : 'partial',
      chart_type: dataset.chart,
      adopted_source_id: sourceId,
      is_published: true,
      hide_when_incomplete: false,
    }, {onConflict: 'slug'}).select().single(), `indicator ${dataset.code}`);

    await must(db.from('stat_indicator_sources').upsert({
      indicator_id: savedIndicator.id,
      source_id: sourceId,
      series_label: dataset.code,
      methodology: dataset.method,
      is_adopted: true,
    }, {onConflict: 'indicator_id,source_id'}), `indicator source ${dataset.code}`);

    const values = series.map(row => ({
      indicator_id: savedIndicator.id,
      source_id: sourceId,
      year: row.year,
      value: row.value,
      document_url: sourceUrl,
      publication_date: null,
      national_scope: true,
      methodology_note: `قيمة منشورة في World Bank API للمؤشر ${dataset.code}. مصنفة هنا كتقديرية وقابلة للمراجعة.`,
      value_status: 'estimated',
      is_published: true,
    }));

    await must(db.from('stat_values').upsert(values, {
      onConflict: 'indicator_id,year,source_id',
    }), `values ${dataset.code}`);

    indicatorCount += 1;
    valueCount += values.length;
    console.log(`${dataset.code}: ${values.length} values (${values.at(-1).year} latest)`);
  } catch (error) {
    skipped.push({code: dataset.code, reason: error.message});
    console.error(`Skipped ${dataset.code}: ${error.message}`);
  }
}

console.log(`Completed: ${indicatorCount}/${datasets.length} indicators and ${valueCount} annual values.`);
if (skipped.length) {
  console.log('Skipped series:');
  for (const item of skipped) console.log(`- ${item.code}: ${item.reason}`);
  process.exitCode = 1;
}

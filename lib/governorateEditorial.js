// Curated World Heritage references only. These substantiate specific UNESCO
// listings, not every geographic, demographic or economic sentence in 967.
export const governorateHeritageSources=Object.freeze({
  YE13:[{title:'اليونسكو — مدينة صنعاء القديمة (1986)',url:'https://whc.unesco.org/en/list/385/'}],
  YE18:[{title:'اليونسكو — مدينة زبيد التاريخية (1993)',url:'https://whc.unesco.org/en/list/611/'}],
  YE19:[{title:'اليونسكو — مدينة شبام المسوّرة (1982)',url:'https://whc.unesco.org/en/list/192/'}],
  YE26:[{title:'اليونسكو — معالم مملكة سبأ القديمة، مأرب (2023)',url:'https://whc.unesco.org/en/list/1700/'}],
  YE32:[{title:'اليونسكو — أرخبيل سقطرى (2008)',url:'https://whc.unesco.org/en/list/1263/'}],
});
export const governorateProfileSections=[
  {key:'description',title:'المحافظة في لمحة'},
  {key:'history',title:'التاريخ والعمران'},
  {key:'geography',title:'الجغرافيا والطبيعة'},
  {key:'economy',title:'الاقتصاد وسبل العيش'},
  {key:'landmarks',title:'المعالم والأماكن'},
];
export const isGovernorateId=id=>typeof id==='string'&&/^YE(?:11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32)$/.test(id);

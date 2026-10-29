// Canonical teaching patterns, not automatic scansions of arbitrary verses.
// Some rarely-used meters normally appear only in shortened/modified forms.
// Source: https://www.qawafi.org/meters
export const ARUD_METERS=[
 {name:'الطويل',feet:['فعولن','مفاعيلن','فعولن','مفاعيلن'],group:0},
 {name:'المتقارب',feet:['فعولن','فعولن','فعولن','فعولن'],group:0},
 {name:'الوافر',feet:['مفاعلتن','مفاعلتن','فعولن'],group:0},
 {name:'البسيط',feet:['مستفعلن','فاعلن','مستفعلن','فاعلن'],group:0},
 {name:'الكامل',feet:['متفاعلن','متفاعلن','متفاعلن'],group:1},
 {name:'الرجز',feet:['مستفعلن','مستفعلن','مستفعلن'],group:1},
 {name:'الرمل',feet:['فاعلاتن','فاعلاتن','فاعلاتن'],group:1},
 {name:'الخفيف',feet:['فاعلاتن','مستفع لن','فاعلاتن'],group:1},
 {name:'المديد',feet:['فاعلاتن','فاعلن','فاعلاتن'],group:2},
 {name:'الهزج',feet:['مفاعيلن','مفاعيلن'],group:2},
 {name:'السريع',feet:['مستفعلن','مستفعلن','مفعولات'],group:2},
 {name:'المنسرح',feet:['مستفعلن','مفعولات','مستفعلن'],group:2},
 {name:'المضارع',feet:['مفاعيلن','فاع لاتن'],group:3},
 {name:'المقتضب',feet:['مفعولات','مستفعلن'],group:3},
 {name:'المجتث',feet:['مستفع لن','فاعلاتن'],group:3},
 {name:'المتدارك',feet:['فاعلن','فاعلن','فاعلن','فاعلن'],group:3}
].map(m=>({...m,pattern:m.feet.join(' | ')}));
export const ARUD_METER_GROUPS=[1,2,3].map(group=>ARUD_METERS.filter(m=>m.group===group));

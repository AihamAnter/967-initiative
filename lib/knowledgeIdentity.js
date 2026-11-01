// One source of navigation and page identity for the five public knowledge areas.
// Colors stay in app/knowledge-identity.css; labels/routes stay here.
export const KNOWLEDGE_AREAS=Object.freeze([
 {id:'history',href:'/yemen-history',title:'تاريخ اليمن',hint:'عبر العصور'},
 {id:'figures',href:'/yemeni-figures',title:'شخصيات يمنية',hint:'سير وأعلام'},
 {id:'atlas',href:'/yemen-map',title:'خريطة اليمن',hint:'أرض وأماكن'},
 {id:'statistics',href:'/yemen-in-numbers',title:'اليمن بالأرقام',hint:'مؤشرات وطنية'},
 {id:'ranking',href:'/yemen-ranking',title:'ترتيب اليمن',hint:'مقارنات دولية'},
]);
const known=new Set(KNOWLEDGE_AREAS.map(item=>item.id));
export function knowledgeAreaId(value){return known.has(value)?value:null;}
export function knowledgeAreaFromPath(pathname){
 if(typeof pathname!=='string')return null;
 const path=pathname.split(/[?#]/,1)[0].replace(/\/$/,'')||'/';
 return KNOWLEDGE_AREAS.find(area=>path===area.href||path.startsWith(area.href+'/'))?.id||null;
}

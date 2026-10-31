const sourcePaths=new Set(['/search','/yemen-map','/yemeni-figures','/works','/magazine','/debates','/yemeni-products','/professionals','/universities','/medical-centers','/yemen-in-numbers','/yemen-history','/read-later','/account','/account/activity']);
const keys=new Set(['q','type','topic','platform','page','category','location','mode','sort','region','district','field','era','social','photo','century','birthFrom','birthTo','figureSort','figureQ','visible','status','stage','domain','section','indicator','compare','scope','exclude','governorate','city','ownership','focus','level','specialty','service','emergency']);
export function safeNavigationSource(value){
 if(typeof value!=='string'||value.length>3000||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u001f]/.test(value))return null;
 try{const u=new URL(value,'https://967.invalid');if(u.origin!=='https://967.invalid'||!sourcePaths.has(u.pathname)&&!/^\/yemen-in-numbers\/[a-z0-9-]+$/.test(u.pathname)&&!/^\/debates\/[a-z0-9-]+$/.test(u.pathname)&&!/^\/yemen-history\/[a-z0-9-]+$/.test(u.pathname))return null;const p=new URLSearchParams();for(const [k,v]of u.searchParams)if(keys.has(k)&&v.length<=200)p.set(k,v);const hash=/^#[a-zA-Z0-9_-]{1,60}$/.test(u.hash)?u.hash:'';return u.pathname+(p.size?'?'+p:'')+hash;}catch{return null;}
}
export function isDetailPath(path){return /^\/(works|magazine|debates|professionals|yemeni-products|universities|medical-centers)\/[^/]+$/.test(path)&&!['/debates/suggest'].includes(path)||/^\/debates\/speakers\/[^/]+$/.test(path)||/^\/yemen-map\/figures\/[^/]+$/.test(path)||/^\/yemeni-figures\/[^/]+$/.test(path)||/^\/yemen-history\/[a-z0-9-]+$/.test(path)||/^\/yemen-map\/governorates\/[A-Za-z0-9-]+$/.test(path)||/^\/yemen-in-numbers\/(indicator\/)?[^/]+$/.test(path)&&path!=='/yemen-in-numbers/timeline';}
export function contextualHref(href,source){
 if(typeof href!=='string'||!href.startsWith('/')||href.startsWith('//'))return href;
 try{const u=new URL(href,'https://967.invalid');const safe=safeNavigationSource(source);if(safe&&isDetailPath(u.pathname)&&!u.searchParams.has('from'))u.searchParams.set('from',safe);return u.pathname+u.search+u.hash;}catch{return href;}
}
export const navigationMemoryKey='967-navigation-scroll-v1';
export function navigationMemoryPath(value){const safe=safeNavigationSource(value);if(!safe)return null;const u=new URL(safe,'https://967.invalid');u.searchParams.sort();return u.pathname+u.search;}

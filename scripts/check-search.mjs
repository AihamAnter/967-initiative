import assert from 'node:assert/strict';
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3000';
const cases=[
  {q:'أروى',type:'figures',href:'/yemeni-figures/arwa-al-sulayhi',label:true},
  {q:'اَرْوَى',type:'figures',href:'/yemeni-figures/arwa-al-sulayhi'},
  {q:'البردوني',type:'figures',href:'/yemeni-figures/'},
  {q:'عبس',type:'places',href:'district=YE1704'},
  {q:'حضرموت',type:'places',href:'region=YE19'},
  {q:'من نحن',type:'pages',href:'/#about'},
  {q:'مجلة',type:'pages',href:'/magazine'},
];
for(const item of cases){
  const url=base+'/search?'+new URLSearchParams({q:item.q,type:item.type});
  const response=await fetch(url);
  const html=await response.text();
  assert.equal(response.status,200,url);
  // Check rendered results, not filter/navigation links or serialized component data.
  const results=html.match(/<a\b[^>]*class="search-result"[^>]*>[\s\S]*?<\/a>/g)||[];
  assert.ok(results.some(result=>result.includes(item.href)),url);
  if(item.label)assert.ok(results.some(result=>result.includes('ملف توضيحي')));
  console.log(JSON.stringify({q:item.q,type:item.type,results:results.length,pass:true}));
}
// Check real published titles against every database-backed content category.
const sitemap=await (await fetch(base+'/sitemap.xml')).text();
const paths=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>new URL(x[1]).pathname);
for(const [prefix,type] of [['/works/','works'],['/magazine/','issues'],['/professionals/','professionals'],['/yemeni-products/','companies'],['/yemen-in-numbers/indicator/','indicators'],['/yemen-in-numbers/','domains']]){
  const path=paths.find(x=>x.startsWith(prefix)&&(type!=='domains'||!x.includes('/indicator/')&&!x.endsWith('/timeline')));
  if(!path){console.log(JSON.stringify({type,skipped:'No published record'}));continue;}
  const detail=await (await fetch(base+path)).text();
  const title=detail.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]*>/g,'').trim();
  assert.ok(title,path);
  const html=await (await fetch(base+'/search?'+new URLSearchParams({q:title,type}))).text();
  const results=html.match(/<a\b[^>]*class="search-result"[^>]*>[\s\S]*?<\/a>/g)||[];
  assert.ok(results.some(x=>x.includes(path)),type+': '+title);
  console.log(JSON.stringify({type,q:title,pass:true}));
}
// The home form must submit to the very same global search endpoint.
const home=await (await fetch(base)).text();
assert.match(home,/<form[^>]*action="\/search"/);
console.log(JSON.stringify({homeSearch:true,pass:true}));

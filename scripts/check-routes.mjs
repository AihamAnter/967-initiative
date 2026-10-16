// Read-only HTTP smoke check. Never submits a contact message or changes CMS records.
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:3000';
const routes = ['/', '/works', '/magazine', '/yemen-in-numbers', '/yemen-in-numbers/timeline', '/yemen-map', '/yemeni-products', '/professionals', '/search', '/search?q='+encodeURIComponent('اليمن'), '/search?q='+encodeURIComponent('كلمةغيرموجودةتماما')+'&type=works', '/contribute', '/admin', '/magazine/demo', '/robots.txt', '/yemen-map/figures/arwa-al-sulayhi'];
let failures = 0;
const check = async (route, expected = 200) => {
  try {
    const response = await fetch(base + route, {signal:AbortSignal.timeout(90000)});
    const html = await response.text();
    const valid = response.status === expected && !html.includes('NEXT_HTTP_ERROR_FALLBACK;500') && !html.includes('"digest":"NEXT_REDIRECT');
    if (!valid) failures++;
    console.log(JSON.stringify({route,status:response.status,pass:valid}));
    return html;
  } catch (error) {failures++;console.log(JSON.stringify({route,pass:false,error:error.message}));return '';}
};
for (let index=0;index<routes.length;index+=3) await Promise.all(routes.slice(index,index+3).map(route=>check(route)));
const sitemap = await check('/sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>new URL(match[1]).pathname);
for (const prefix of ['/works/', '/magazine/', '/professionals/', '/yemeni-products/', '/yemen-map/figures/', '/yemen-in-numbers/indicator/', '/yemen-in-numbers/']) {
  const route = urls.find(url=>url.startsWith(prefix) && (prefix!=='/yemen-in-numbers/' || !url.includes('/indicator/') && !url.endsWith('/timeline')));
  if (route) await check(route);
}
await check('/this-page-does-not-exist',404);
for (const [label,options,expected] of [
  ['invalid form',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'x',email:'invalid',type:'invalid',message:'x'})},400],
  ['foreign origin',{method:'POST',headers:{'Origin':'https://foreign.invalid','Content-Type':'application/json'},body:'{}'},403],
]) {
  const response=await fetch(base+'/api/contact',options);
  const pass=response.status===expected;if(!pass)failures++;
  console.log(JSON.stringify({api:label,status:response.status,pass}));
}
console.log(JSON.stringify({failures}));
process.exitCode=failures?1:0;

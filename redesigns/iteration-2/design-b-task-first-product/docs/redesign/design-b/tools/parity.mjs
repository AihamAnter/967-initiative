import {chromium} from 'playwright';
const b=await chromium.launch();
async function grab(url){const c=await b.newContext({viewport:{width:1440,height:900}});await c.route(/\/api\/(analytics|telemetry|account|school|games)/,r=>r.abort());const p=await c.newPage();await p.goto(url,{waitUntil:'load'});await p.waitForTimeout(3000);
const r=await p.evaluate(()=>{const m=document.querySelector('main');return {heads:[...m.querySelectorAll('h1,h2,h3')].map(h=>h.textContent.replace(/\s+/g,' ').trim()),links:[...new Set([...m.querySelectorAll('a[href]')].map(a=>a.getAttribute('href').split('#')[0]))],nums:(m.innerText.match(/\d[\d,.]{1,}/g)||[]).slice(0,80),saves:m.querySelectorAll('.reading-save-button').length,imgs:[...m.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth>0).length,details:[...m.querySelectorAll('details')].map(d=>d.id)}});await c.close();return r;}
const o=await grab('http://localhost:3000/'),n=await grab('http://localhost:3102/');
const norm=x=>x.replace(/\s+/g,'');
console.log('ORIGINAL headings',o.heads.length,'NEW',n.heads.length);
for(const h of o.heads){const ok=n.heads.some(x=>norm(x)===norm(h)||norm(x).includes(norm(h)));console.log(ok?'OK  ':'MISS',h.slice(0,70));}
console.log('links in original missing in new:',o.links.filter(l=>!n.links.includes(l)));
console.log('links count orig/new',o.links.length,n.links.length);
const on=new Set(o.nums);console.log('numbers missing:',[...on].filter(x=>!n.nums.includes(x)));
console.log('save buttons orig/new',o.saves,n.saves,'images orig/new',o.imgs,n.imgs,'details',o.details,n.details);
await b.close();

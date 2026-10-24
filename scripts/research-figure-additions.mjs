import {readFile,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
const root='.audit-tools/figures-expansion';
const additions=JSON.parse(await readFile('data/yemeni-figures/expansion-2026-10.json','utf8'));
async function json(url){for(let i=0;i<6;i++){await delay(2500);const r=await fetch(url,{signal:AbortSignal.timeout(40000)});if(r.status===429||r.status===503){console.log('Rate limited; backing off.');await delay(10000);continue;}if(!r.ok)throw Error('HTTP '+r.status);return r.json();}throw Error('Research paused by rate limit');}
for(const [slug,title] of additions){
 let previous;try{previous=JSON.parse(await readFile(root+'/'+slug+'.json','utf8'));if(previous.page?.extract&&previous.page?.title===title)continue;}catch{}
 const r=await json('https://ar.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',prop:'extracts|pageprops|revisions',titles:title,explaintext:'1',rvprop:'ids',redirects:'1',format:'json',formatversion:'2'}));
 const page=r.query?.pages?.[0];if(!page?.extract||page.missing||page.pageprops.disambiguation!==undefined)throw Error('Unresolved person '+slug);
 const qid=page.pageprops.wikibase_item;
 const entity=previous?.entity?.id===qid?previous.entity:(await json('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:qid,props:'claims|labels|descriptions',languages:'ar|en',format:'json'}))).entities[qid];
 await writeFile(root+'/'+slug+'.json',JSON.stringify({slug,page,entity},null,2)+'\n');console.log(slug+' '+page.title+' '+page.extract.length);
}

// Downloads public source data to this checkout only. Never connects to Supabase.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {defaultRankingIndicators} from '../lib/rankingCatalog.js';
import {fetchWorldBankDataset} from '../lib/rankingProvider.js';

const directory = new URL('../data/rankings/',import.meta.url);
await mkdir(directory,{recursive:true});
const selected = process.argv.find(value=>value.startsWith('--slugs='))?.slice(8).split(',');
const indicators = defaultRankingIndicators.filter(item=>!selected || selected.includes(item.slug));
const force = process.argv.includes('--force');
const metadataOnly = process.argv.includes('--metadata-only');
let cursor=0; const failures=[];
await Promise.all(Array.from({length:2},async()=>{
  while(cursor<indicators.length){
    const indicator=indicators[cursor++];
    const file=new URL(`${indicator.slug}.json`,directory);
    try{
      if(metadataOnly){
        const dataset=JSON.parse(await readFile(file,'utf8'));
        const response=await fetch(`https://api.worldbank.org/v2/indicator/${indicator.code}?source=2&format=json`,{signal:AbortSignal.timeout(20000),redirect:'error'});
        if(!response.ok)throw new Error(`Metadata HTTP ${response.status}`);
        const payload=await response.json();
        const metadata=payload[1]?.find(item=>item.id===indicator.code&&String(item.source?.id)==='2');
        if(!metadata)throw new Error('Missing indicator metadata');
        dataset.source.sourceOrganization=metadata.sourceOrganization||'';
        dataset.source.sourceNote=metadata.sourceNote||'';
        await writeFile(file,JSON.stringify(dataset)+'\n','utf8');
        console.log(`metadata ${indicator.slug}`);continue;
      }
      if(!force){try{const existing=JSON.parse(await readFile(file,'utf8'));if(existing.indicatorCode===indicator.code){console.log(`cached ${indicator.slug}`);continue;}}catch{}}
      let dataset;
      for(let attempt=0;attempt<3;attempt++){
        try{dataset=await fetchWorldBankDataset(indicator.code);break;}catch(error){if(attempt===2)throw error;}
      }
      await writeFile(file,JSON.stringify(dataset)+'\n','utf8');
      const years=dataset.values.filter(row=>row.country==='YEM').map(row=>row.year);
      console.log(`${indicator.slug}: ${dataset.values.length} observations; Yemen latest ${years.length?Math.max(...years):'unavailable'}`);
    }catch(error){failures.push(indicator.slug);console.error(`${indicator.slug}: ${error.message}`);}
  }
}));
const coverage=[];
for(const indicator of defaultRankingIndicators){
  try{const dataset=JSON.parse(await readFile(new URL(`${indicator.slug}.json`,directory),'utf8'));
    const years=dataset.values.filter(row=>row.country==='YEM').map(row=>row.year);
    coverage.push({slug:indicator.slug,code:dataset.indicatorCode,observations:dataset.values.length,yemenLatestYear:years.length?Math.max(...years):null,fetchedAt:dataset.fetchedAt,source:dataset.source});
  }catch{}
}
await writeFile(new URL('manifest.json',directory),JSON.stringify({generatedAt:new Date().toISOString(),indicators:coverage},null,2)+'\n','utf8');
if(failures.length)process.exitCode=1;

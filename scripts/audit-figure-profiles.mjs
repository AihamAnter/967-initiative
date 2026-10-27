import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {auditFigurePackages} from '../lib/figureSourceAudit.js';

const files=[
 'data/yemeni-figures/profiles.json',
 'data/yemeni-figures/additions-2026-10-25.json',
];
const packages=(await Promise.all(files.map(async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'))))).flat();
const audit=auditFigurePackages(packages);
console.log(JSON.stringify({counters:audit.counters,issues:audit.issues,firstPriority:audit.priority.slice(0,30)},null,2));
if(process.argv.includes('--write')){
 await mkdir(new URL('../docs/enrichment/yemen-figures/',import.meta.url),{recursive:true});
 const dest=new URL('../docs/enrichment/yemen-figures/source-audit-2026-10-27.json',import.meta.url);
 await writeFile(dest,JSON.stringify(audit,null,2)+'\n');
}
if(audit.counters.profiles<282||audit.issues.length||audit.counters.uncitedContent||audit.counters.brokenReferenceIds||audit.counters.invalidSourceUrls||audit.counters.imagesWithoutProvenance){
 process.exitCode=1;
}

// Local exact-value check. Never prints the server credential or its prefix.
import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const credential=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!credential||credential.length<20)throw Error('Server credential unavailable for local leak check');
const root=process.env.NEXT_VALIDATION_BUILD==='1'?'.next-validation/static':'.next/static';
let scanned=0;const matches=[];
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){
 const file=path.join(dir,item.name);if(item.isDirectory())await walk(file);else if(/\.(js|json|map|css)$/.test(item.name)){scanned++;if((await readFile(file,'utf8')).includes(credential))matches.push(file);}
}}
await walk(root);
const report={checkedAt:new Date().toISOString(),root,filesScanned:scanned,matchingFiles:matches,pass:matches.length===0,note:'Exact configured service-role credential checked locally; no credential values emitted. Not a universal secret scanner.'};
await writeFile('docs/audit/evidence/client-secret-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=report.pass?0:1;

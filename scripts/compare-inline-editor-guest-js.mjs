// Compare the final production eager JS with the preserved main build snapshot.
// Gzip numbers are reproducible per-file compression estimates, not wire bytes.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const directory=process.env.INLINE_BUILD_DIR||'.next-validation',out='docs/inline-editor/evidence';
const baseline=JSON.parse(await readFile(path.join(out,'guest-js-baseline.json'),'utf8'));
const manifest=JSON.parse(await readFile(path.join(directory,'app-build-manifest.json'),'utf8'));
const report={baselineCommit:baseline.sourceCommit,baselineBuild:baseline.buildId,finalBuild:(await readFile(path.join(directory,'BUILD_ID'),'utf8')).trim(),measurement:'Unique eager route JS, raw bytes and sum of per-file gzip. Dynamic chunks loaded only for authorized users are excluded.',routes:{}};
for(const [route,original]of Object.entries(baseline.routes)){
 const names=[...new Set([...(manifest.pages['/layout']||[]),...(manifest.pages[route]||[])])].filter(file=>file.endsWith('.js'));
 const files=await Promise.all(names.map(async file=>{const buffer=await readFile(path.join(directory,file));return {file,raw:buffer.length,gzip:gzipSync(buffer).length,containsEditorRuntime:buffer.includes(Buffer.from('inline-queue-list'))||buffer.includes(Buffer.from('inline-content-editor'))};}));
 const raw=files.reduce((n,file)=>n+file.raw,0),gzip=files.reduce((n,file)=>n+file.gzip,0);
 report.routes[route]={baseline:{raw:original.raw,gzip:original.gzip},final:{raw,gzip},delta:{raw:raw-original.raw,gzip:gzip-original.gzip,gzipPercent:Math.round((gzip/original.gzip-1)*10000)/100},eagerEditorRuntimeFiles:files.filter(file=>file.containsEditorRuntime).map(file=>file.file),files};
}
await mkdir(out,{recursive:true});await writeFile(path.join(out,'guest-js-comparison.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,routes:Object.fromEntries(Object.entries(report.routes).map(([route,{files,...sizes}])=>[route,sizes]))},null,2));

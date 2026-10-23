// Correct a measurement-only cross-origin fixture mismatch. No product changes.
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const fixture='http://127.0.0.1:3417',headers={Authorization:'Bearer local-fixture-service','Content-Type':'application/json'};
const state=await fetch(fixture+'/fixture/state').then(r=>r.json());if(state.production!==false)throw Error('Isolated fixture required');
const url=fixture+'/rest/v1/issues?slug=eq.inline-issue';const [original]=await fetch(url,{headers}).then(r=>r.json());
async function measure(base,label){
 const patch=await fetch(url,{method:'PATCH',headers,body:JSON.stringify({pdf_url:base+'/demo/967-demo.pdf'})});if(!patch.ok)throw Error('Fixture patch failed');
 const child=spawn(process.execPath,['scripts/measure-prelaunch.mjs'],{stdio:'inherit',windowsHide:true,env:{...process.env,CHECK_BASE_URL:base,AUDIT_LABEL:label,AUDIT_ROUTES:'/magazine/inline-issue'}});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});if(code!==0)throw Error('PDF measurement failed');
 const folder='docs/audit/prelaunch-fixes-2026-10/evidence/',all=JSON.parse(await readFile(folder+label.replace('-pdf','')+'-lighthouse.json','utf8')),single=JSON.parse(await readFile(folder+label+'-lighthouse.json','utf8'));
 all.results=all.results.map(item=>item.route==='/magazine/inline-issue'?single.results[0]:item);all.pdfFixtureNote='PDF samples use each app origin for the identical local PDF, avoiding a cross-origin Next demo asset without CORS; the fixture row was restored after the pair.';await writeFile(folder+label.replace('-pdf','')+'-lighthouse.json',JSON.stringify(all,null,2));
}
try{await measure('http://127.0.0.1:3121','before-pdf');await measure('http://127.0.0.1:3122','after-pdf');}finally{await fetch(url,{method:'PATCH',headers,body:JSON.stringify({pdf_url:original.pdf_url})});}

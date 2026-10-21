// Real Next/API/PostgreSQL + simulated Supabase Realtime wire protocol.
// Does not contact Supabase or publish votes outside the local fixture.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=createRequire(path.resolve('.audit-tools/package.json'))('playwright');
const base='http://127.0.0.1:3117',fixture='http://127.0.0.1:3417',state=await fetch(fixture+'/fixture/state').then(r=>r.json());assert.equal(state.production,false);
const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const results=[],runtime=[],external=[],peers=[];let sequence=0;
const session=async user=>fetch(fixture+'/fixture/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:user.id})}).then(r=>r.json());
const [userA,userB]=state.users.filter(u=>!u.role&&!u.unconfirmed&&u.id[0]!=='e'),manager=await session(state.users.find(u=>u.role==='management')),other=await session(userB);
const detail=await fetch(base+'/api/debates?slug=local-prerecorded').then(r=>r.json()),before=detail.polls.find(p=>p.phase==='before');
async function call(token,body,admin=false){const response=await fetch(base+'/api/'+(admin?'admin/debates':'debates'),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();assert.ok(response.ok,JSON.stringify(data));return data;}
async function pageFor(user,offline=false,slowInitial=false){
 const context=await browser.newContext({viewport:{width:390,height:1000}});if(user)await context.addInitScript(s=>localStorage.setItem('sb-127-auth-token',JSON.stringify(s)),await session(user));
 await context.routeWebSocket(/\/realtime\/v1\/websocket/,ws=>{
  const peer={ws,join:null,closed:false};peers.push(peer);ws.onClose(()=>{peer.closed=true;});
  ws.onMessage(raw=>{const [join,ref,topic,event,payload]=JSON.parse(String(raw));
   if(event==='phx_join'){
    if(offline){ws.close();return;}
    const filters=payload.config.postgres_changes;assert.ok(filters.every(f=>f.table==='debate_result_updates'));peer.join={join,topic};
    ws.send(JSON.stringify([join,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:filters.map(f=>({...f,id:1}))}}]));
   }else if(event==='heartbeat'||event==='phx_leave'){ws.send(JSON.stringify([join,ref,topic,'phx_reply',{status:'ok',response:{}}]));if(event==='phx_leave')peer.join=null;}
  });
 });
 const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>runtime.push(e.message));page.on('request',r=>{if(!['127.0.0.1','localhost'].includes(new URL(r.url()).hostname))external.push(r.url());});
 if(slowInitial){let first=true;await page.route(/\/api\/debates\?results=1&/,async route=>{if(first){first=false;await new Promise(resolve=>setTimeout(resolve,4000));}await route.continue();});}
 await page.goto(base+'/debates/local-prerecorded');await page.locator('#results>summary').click();await page.locator('[data-results-phase=before]').waitFor();if(user)await page.locator('#polls>summary').click();return page;
}
function emit(){sequence++;for(const peer of peers)if(peer.join&&!peer.closed)peer.ws.send(JSON.stringify([peer.join.join,null,peer.join.topic,'postgres_changes',{ids:[1],data:{schema:'public',table:'debate_result_updates',type:'UPDATE',commit_timestamp:new Date().toISOString(),columns:[{name:'debate_id',type:'uuid'},{name:'version',type:'int8'}],record:{debate_id:detail.id,version:sequence},old_record:{},errors:[]}}]));}
const total=(page,n)=>page.waitForFunction(n=>document.querySelector('[data-results-phase=before] .debate-result-total')?.textContent.includes(': '+n),n);
const option=(page,id,text)=>page.locator('[data-results-phase=before] [data-result-option="'+id+'"] bdi').filter({hasText:text}).waitFor();
try{
 const observer=await pageFor();await total(observer,0);results.push('Guests see zero totals while polls are open, without a published final snapshot');
 const actor=await pageFor(userA);await actor.waitForFunction(()=>!document.querySelector('#vote-before input').disabled);await actor.locator('#vote-before input[type=radio]').first().check();await actor.locator('#vote-before button').click();await total(actor,1);
 let started=Date.now();emit();await total(observer,1);const firstPushMs=Date.now()-started;assert.ok(firstPushMs<2000,'Push refresh should arrive before the three-second fallback');await option(observer,detail.options[0].id,'1 صوت · 100');results.push('First vote immediately updates the voter and another connected visitor ('+firstPushMs+'ms simulated push)');
 await call(other.access_token,{action:'vote',id:before.id,data:{debate_id:detail.id,option_id:detail.options[1].id}});emit();await total(observer,2);await option(observer,detail.options[0].id,'1 صوت · 50');results.push('A second user changes exact totals and percentages in the open visitor tab');
 await actor.locator('#vote-before input[type=radio]').nth(1).check();await actor.locator('#vote-before button').click();await actor.getByRole('status').filter({hasText:'تم حفظ اختيارك'}).waitFor();emit();await option(observer,detail.options[1].id,'2 صوت · 100');await total(observer,2);results.push('Editing a vote moves its count without increasing the number of voters');
 const fallback=await pageFor(null,true);await total(fallback,2);await call(other.access_token,{action:'vote',id:before.id,data:{debate_id:detail.id,option_id:detail.options[0].id}});started=Date.now();await option(fallback,detail.options[0].id,'1 صوت · 50');assert.ok(Date.now()-started<7000);results.push('Automatic fallback refresh works when WebSockets are unavailable');
 const visibility=async visible=>{const workspace=await call(manager.access_token,null,true),debate=workspace.debates.find(d=>d.id===detail.id);await call(manager.access_token,{action:'results_visibility',id:detail.id,revision:debate.revision,data:{visible,reason:'اختبار عرض النتائج المباشرة'}},true);emit();};
 await visibility(false);await observer.locator('#results').waitFor({state:'hidden'});await visibility(true);await observer.locator('#results>summary').click();await total(observer,2);results.push('Management can hide and restore live results before saving any final snapshot');
 for(const width of [320,390,768,1440]){await observer.setViewportSize({width,height:1000});assert.ok(await observer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow at '+width);}
 await observer.setViewportSize({width:390,height:1000});await observer.locator('#results').screenshot({path:'docs/debates/evidence/live-results-390.png'});results.push('Live results fit mobile and desktop widths without horizontal overflow');
 const slow=await pageFor(null,true,true);await total(slow,2);results.push('Slow initial requests complete even when they take longer than the fallback interval');
 assert.deepEqual(runtime,[]);assert.deepEqual(external,[]);await writeFile('docs/debates/evidence/live-results-browser.json',JSON.stringify({passed:true,results,runtimeErrors:runtime,externalRequests:external,realtimeTransport:'Simulated Supabase wire protocol; actual Supabase deployment not modified or exercised'},null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}

// Optional real-browser regression for the 967 public navigation.
// In a clean CI runner: npm ci && npm install --no-save --package-lock=false playwright
// then start "LOCAL_CONTENT_FALLBACK=1 npm run dev -- -p 3119" and run this file.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.PHASE5_BASE_URL||'http://127.0.0.1:3119';
const widths=[320,390,768,1024,1440];
const routes=['/','/school','/yemen-history','/yemeni-figures','/yemeni-products','/search'];
const shots='docs/audit/phase5/browser';
await mkdir(shots,{recursive:true});
const results=[],errors=[];
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:'ar',viewport:{width:390,height:900}});
const page=await context.newPage();
page.on('pageerror',error=>errors.push(error.message));
page.setDefaultTimeout(30000);
try{
 for(const route of routes){
  for(const width of widths){
   await page.setViewportSize({width,height:900});
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:90000});
   assert.ok(response&&response.ok(),route+' returned '+response?.status());
   await page.locator('#main-navigation').waitFor();
   const info=await page.evaluate(()=>{
    const viewport=window.innerWidth;
    const header=document.querySelector('.site-header').getBoundingClientRect();
    const links=[...document.querySelectorAll('.site-header a,.site-header button')].filter(node=>node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden');
    const offscreen=links.filter(node=>{
      const r=node.getBoundingClientRect();
      return r.width>0&&(r.left< -2||r.right>viewport+2);
    }).map(node=>({name:node.getAttribute('aria-label')||node.textContent?.trim().slice(0,40),left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right}));
    return {viewport,documentWidth:document.documentElement.scrollWidth,headerWidth:Math.round(header.width),offscreen,
      skipLink:Boolean(document.querySelector('a.skip-link[href="#content"]')),
      mainTarget:Boolean(document.getElementById('content'))};
   });
   assert.ok(info.skipLink&&info.mainTarget,'missing accessible skip link target at '+route);
   assert.equal(info.offscreen.length,0,'header controls clipped '+route+'/'+width+': '+JSON.stringify(info.offscreen));
   assert.ok(info.documentWidth<=width+2,'horizontal overflow '+route+'/'+width+' document '+info.documentWidth);
   results.push({route,width,...info});
   if(['/','/school'].includes(route)&&[320,390,1440].includes(width)){
    await page.screenshot({path:shots+'/'+(route==='/'?'home':'school')+'-'+width+'.png',animations:'disabled'});
   }
  }
 }
 await page.setViewportSize({width:390,height:900});
 await page.goto(base+'/school',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'فتح القائمة'}).waitFor();
 // Wait for Next hydration before interacting with the client-side header.
 await page.waitForTimeout(1000);
 const open=page.getByRole('button',{name:'فتح القائمة'});
 await open.click();
 const toggle=page.locator('button.menu-toggle');
 assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 assert.ok(await page.locator('#main-navigation').isVisible());
 const locked=await page.evaluate(()=>({
  overflow:document.body.style.overflow,
  main:document.getElementById('content').inert,
  footer:document.querySelector('.platform-footer').inert,
  focused:document.activeElement?.closest('#main-navigation')!==null
 }));
 assert.deepEqual(locked,{overflow:'hidden',main:true,footer:true,focused:true},'mobile modal navigation isolation');
 const menuPaths=['/school/nature','/school/logic','/school/civic','/universities','/medical-centers'];
 for(const href of menuPaths)assert.ok(await page.locator('#main-navigation a[href="'+href+'"]').count()>0,'missing mobile menu route '+href);
 await page.screenshot({path:shots+'/menu-390.png',animations:'disabled'});
 await page.keyboard.press('Escape');
 assert.equal(await toggle.getAttribute('aria-expanded'),'false','Escape should close the menu');
 assert.equal(await page.evaluate(()=>document.getElementById('content').inert),false,'content focus restored after menu closed');
 assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('menu-toggle')),true,'Escape should restore focus to toggle');
 await toggle.click();
 assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 await page.setViewportSize({width:1440,height:900});
 await page.waitForFunction(()=>document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='false');
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'','desktop resize should release body scroll');
 assert.equal(await page.evaluate(()=>document.querySelector('.platform-footer').inert),false);
 assert.equal(await page.locator('button.menu-toggle').isVisible(),false,'desktop shows direct navigation');
 const disclosure=page.locator('.platform-nav>.nav-group>summary').first();
 await disclosure.focus();
 await page.keyboard.press('Enter');
 assert.equal(await disclosure.evaluate(node=>node.parentElement.open),true,'desktop navigation opens by keyboard');
 await page.keyboard.press('Escape');
 assert.equal(await disclosure.evaluate(node=>node.parentElement.open),false,'Escape closes desktop navigation');
 const footerRoutes=['/school/nature','/school/logic','/school/civic','/universities','/medical-centers'];
 for(const href of footerRoutes)assert.ok(await page.locator('.platform-footer a[href="'+href+'"]').count()>0,'footer hides '+href);
 await writeFile(shots+'/results.json',JSON.stringify({passed:true,results,errors},null,2));
 assert.deepEqual(errors,[],'uncaught browser errors');
 console.log('Phase 5 browser tests passed: '+results.length+' route/viewport combinations, mobile menu, keyboard navigation, footer.');
}finally{
 await browser.close();
}

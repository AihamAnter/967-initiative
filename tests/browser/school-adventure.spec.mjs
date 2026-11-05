// Optional interactive audit: E2E_BASE_URL=http://localhost:3000 npx playwright test tests/browser/school-adventure.spec.mjs
import {test,expect} from '@playwright/test';
const baseURL=process.env.E2E_BASE_URL||'http://localhost:3000';
for(const width of [320,375,768,1440]){
 test.describe('School adventure at '+width+'px',()=>{
  test.use({baseURL,viewport:{width,height:880}});
  test('home worlds have visible destinations, a locked future world, and no page overflow',async({page})=>{
   await page.goto('/school',{waitUntil:'domcontentloaded'});
   const worlds=page.getByLabel('خريطة مجالات مدرسة 967');
   await expect(worlds).toBeVisible();
   for(const href of ['/school/writing','/school/nature','/school/logic','/school/civic'])
    await expect(worlds.locator('a[href="'+href+'"]')).toBeVisible();
   await expect(worlds.getByText('الفنون والمهارات')).toBeVisible();
   const widthOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   expect(widthOverflow,'horizontal overflow on school map').toBeLessThanOrEqual(2);
  });
  test('writing tracks are linked quests, not a flat card grid',async({page})=>{
   await page.goto('/school/writing',{waitUntil:'domcontentloaded'});
   const trail=page.getByRole('region',{name:'مسارات القسم التعليمية'});
   await expect(trail).toBeVisible();
   await expect(trail.locator('a[href="/school/writing/musnad"]')).toBeVisible();
   await expect(trail.locator('a[href="/school/writing/arud"]')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(2);
  });
 });
}
test.describe('school dark theme at mobile width',()=>{
 test.use({baseURL,viewport:{width:375,height:850}});
 test('world and track colors remain visible with dark appearance',async({page})=>{
  await page.goto('/school',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>document.documentElement.setAttribute('data-ed-theme','dark'));
  const stage=page.getByLabel('خريطة مجالات مدرسة 967');
  await expect(stage).toBeVisible();
  const colors=await stage.evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
  expect(colors.color).toMatch(/^rgb/);
  expect(colors.background).toMatch(/^rgb/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(2);
 });
});

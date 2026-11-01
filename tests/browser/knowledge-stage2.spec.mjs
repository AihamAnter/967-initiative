// Optional Playwright verification for Knowledge stage 2 on the local site.
// $env:E2E_BASE_URL='http://localhost:3000'
// npx playwright test tests/browser/knowledge-stage2.spec.mjs --reporter=list
import {test,expect} from '@playwright/test';
const baseURL=process.env.E2E_BASE_URL||'http://localhost:3000';
for(const width of [320,375,1440]){
 test.describe('Knowledge stage two at '+width+'px',()=>{
  test.use({baseURL,viewport:{width,height:860}});
  test('history card view distinguishes content types and retains the timeline',async({page})=>{
   await page.goto('/yemen-history',{waitUntil:'domcontentloaded'});
   await expect(page.locator('[data-knowledge-area="history"]')).toBeVisible();
   await expect(page.getByRole('navigation',{name:'التنقل بين أقسام المعرفة'})).toBeVisible();
   await page.getByRole('group',{name:'طريقة العرض'}).getByRole('button',{name:'البطاقات'}).click();
   const cards=page.locator('article[data-history-kind]');
   await expect(cards.first()).toBeVisible();
   const first=cards.first();
   const top=await first.evaluate(el=>getComputedStyle(el).borderBlockStartColor);
   const right=await first.evaluate(el=>getComputedStyle(el).borderRightColor);
   expect(top).toMatch(/rgb/);
   expect(right).toMatch(/rgb/);
   await expect(first.locator('h3 a')).toBeVisible();
   await page.getByRole('group',{name:'طريقة العرض'}).getByRole('button',{name:'الخط الزمني'}).click();
   await expect(page.getByRole('region',{name:'خط زمني تفاعلي لتاريخ اليمن'})).toBeVisible();
  });
  test('figure listing preserves search, colored metadata and valid profile links',async({page})=>{
   await page.goto('/yemeni-figures',{waitUntil:'domcontentloaded'});
   await expect(page.locator('[data-knowledge-area="figures"]')).toBeVisible();
   await expect(page.getByRole('search',{name:'البحث وتصفية الشخصيات'})).toBeVisible();
   const card=page.locator('.yfigure-card').first();
   await expect(card).toBeVisible();
   await expect(card.locator('.yfigure-meta')).toBeVisible();
   const color=await card.evaluate(el=>getComputedStyle(el).borderBlockStartColor);
   expect(color).not.toBe('rgba(0, 0, 0, 0)');
   await card.locator('.yfigure-card-hitarea').click();
   await expect(page.locator('[data-knowledge-area="figures"] .figure-profile-hero')).toBeVisible();
   await expect(page.getByRole('navigation',{name:'التنقل بين أقسام المعرفة'})).toBeVisible();
  });
  test('geography catalog offers 22 numbered, keyboard-reachable province entries',async({page})=>{
   await page.goto('/yemen-map',{waitUntil:'domcontentloaded'});
   const catalog=page.getByRole('region',{name:'ملفات محافظات اليمن'});
   const links=catalog.locator('a');
   await expect(links).toHaveCount(22);
   await expect(links.first().locator('span[aria-hidden="true"]')).toContainText('01');
   await links.first().focus();
   await expect(links.first()).toBeFocused();
   await links.first().press('Enter');
   await expect(page.locator('[data-knowledge-area="atlas"]')).toBeVisible();
   await expect(page.getByRole('navigation',{name:'التنقل بين أقسام المعرفة'})).toBeVisible();
  });
  test('no accidental horizontal overflow from knowledge enhancements',async({page})=>{
   for(const href of ['/yemen-history','/yemeni-figures','/yemen-map']){
    await page.goto(href,{waitUntil:'domcontentloaded'});
    const extra=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    expect(extra,'overflow on '+href).toBeLessThanOrEqual(2);
   }
  });
 });
}

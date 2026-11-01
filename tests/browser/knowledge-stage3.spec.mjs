// Optional real-browser QA. Requires running localhost and @playwright/test.
// $env:E2E_BASE_URL = 'http://localhost:3000'
// npx playwright test tests/browser/knowledge-stage3.spec.mjs --reporter=list
import {test,expect} from '@playwright/test';
const baseURL=process.env.E2E_BASE_URL||'http://localhost:3000';

for(const width of [320,375,1440]){
 test.describe('knowledge national data at '+width+'px',()=>{
  test.use({baseURL,viewport:{width,height:850}});

  test('indicator catalog keeps filters and labels for source, measurement year and status',async({page})=>{
   await page.goto('/yemen-in-numbers',{waitUntil:'domcontentloaded'});
   const root=page.locator('[data-knowledge-area="statistics"]');
   await expect(root).toBeVisible();
   await expect(page.getByRole('navigation',{name:'التنقل بين أقسام المعرفة'}).getByRole('link',{name:'اليمن بالأرقام'})).toHaveAttribute('aria-current','page');
   const toolbar=root.locator('.stat-toolbar');
   await expect(toolbar).toBeVisible();
   const cards=root.locator('.stat-indicator-card');
   if(await cards.count()){
    const first=cards.first();
    await expect(first.locator('h3')).toBeVisible();
    const metric=first.locator('.stat-card-value');
    if(await metric.count()){
      await expect(metric.locator('.stat-value-context')).toContainText('سنة القياس:');
      await expect(first.locator('.stat-card-meta')).toContainText('المصدر:');
    }else{
      await expect(first.locator('.stat-card-empty')).toBeVisible();
    }
    const surface=first.locator('xpath=..');
    const border=await surface.evaluate(el=>getComputedStyle(el).borderBlockStartWidth);
    expect(Number.parseInt(border,10)).toBeGreaterThanOrEqual(3);
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  });

  test('ranking emphasizes Yemen only when it has a published value',async({page})=>{
   await page.goto('/yemen-ranking',{waitUntil:'domcontentloaded'});
   const root=page.locator('[data-knowledge-area="ranking"]');
   await expect(root).toBeVisible();
   await expect(page.getByRole('navigation',{name:'التنقل بين أقسام المعرفة'}).getByRole('link',{name:'ترتيب اليمن'})).toHaveAttribute('aria-current','page');
   const controls=root.locator('.yr-controls');
   if(!await controls.count()){
    await expect(root.locator('.yr-state')).toBeVisible();
    return;
   }
   await expect(controls).toBeVisible();
   const scope=controls.getByRole('group',{name:'نطاق المقارنة'});
   await expect(scope.getByRole('button',{name:'العالم'})).toHaveAttribute('aria-pressed',/true|false/);
   const result=root.locator('.yr-rank-card');
   await expect(result).toBeVisible();
   if(!await result.evaluate(el=>el.classList.contains('yr-unavailable'))){
    await expect(result).toContainText('اليمن في المرتبة');
    await expect(result).toContainText('قيمة اليمن');
   }else{
    await expect(result).toContainText('لا توجد قيمة منشورة');
   }
   const list=root.locator('.yr-full-list');
   if(await list.count()){
     const toggle=list.getByRole('button',{name:/عرض القائمة كاملة/});
     await toggle.click();
     await expect(list.getByRole('region',{name:'جدول ترتيب الدول والاقتصادات'})).toBeVisible();
     const yemen=list.locator('tr.is-yemen');
     if(await yemen.count()){
       await expect(yemen.first()).toContainText('اليمن');
       const border=await yemen.first().locator('td').first().evaluate(el=>getComputedStyle(el).borderInlineStartWidth);
       expect(Number.parseInt(border,10)).toBeGreaterThanOrEqual(3);
     }
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  });

  test('statistics linked detail keeps accessible source and table',async({page})=>{
   await page.goto('/yemen-in-numbers',{waitUntil:'domcontentloaded'});
   const first=page.locator('.stat-indicator-card').first();
   if(!await first.count())return;
   await first.click();
   await expect(page.locator('[data-knowledge-area="statistics"]')).toBeVisible();
   await expect(page.getByRole('navigation',{name:'التنقل بين أقسام المعرفة'})).toBeVisible();
   const table=page.getByRole('region',{name:'الجدول الزمني للمؤشر'});
   if(await table.count()){
    await expect(table).toBeVisible();
    await table.focus();
    await expect(table).toBeFocused();
   }
  });
 });
}

// Optional real-browser regression checks. Not part of npm test because
// @playwright/test is intentionally not a project dependency.
// Run locally: E2E_BASE_URL=http://localhost:3000 npx playwright test tests/browser/mobile-967.spec.mjs
import {test,expect} from '@playwright/test';

const baseURL=process.env.E2E_BASE_URL||'http://localhost:3000';

function insideViewport(box,viewport){
 expect(box,'element should have a layout box').not.toBeNull();
 expect(box.y,'not cut off above the viewport').toBeGreaterThanOrEqual(-2);
 expect(box.y+box.height,'not cut off below the viewport').toBeLessThanOrEqual(viewport.height+2);
}
for(const width of [320,375]){
 test.describe('mobile '+width+'px',()=>{
  test.use({viewport:{width,height:800},baseURL});

  test('quiz reveals timer and new question on start and after next',async({page})=>{
   await page.goto('/games/quiz');
   const setup=page.getByRole('group',{name:'وقت الإجابة لكل سؤال'});
   await setup.getByRole('button',{name:/30/}).click();
   await page.getByRole('button',{name:/ابدأ الجولة/}).click();
   const question=page.locator('h2[tabindex="-1"]');
   const timer=page.locator('div[aria-label^="الوقت المتبقي"]').first();
   await expect(question).toBeVisible();
   await expect(timer).toBeVisible();
   insideViewport(await question.boundingBox(),page.viewportSize());
   insideViewport(await timer.boundingBox(),page.viewportSize());
   await page.getByRole('group',{name:'خيارات الإجابة'}).getByRole('button').first().click();
   await page.getByRole('button',{name:/السؤال التالي/}).click();
   await expect(page.getByRole('group',{name:'خيارات الإجابة'}).getByRole('button').first()).toBeEnabled();
   insideViewport(await question.boundingBox(),page.viewportSize());
   insideViewport(await timer.boundingBox(),page.viewportSize());
  });

  test('nine cards have reduced height, all entries remain available',async({page})=>{
   await page.goto('/games');
   const cards=page.locator('a[aria-label^="العب "]');
   await expect(cards).toHaveCount(9);
   for(let i=0;i<9;i++){
    const card=cards.nth(i),box=await card.boundingBox();
    expect(box.height,'compact mobile game card '+i).toBeLessThan(260);
   }
  });

  test('map challenge requires confirmation, not a named answer list',async({page})=>{
   await page.goto('/games/map');
   await page.getByRole('button',{name:/ابدأ التحدي/}).click();
   const confirm=page.getByRole('button',{name:'تأكيد الموقع'});
   await expect(confirm).toBeDisabled();
   await expect(page.locator('select')).toHaveCount(0);
   const firstRegion=page.locator('svg[aria-label^="خريطة تفاعلية"] path[role="button"]').first();
   await firstRegion.focus();
   await firstRegion.press('Enter');
   await expect(confirm).toBeEnabled();
   await expect(page.getByText('تم تحديد منطقة. يمكنك تغييرها قبل التأكيد.')).toBeVisible();
  });

  test('mobile footer links are behind expandable group headers',async({page})=>{
   await page.goto('/');
   const footer=page.locator('footer.platform-footer');
   const first=footer.locator('details.footer-link-group').first();
   await expect(first).toBeVisible();
   await expect(first).not.toHaveAttribute('open','');
   await first.locator('summary').click();
   await expect(first).toHaveAttribute('open','');
   await expect(first.getByRole('link',{name:'مناظرات 967'})).toBeVisible();
  });
 });
}

test.describe('desktop footer navigation',()=>{
 test.use({viewport:{width:1440,height:900},baseURL});
 test('links remain visible without opening a disclosure',async({page})=>{
  await page.goto('/');
  const footer=page.locator('footer.platform-footer');
  await expect(footer.locator('.footer-link-desktop').first()).toBeVisible();
  await expect(footer.getByRole('link',{name:'جميع الألعاب'})).toBeVisible();
  await expect(footer.getByRole('link',{name:'رحلتي التعليمية'})).toBeVisible();
 });
});

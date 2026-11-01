// Run locally against the development site with @playwright/test:
// $env:E2E_BASE_URL='http://localhost:3000'
// npx playwright test tests/browser/knowledge-identity.spec.mjs --reporter=list
import {test,expect} from '@playwright/test';

const baseURL=process.env.E2E_BASE_URL||'http://localhost:3000';
const areas=[
 ['history','/yemen-history','تاريخ اليمن'],
 ['figures','/yemeni-figures','شخصيات يمنية'],
 ['atlas','/yemen-map','خريطة اليمن'],
 ['statistics','/yemen-in-numbers','اليمن بالأرقام'],
 ['ranking','/yemen-ranking','ترتيب اليمن'],
];
for(const width of [375,1440]){
 test.describe('knowledge identity at '+width+'px',()=>{
  test.use({baseURL,viewport:{width,height:850}});
  for(const [id,path,title] of areas){
   test(title+' keeps a readable, linked palette and active knowledge section',async({page})=>{
    await page.goto(path,{waitUntil:'domcontentloaded'});
    const root=page.locator('[data-knowledge-area="'+id+'"]');
    await expect(root).toBeVisible();
    await expect(root.locator('.page-intro h1')).toContainText(title);
    const nav=page.getByRole('navigation',{name:'التنقل بين أقسام المعرفة'});
    await expect(nav).toBeVisible();
    const active=nav.getByRole('link',{name:title});
    await expect(active).toHaveAttribute('aria-current','page');
    const colors=await root.evaluate(element=>{
      const s=getComputedStyle(element);
      return {accent:s.getPropertyValue('--knowledge-accent').trim(),hero:s.getPropertyValue('--knowledge-hero').trim()};
    });
    expect(colors.accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.hero).toMatch(/^#[0-9a-f]{6}$/i);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    expect(overflow,'unexpected horizontal page overflow').toBeLessThanOrEqual(2);
   });
  }
 });
}
test.use({baseURL,viewport:{width:375,height:850}});
test('knowledge nav keeps links and responds to keyboard',async({page})=>{
 await page.goto('/yemen-history',{waitUntil:'domcontentloaded'});
 const nav=page.getByRole('navigation',{name:'التنقل بين أقسام المعرفة'});
 const figures=nav.getByRole('link',{name:'شخصيات يمنية'});
 await figures.focus();
 await expect(figures).toBeFocused();
 await figures.press('Enter');
 await expect(page).toHaveURL(/\/yemeni-figures(?:[?#]|$)/);
 await expect(page.getByRole('navigation',{name:'التنقل بين أقسام المعرفة'}).getByRole('link',{name:'شخصيات يمنية'})).toHaveAttribute('aria-current','page');
});

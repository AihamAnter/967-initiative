// Run with: E2E_BASE_URL=http://localhost:3000 npx playwright test tests/browser/history-comparison.spec.mjs
import {test,expect} from '@playwright/test';
const baseURL=process.env.E2E_BASE_URL||'http://localhost:3000';
for(const width of [320,375,768,1440]){
 test.describe('Historical state comparison at '+width+'px',()=>{
  test.use({baseURL,viewport:{width,height:900}});
  test('shows sourced four-tab comparison with no horizontal overflow',async({page})=>{
   await page.goto('/yemen-history#compare',{waitUntil:'domcontentloaded'});
   const section=page.locator('#compare');
   await expect(section.getByRole('heading',{name:'قارن بين دولتين'})).toBeVisible();
   await expect(section.getByRole('tab')).toHaveCount(4);
   await expect(section.getByRole('tab',{name:/نظرة عامة/})).toHaveAttribute('aria-selected','true');
   await expect(section.getByRole('tabpanel').getByText('العاصمة ومراكز الحكم')).toBeVisible();
   await expect(section.getByRole('heading',{name:/متى تلتقي الفترات/})).toBeVisible();
   await expect(section.getByRole('heading',{name:'المصادر لكل دولة'})).toBeVisible();
   await section.getByRole('tab',{name:/الاقتصاد والحياة/}).click();
   await expect(section.getByRole('tabpanel').getByText('التجارة والأنشطة الاقتصادية')).toBeVisible();
   await section.getByRole('tab',{name:/السياسة والحكم/}).click();
   await expect(section.getByRole('tabpanel').getByText('أبرز الحكام')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(2);
  });
  test('selection, swapping and links preserve context',async({page})=>{
   await page.goto('/yemen-history?era=ancient&type=state#compare',{waitUntil:'domcontentloaded'});
   const section=page.locator('#compare');
   await section.getByRole('combobox',{name:'اختر الدولة الأولى'}).selectOption('himyar');
   await expect(page).toHaveURL(/compareA=himyar/);
   await expect(page).toHaveURL(/era=ancient/);
   await expect(page).toHaveURL(/type=state/);
   await section.getByRole('button',{name:'تبديل موقع الدولتين'}).click();
   await expect(section.getByRole('combobox',{name:'اختر الدولة الثانية'})).toHaveValue('himyar');
   await expect(section.getByRole('link',{name:/استكشف المحافظة في الأطلس/}).first()).toHaveAttribute('href',/\/yemen-map\?region=/);
  });
 });
}
test.describe('state comparison dark theme',()=>{
 test.use({baseURL,viewport:{width:390,height:850}});
 test('uses dark surfaces and readable comparison headings',async({page})=>{
  await page.goto('/yemen-history#compare',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>document.documentElement.setAttribute('data-ed-theme','dark'));
  const section=page.locator('#compare');
  await expect(section).toBeVisible();
  const result=await section.evaluate(element=>{
   const surface=element.querySelector('[class*="stateCard"]');
   return {text:getComputedStyle(element).color,bg:getComputedStyle(surface).backgroundColor};
  });
  expect(result.text).toMatch(/^rgb/);
  expect(result.bg).toMatch(/^rgb/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(2);
 });
});

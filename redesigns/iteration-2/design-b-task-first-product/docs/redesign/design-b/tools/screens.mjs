// Full-page screenshots of the in-scope pages.
// Usage: node screens.mjs <before|after> <outDir> [baseUrl] [widths]
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const label = process.argv[2] || 'after';
const out = process.argv[3] || '.';
const base = process.argv[4] || 'http://localhost:3102';
const widths = (process.argv[5] || '375,1440').split(',').map(Number);
const schemes = (process.argv[6] || 'light').split(',');
const pages = JSON.parse(process.env.SCREEN_PAGES || 'null') || [
  ['home', '/'],
  ['numbers', '/yemen-in-numbers'],
  ['indicator', '/yemen-in-numbers/indicator/government-effectiveness-score'],
  ['works', '/works'],
  ['work-detail', '/works/work-mv6uhecd'],
];
mkdirSync(out, {recursive: true});
const browser = await chromium.launch();
for (const scheme of schemes) for (const width of widths) {
  const context = await browser.newContext({viewport: {width, height: width < 800 ? 812 : 900}, deviceScaleFactor: width < 800 ? 2 : 1, isMobile: width < 800, hasTouch: width < 800, reducedMotion: 'reduce', colorScheme: scheme});
  await context.route(/\/api\/(analytics|telemetry)/, route => route.abort());
  const page = await context.newPage();
  for (const [name, path] of pages) {
    await page.goto(base + path, {waitUntil: 'load'});
    await page.waitForTimeout(1800);
    await page.screenshot({path: `${out}/${label}-${name}-${width}${schemes.length > 1 || scheme !== 'light' ? '-' + scheme : ''}.png`, fullPage: true});
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(label, name, width, scheme, overflow > 0 ? `HORIZONTAL OVERFLOW ${overflow}px` : 'ok');
  }
  await context.close();
}
await browser.close();

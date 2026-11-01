// Reproducible performance measurement for Design B.
// Usage: node measure.mjs <label> [baseUrl]
// Requires the `playwright` package resolvable from the current directory and a
// production server (`npx next start -p 3102`). Analytics and telemetry POSTs are
// aborted so that measuring never writes to the production database.
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const label = process.argv[2] || 'run';
const base = process.argv[3] || 'http://localhost:3102';
const pages = JSON.parse(process.env.MEASURE_PAGES || 'null') || [
  '/',
  '/yemen-in-numbers',
  '/yemen-in-numbers/indicator/government-effectiveness-score',
  '/works',
  '/works/work-mv6uhecd',
];
const RUNS = Number(process.env.MEASURE_RUNS || 9);
const median = values => {const sorted = [...values].sort((a, b) => a - b);return sorted[Math.floor(sorted.length / 2)];};

function curl(url) {
  const out = execFileSync('curl', ['-s', '--compressed', '-o', '/dev/null', '-w', '%{time_starttransfer} %{size_download} %{http_code} %{time_total}', url], {encoding: 'utf8'});
  const [ttfb, wire, code, total] = out.trim().split(' ');
  return {ttfb: Number(ttfb), wire: Number(wire), code: Number(code), total: Number(total)};
}
function decodedSize(url) {
  return Number(execFileSync('sh', ['-c', `curl -s --compressed '${url}' | wc -c`], {encoding: 'utf8'}).trim());
}

const browser = await chromium.launch();
const results = [];
for (const path of pages) {
  const url = base + path;
  curl(url); // warm the route once so the first compile/cold cache is not counted
  const samples = Array.from({length: RUNS}, () => curl(url));
  const htmlDecoded = decodedSize(url);
  const context = await browser.newContext({viewport: {width: 375, height: 812}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
  await context.route(/\/api\/(analytics|telemetry)/, route => route.abort());
  const page = await context.newPage();
  const responses = [];
  page.on('response', response => responses.push(response));
  await page.goto(url, {waitUntil: 'load'});
  await page.waitForTimeout(2500);
  const totals = {document: 0, script: 0, stylesheet: 0, font: 0, image: 0, other: 0};
  const counts = {document: 0, script: 0, stylesheet: 0, font: 0, image: 0, other: 0};
  // Count each URL once: a preloaded resource is reported again when the element uses it.
  const seen = new Set();
  for (const response of responses) {
    if (seen.has(response.url())) continue;
    seen.add(response.url());
    const type = response.request().resourceType();
    const key = ['document', 'script', 'stylesheet', 'font', 'image'].includes(type) ? type : 'other';
    let bytes = 0;
    try {bytes = (await response.request().sizes()).responseBodySize;} catch {}
    totals[key] += bytes;
    counts[key] += 1;
  }
  const lcp = await page.evaluate(() => new Promise(resolve => {
    let value = 0;
    new PerformanceObserver(list => {for (const entry of list.getEntries()) value = entry.startTime;}).observe({type: 'largest-contentful-paint', buffered: true});
    setTimeout(() => resolve(Math.round(value)), 300);
  }));
  await context.close();
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  results.push({path, status: samples[0].code, ttfbMedianMs: Math.round(median(samples.map(s => s.ttfb)) * 1000), htmlCompleteMedianMs: Math.round(median(samples.map(s => s.total)) * 1000), htmlWire: samples[0].wire, htmlDecoded, totals, counts, total, lcpMs: lcp});
  console.log(path, JSON.stringify(results.at(-1)));
}
await browser.close();
writeFileSync(new URL(`./measure-${label}.json`, import.meta.url), JSON.stringify({label, base, runs: RUNS, measuredAt: new Date().toISOString(), results}, null, 2));

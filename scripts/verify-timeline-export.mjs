// Runs the exact export helper against a live, read-only public chart without a
// full Next.js rebuild. Optional tooling lives in .audit-tools, outside app deps.
import {createRequire} from 'node:module';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(path.resolve('.audit-tools/package.json'));
const {chromium} = require('playwright');
const browser = await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROME_PATH || path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await page.goto((process.env.CHECK_BASE_URL||'http://127.0.0.1:3000')+'/yemen-in-numbers/timeline',{waitUntil:'networkidle'});
  const compatible=page.locator('.timeline-indicator-list label:has(input:not(:checked):not(:disabled))');
  if(await compatible.count())await compatible.first().click();
  await page.locator('.timeline-chart .recharts-wrapper > svg.recharts-surface .recharts-cartesian-axis').first().waitFor();
  const helper=(await readFile('lib/timelineExport.js','utf8')).replaceAll('export async function','async function').replaceAll('export function','function');
  await page.addScriptTag({content:helper+'\nwindow.auditTimelinePng=timelineChartPng;window.auditTimelineSvg=timelineChartSvg;'});
  const result=await page.evaluate(async()=>{
    const chartElement=document.querySelector('.timeline-chart');
    const svg=window.auditTimelineSvg(chartElement);
    const checks=[...document.querySelectorAll('.timeline-indicator-list input:checked')];
    const sources=[...document.querySelectorAll('.timeline-sources>span')];
    const lines=[...svg.querySelectorAll('.recharts-line-curve')];
    const series=checks.map((input,index)=>({name:input.closest('label').querySelector('strong').textContent,source:sources[index]?.textContent.replace(/^.*?:\s*/,''),color:lines[index]?.getAttribute('stroke')}));
    const years=[...document.querySelectorAll('.timeline-toolbar>label select')].map(el=>Number(el.value));
    const blob=await window.auditTimelinePng({chartElement,fromYear:years[0],toYear:years[1],unit:checks[0]?.closest('label').querySelector('small').textContent,percent:false,series});
    const bitmap=await createImageBitmap(blob);
    return {axes:svg.querySelectorAll('.recharts-cartesian-axis').length,series:lines.length,svgWidth:Number(svg.getAttribute('width')),firstSvgWidth:Number(chartElement.querySelector('svg').getAttribute('width')),width:bitmap.width,height:bitmap.height,bytes:[...new Uint8Array(await blob.arrayBuffer())]};
  });
  assert.ok(result.axes>=2&&result.series>=1,'Export source must contain actual axes and series');
  assert.ok(result.svgWidth>200&&result.width>=1200&&result.height>=700,'Export must contain the plot, not the 14px legend');
  await writeFile('docs/audit/evidence/timeline-export-source-proof.png',Buffer.from(result.bytes));
  delete result.bytes;
  await writeFile('docs/audit/evidence/timeline-export-source-proof.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}finally{await browser.close();}

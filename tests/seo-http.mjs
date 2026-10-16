// Read-only checks against a running production build. No CMS or form writes.
import {mkdir, writeFile} from 'node:fs/promises';
import {DEFAULT_SITE_ORIGIN} from '../lib/seo.js';

const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:3000';
const preview = process.env.CHECK_PREVIEW === '1';
const origin = process.env.CHECK_CANONICAL_ORIGIN || DEFAULT_SITE_ORIGIN;
const checks = [];
const result = (name, passed, details = {}) => {checks.push({name, passed, ...details});};
const fetchPage = async (path, agent = 'OAI-SearchBot/1.4') => {
  const response = await fetch(base + path, {headers:{'User-Agent':agent}, signal:AbortSignal.timeout(90000)});
  return {status:response.status, text:await response.text(), headers:response.headers};
};
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const meta = (html, name) => [...html.matchAll(/<meta\s[^>]*>/gi)].map(match => attributes(match[0])).find(attrs => attrs.name === name || attrs.property === name)?.content;
const routes = ['/', '/works', '/magazine', '/contribute', '/yemen-map', '/professionals', '/yemeni-products', '/yemen-in-numbers', '/yemen-in-numbers/timeline', '/search', '/admin', '/magazine/demo', '/yemen-map/figures/arwa-al-sulayhi', '/yemen-in-numbers/gdp'];
const sitemap = await fetchPage('/sitemap.xml');
const sitemapUrls = [...sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
for (const prefix of ['/works/', '/magazine/', '/professionals/', '/yemeni-products/', '/yemen-in-numbers/indicator/']) {
  const url = sitemapUrls.find(value => new URL(value).pathname.startsWith(prefix));
  const path = url && new URL(url).pathname;
  if (path && !routes.includes(path)) routes.push(path);
}
const noindexPaths = new Set(['/search', '/admin', '/magazine/demo']);
const isDemoFigure = (path, html) => path.includes('/figures/') && html.includes('ملف توضيحي من الكتالوج التجريبي للمشروع');
const isEmptyDomain = (path, html) => /^\/yemen-in-numbers\/[^/]+$/.test(path) && html.includes('هذا المجال جاهز لاستقبال البيانات');
const titles = new Set();

for (const path of routes) {
  try {
    const {status, text:html} = await fetchPage(path);
    const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
    const title = head.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    const canonical = [...head.matchAll(/<link\s[^>]*>/gi)].map(match => attributes(match[0])).find(attrs => attrs.rel === 'canonical')?.href;
    const h1Count = [...html.matchAll(/<h1(?:\s|>)/gi)].length;
    result(`${path} server HTML`, status === 200 && (path === '/admin' || h1Count === 1) && /<html[^>]*lang="ar"[^>]*dir="rtl"/i.test(html), {status, h1Count, ...(path === '/admin' ? {note:'Private client-auth route: H1 is verified after hydration by browser QA.'} : {})});
    result(`${path} head metadata`, Boolean(title && meta(head, 'description') && meta(head, 'og:title') && meta(head, 'og:description') && meta(head, 'twitter:card')), {title, canonical});
    result(`${path} production canonical`, Boolean(canonical && new URL(canonical).href === new URL(origin + path).href));
    const noindex = /noindex/i.test(meta(head, 'robots') || '');
    result(`${path} indexing policy`, noindex === (preview || noindexPaths.has(path) || isDemoFigure(path, html) || isEmptyDomain(path, html)), {robots:meta(head, 'robots')});
    if (title) {result(`${path} distinct title`, !titles.has(title)); titles.add(title);}
    const structuredData = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    result(`${path} structured data parses`, structuredData.some(schema => schema['@graph']?.some(item => item['@type'] === 'WebSite')));
    if (isDemoFigure(path, html)) result(`${path} demo has no Person assertion`, !structuredData.some(schema => schema['@type'] === 'Person'));
  } catch (error) {result(`${path} fetch`, false, {error:error.message});}
}

for (const agent of ['Bingbot/2.0', 'PerplexityBot/1.0', 'ChatGPT-User/1.0', 'Perplexity-User/1.0']) {
  const {text} = await fetchPage('/yemen-map/figures/arwa-al-sulayhi', agent);
  const head = text.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
  result(`${agent} blocking metadata`, Boolean(meta(head, 'og:title')?.includes('أروى') && /noindex/.test(meta(head, 'robots') || '') === (preview || isDemoFigure('/yemen-map/figures/arwa-al-sulayhi', text))));
}

const robots = await fetchPage('/robots.txt');
result('robots.txt serves text', robots.status === 200 && robots.headers.get('content-type')?.includes('text/plain'));
result('robots deployment policy', preview ? /Disallow: \/\s*(?:$|\n)/.test(robots.text) && !robots.text.includes('Sitemap:') : robots.text.includes(`Sitemap: ${origin}/sitemap.xml`) && robots.text.includes('User-Agent: OAI-SearchBot') && robots.text.includes('Disallow: /admin'));
result('sitemap serves XML', sitemap.status === 200 && sitemap.headers.get('content-type')?.includes('xml'));
result('sitemap canonical and excludes examples/private routes', preview ? sitemapUrls.length === 0 : sitemapUrls.length >= 8 && sitemapUrls.every(url => url.startsWith(origin + '/') && !/\/(?:admin|search|demo)(?:\/|$)/.test(url) && !url.includes('/magazine/demo')));
const guide = await fetchPage('/llms.txt');
result('optional AI reading guide', guide.status === 200 && guide.headers.get('content-type')?.includes('text/plain') && guide.text.includes(origin + '/sitemap.xml') && !guide.text.includes('/admin'));
const demoPdf = await fetch(base + '/demo/967-demo.pdf');
result('demo PDF noindex header', demoPdf.ok && /noindex/i.test(demoPdf.headers.get('x-robots-tag') || ''));
for (const path of ['/missing-seo-test-route', '/works/missing-seo-test', '/magazine/missing-seo-test', '/professionals/missing-seo-test', '/yemeni-products/missing-seo-test', '/yemen-in-numbers/indicator/missing-seo-test', '/yemen-map/figures/missing-seo-test']) {
  const response = await fetchPage(path);
  result(`${path} genuine 404`, response.status === 404, {status:response.status});
}
const failed = checks.filter(check => !check.passed);
const report = {checkedAt:new Date().toISOString(), base, preview, checks:checks.length, passed:checks.length - failed.length, failed:failed.length, results:checks};
await mkdir('docs/audit/evidence', {recursive:true});
await writeFile(process.env.SEO_EVIDENCE_FILE || 'docs/audit/evidence/seo-http-after.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({checks:checks.length, passed:report.passed, failed:failed.length, failures:failed}, null, 2));
process.exitCode = failed.length ? 1 : 0;

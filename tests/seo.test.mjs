import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SITE_ORIGIN, absoluteMediaUrl, buildSitemap, detailPath, getSiteOrigin, pageMetadata, robotsPolicy, siteUrl} from '../lib/seo.js';
import {figureSchema, indicatorSchema, issueSchema, serializeJsonLd, siteSchema, workSchema} from '../lib/seo-schema.js';

const production = {NODE_ENV: 'production', VERCEL_ENV: 'production'};

test('canonical origin rejects local, malformed, credentialed and non-root values', () => {
  for (const value of ['', 'bad url', 'http://localhost:3000', 'https://127.0.0.1', 'https://example.com/path', 'https://name:secret@example.com', 'https://example.com?tracking=1']) {
    assert.equal(getSiteOrigin({...production, NEXT_PUBLIC_SITE_URL: value}), DEFAULT_SITE_ORIGIN, value);
  }
  assert.equal(getSiteOrigin({...production, NEXT_PUBLIC_SITE_URL: 'https://www.example.org/'}), 'https://www.example.org');
  assert.equal(getSiteOrigin({VERCEL_ENV:'preview', VERCEL_URL:'branch.example.vercel.app', NEXT_PUBLIC_SITE_URL:'https://branch.example.vercel.app'}), DEFAULT_SITE_ORIGIN);
});

test('canonical filters are stripped and untrusted paths cannot change origin', () => {
  assert.equal(siteUrl('/works?topic=a#video', production), `${DEFAULT_SITE_ORIGIN}/works`);
  assert.equal(new URL(siteUrl('//other.example/path', production)).origin, DEFAULT_SITE_ORIGIN);
  for (const path of ['/\\evil.example', '\\\\evil.example/path', '/\n\\evil.example/path', '\t//evil.example/path', 'https://evil.example/path']) {
    assert.equal(new URL(siteUrl(path, production)).origin, DEFAULT_SITE_ORIGIN, path);
  }
  assert.equal(detailPath('works', 'اسم/جزء?x=1'), '/works/' + encodeURIComponent('اسم/جزء?x=1'));
  assert.equal(absoluteMediaUrl('javascript:alert(1)'), undefined);
});

test('each page gets matching canonical, social title, description and Arabic locale', () => {
  const metadata = pageMetadata({title:'الأعمال الإعلامية', description:'وصف الصفحة', path:'/works'}, production);
  assert.equal(metadata.alternates.canonical, `${DEFAULT_SITE_ORIGIN}/works`);
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
  assert.equal(metadata.openGraph.description, 'وصف الصفحة');
  assert.equal(metadata.twitter.description, 'وصف الصفحة');
  assert.equal(metadata.openGraph.locale, 'ar_YE');
  assert.ok(metadata.twitter.title.includes('الأعمال الإعلامية'));
  assert.equal(metadata.robots.index, true);
});

test('missing or whitespace-only CMS metadata gets truthful site defaults', () => {
  for (const description of ['', ' \n ', null, undefined]) {
    const metadata = pageMetadata({title:' ', description, path:'/magazine/issue'}, production);
    assert.equal(metadata.title, 'مبادرة 967');
    assert.ok(metadata.description.length > 20);
    assert.equal(metadata.openGraph.description, metadata.description);
    assert.equal(metadata.twitter.description, metadata.description);
  }
});

test('preview and development never inherit index permission from production metadata', () => {
  for (const env of [{NODE_ENV:'development'}, {NODE_ENV:'production', VERCEL_ENV:'preview'}, {VERCEL_ENV:'development'}]) {
    assert.equal(pageMetadata({title:'صفحة'}, env).robots.index, false);
    assert.deepEqual(robotsPolicy(env), {rules:[{userAgent:'*', disallow:'/'}]});
    assert.deepEqual(buildSitemap({}, env), []);
  }
  assert.equal(pageMetadata({title:'نموذج', noindex:true}, production).robots.index, false);
});

test('search crawler groups preserve private exclusions without changing training policy', () => {
  const policy = robotsPolicy(production);
  assert.equal(policy.sitemap, `${DEFAULT_SITE_ORIGIN}/sitemap.xml`);
  for (const group of policy.rules) assert.deepEqual(group.disallow, ['/admin', '/api/', '/account', '/school/dashboard', '/login', '/register', '/forgot-password', '/update-password', '/auth/']);
  assert.ok(policy.rules.some(group => Array.isArray(group.userAgent) && group.userAgent.includes('OAI-SearchBot') && group.userAgent.includes('PerplexityBot')));
  assert.ok(!JSON.stringify(policy).includes('GPTBot'));
  assert.ok(!JSON.stringify(policy).includes('Google-Extended'));
});

test('sitemap includes published canonical details, skips demo, draft and empty domains', () => {
  const result = buildSitemap({
    statSections:[{domains:[{slug:'populated'}, {slug:'empty'}]}],
    statIndicators:[{slug:'indicator', name:'مؤشر', definition:'تعريف', domain:{slug:'populated'}, updated_at:'invalid'}],
    figures:[{slug:'real'}, {slug:'demo', isDemo:true}],
    works:[{slug:'real'}, {slug:'demo', is_demo:true}, {slug:'draft', is_published:false}],
    issues:[{slug:'real', issue_date:'2025-01-02'}, {slug:'demo', is_demo:true}],
    professionals:[{id:'real'}, {id:'demo', isDemo:true}],
    companies:[{id:'شركة يمنية'}, {id:'demo', isDemo:true}],
  }, production);
  const urls = result.map(item => item.url);
  assert.ok(urls.includes(`${DEFAULT_SITE_ORIGIN}/yemen-in-numbers/populated`));
  assert.ok(!urls.some(url => url.endsWith('/empty') || url.endsWith('/demo') || url.endsWith('/draft') || url.includes('/admin') || url.includes('/search')));
  assert.ok(urls.includes(`${DEFAULT_SITE_ORIGIN}/yemeni-products/${encodeURIComponent('شركة يمنية')}`));
  assert.ok(urls.includes(`${DEFAULT_SITE_ORIGIN}/yemeni-figures`));
  assert.ok(urls.includes(`${DEFAULT_SITE_ORIGIN}/yemeni-figures/real`));
  assert.ok(!urls.includes(`${DEFAULT_SITE_ORIGIN}/yemen-map/figures/real`));
  assert.ok(!Object.hasOwn(result.find(item => item.url.endsWith('/indicator/indicator')), 'lastModified'));
  assert.equal(result.find(item => item.url.endsWith('/magazine/real')).lastModified, '2025-01-02T00:00:00.000Z');
  assert.equal(new Set(urls).size, urls.length);
});

test('JSON-LD cannot terminate its script element with CMS text', () => {
  const text = '</script><img src=x onerror=alert(1)>\u2028';
  const serialized = serializeJsonLd({name:text});
  assert.ok(!serialized.includes('<'));
  assert.deepEqual(JSON.parse(serialized), {name:text});
});

test('organization identity uses only supplied visible settings and public links', () => {
  const graph = siteSchema({aboutDescription:'تعريف حقيقي', instagram:'https://instagram.com/yemen967_', youtube:'', facebook:null, tiktok:''})['@graph'];
  assert.equal(graph[0].description, 'تعريف حقيقي');
  assert.deepEqual(graph[0].sameAs, ['https://instagram.com/yemen967_']);
  assert.equal(graph[1]['@type'], 'WebSite');
  assert.ok(!JSON.stringify(graph).includes('award'));
});

test('demo figures do not emit Person identity and year-only dates are omitted', () => {
  const figure = {slug:'figure', fullName:'شخصية', shortBio:'سيرة', birthYear:'1940', deathYear:'2020'};
  assert.equal(figureSchema({...figure,isDemo:true}), null);
  const schema = figureSchema(figure);
  assert.equal(schema['@type'], 'Person');
  assert.ok(!Object.hasOwn(schema, 'birthDate'));
  assert.ok(!Object.hasOwn(schema, 'deathDate'));
  assert.ok(!Object.hasOwn(schema, 'nationality'));
});

test('magazine schema models actual issues and does not invent publication dates', () => {
  assert.equal(issueSchema({is_demo:true}), null);
  const schema = issueSchema({slug:'issue', title:'عدد', number:1});
  assert.equal(schema['@type'], 'PublicationIssue');
  assert.equal(schema.datePublished, undefined);
});

test('VideoObject requires an actual video, description, image and publication date', () => {
  const work = {slug:'video', title:'فيديو', summary:'وصف', external_url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ', published_at:'2025-01-02'};
  assert.equal(workSchema({...work,published_at:null}), null);
  assert.equal(workSchema({...work,summary:''}), null);
  assert.equal(workSchema({...work,is_demo:true}), null);
  assert.equal(workSchema({...work,external_url:'https://example.com/article'}), null);
  const schema = workSchema(work);
  assert.equal(schema['@type'], 'VideoObject');
  assert.equal(schema.uploadDate, '2025-01-02T00:00:00.000Z');
  assert.match(schema.embedUrl, /^https:\/\/www.youtube-nocookie.com\/embed\//);
});

test('Dataset is withheld for missing data, missing sources or a conflicting series', () => {
  const indicator = {slug:'population', name:'السكان', definition:'تعريف المؤشر الوطني وسلسلة القياس المنشورة مع توضيح النطاق الجغرافي وحدود القراءة والمقارنة.', measurement_method:'منهجية موضحة', unit:'نسمة', values:[{year:2020,value:0,source:{name:'مصدر',url:'https://source.example.org/series'}}]};
  assert.equal(indicatorSchema({...indicator, values:[]}), null);
  assert.equal(indicatorSchema({...indicator, hasSourceConflict:true}), null);
  assert.equal(indicatorSchema({...indicator, values:[{year:2020,value:0}]}), null);
  assert.equal(indicatorSchema({...indicator, measurement_method:''}), null);
  assert.equal(indicatorSchema({...indicator, definition:'ن'.repeat(5001)}), null);
  const schema = indicatorSchema(indicator);
  assert.equal(schema['@type'], 'Dataset');
  assert.equal(schema.temporalCoverage, '2020/2020');
  assert.equal(schema.variableMeasured.unitText, 'نسمة');
  assert.ok(!Object.hasOwn(schema, 'license'));
  assert.ok(!Object.hasOwn(schema, 'creator'));
});

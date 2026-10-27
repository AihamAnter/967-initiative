import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('figures have their own knowledge route without an embedded atlas directory',()=>{
 const header=read('components/Header.jsx');
 const atlas=read('components/yemen-map/YemenDiscovery.jsx');
 const figures=read('app/yemeni-figures/page.jsx');
 const listing=read('components/yemen-map/YemeniFiguresDirectory.jsx');
 const legacy=read('app/yemen-map/figures/[slug]/page.jsx');
 assert.ok(header.includes("['/yemeni-figures', 'شخصيات يمنية']"));
 assert.ok(!atlas.includes('figures-directory-shell'));
 assert.ok(!atlas.includes("fetch('/api/figures'"));
 assert.ok(figures.includes('getYemeniFigures'));
 assert.ok(listing.includes("'/yemeni-figures/'"));
 assert.ok(legacy.includes('permanentRedirect'));
 assert.ok(read('app/yemeni-figures/[slug]/page.jsx').includes("detailPath('yemeni-figures'"));
});

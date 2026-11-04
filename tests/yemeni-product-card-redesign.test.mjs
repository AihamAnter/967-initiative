import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const component=read('components/YemeniProductDirectory.jsx');
const css=read('components/YemeniProductDirectory.module.css');

test('cards use a full-width top image above company information',()=>{
  assert.match(component,/function CompanyCard\(\{company,returnTo\}\)/);
  assert.match(component,/<div className=\{styles\.media\}>/);
  assert.match(component,/<div className=\{styles\.content\}>/);
  assert.ok(component.indexOf('className={styles.media}')<component.indexOf('className={styles.content}'));
  assert.match(css,/\.directory \.card:global\(\.company-card\)/);
  assert.match(css,/flex-direction:column/);
  assert.match(css,/grid-template-columns:none/);
  assert.match(css,/aspect-ratio:16\/10/);
});
test('single and two results never switch to a horizontal photo-on-side layout',()=>{
  assert.match(component,/className=\{\x60company-grid \$\{styles\.grid\}\x60\}/);
  assert.doesNotMatch(component,/results-count-/);
  assert.match(css,/\.directory \.grid:global\(\.company-grid\)/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:1100px\)/);
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
});
test('keeps company identity, category, location and verification honest',()=>{
  assert.match(component,/company\.name/);
  assert.match(component,/company\.summary/);
  assert.match(component,/company\.category/);
  assert.match(component,/company\.location/);
  assert.match(component,/company\.scale/);
  assert.match(component,/company\.isDemo/);
  assert.match(component,/company\.isVerified/);
  assert.match(component,/شركة موثقة/);
  assert.match(component,/نموذج تجريبي/);
  assert.match(component,/صورة توضيحية — ليست صورة الشركة/);
  assert.match(component,/company\.imageUrl\?/);
});
test('product chips are limited to three with a truthful remaining count',()=>{
  assert.match(component,/company\.products\.slice\(0,3\)/);
  assert.match(component,/company\.products\.length-shownProducts\.length/);
  assert.match(component,/shownProducts\.map\(/);
  assert.match(component,/remainingProducts>0/);
});
test('full-card navigation and independent saved control remain usable',()=>{
  assert.match(component,/className=\{\x60company-card \$\{styles\.card\}\x60\}/);
  assert.match(component,/\?from='\+encodeURIComponent\(returnTo\)/);
  assert.match(component,/<SaveForLater compact item=/);
  assert.match(component,/<\/Link>\s*<div className="card-save-action">/);
  assert.match(css,/position:absolute/);
  assert.match(css,/focus-visible/);
});
test('search, sector, governorate, pagination and filters remain present',()=>{
  for(const keyword of ['matchesSearch','setCategory','setLocation','setQuery','ActiveFilters','clearFilters','Pagination','listStateSearch']){
    assert.ok(component.includes(keyword),keyword);
  }
  assert.match(component,/results\.slice\(\(currentPage-1\)\*12,currentPage\*12\)/);
});
test('dark mode tokens and reduced-motion accessibility are respected',()=>{
  assert.match(css,/var\(--c-surface\)/);
  assert.match(css,/var\(--c-ink\)/);
  assert.match(css,/var\(--c-accent\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

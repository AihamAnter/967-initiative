import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('header uses only the logo as visible brand on phones and desktop',()=>{
 const header=read('components/Header.jsx');
 const css=read('app/foundation/shell.css');
 assert.match(header,/<Link href="\/" className="ed-brand" onClick=\{close\} aria-label="مبادرة 967 — الرئيسية"><BrandLogo priority className="ed-brand-mark"\/><\/Link>/);
 assert.doesNotMatch(header,/ed-brand-name/);
 assert.doesNotMatch(css,/ed-brand-name/);
 assert.match(css,/\.ed-brand \.brand-logo\.ed-brand-mark \{ width: 36px !important/);
 assert.match(css,/\.ed-header-inner > \.ed-mobile-menu-toggle \{ display: inline-flex/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('debate page shows the two sides around «ضد» from the participants data', () => {
  const page = read('app/debates/[slug]/page.jsx');
  assert.ok(page.includes("d.participants.length===2&&<div className=\"debate-versus\" aria-label=\"طرفا المناظرة\">"));
  assert.ok(page.includes("<span className=\"debate-versus-vs\" aria-hidden=\"true\">ضد</span>"));
  assert.ok(page.includes("href={'/debates/speakers/'+p.speaker.slug}"));
  // The full participants list, voting and discussion all stay.
  for (const token of ['id="participants"', '<DebateInteraction debate={d}/>', 'href="#discussion"', 'href="#polls"'])
    assert.ok(page.includes(token), token);
});

test('lists read as rows or compact grids on phones', () => {
  const css = read('app/foundation/sections.css');
  for (const token of [':root:root .debate-card:not(.debate-card-featured) {', '.ed-media-grid:not([data-count="1"]) { grid-template-columns: repeat(2', ':root:root .institution-grid {', ':root:root .institution-facts {', ':root:root .debate-versus {'])
    assert.ok(css.includes(token), token);
  assert.ok(read('app/layout.jsx').includes("import './foundation/sections.css';"));
});

test('Arabic dates and numbers use Western digits everywhere', () => {
  for (const file of ['components/InstitutionDetail.jsx', 'components/admin/ContributionsDashboard.jsx']) {
    const source = read(file);
    assert.ok(!/'ar-YE'/.test(source), file);
    assert.ok(source.includes("'ar-YE-u-nu-latn'"), file);
  }
});

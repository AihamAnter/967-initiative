// Builds research input for the Yemen-map enrichment: every district with its governorate, area,
// CSO 2025 population estimate (OCHA/HDX) and neighbouring districts computed from shared boundary points.
// Usage: node scripts/build-map-research-input.mjs <path-to-yem_population_projection_2025_final_hxl.csv>
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {reviewedDistrictProfiles} from '../lib/reviewedDistrictProfiles.js';

const boundaries = JSON.parse(readFileSync(new URL('../public/data/yemen-map/yemen-boundaries.json', import.meta.url), 'utf8'));
const csv = readFileSync(process.argv[2], 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(2).filter(Boolean);
const population = new Map(csv.map(line => line.split(',').map(cell => cell.trim())).map(cells => [cells[3], Number(cells[4])]));

const points = district => {
  const rings = district.geometry.type === 'Polygon' ? [district.geometry.coordinates] : district.geometry.coordinates;
  return rings.flat(1).flat(1);
};
const keyOf = ([lng, lat]) => `${lng.toFixed(3)},${lat.toFixed(3)}`;
const owners = new Map();
for (const district of boundaries.districts) {
  for (const point of points(district)) {
    const key = keyOf(point);
    if (!owners.has(key)) owners.set(key, new Set());
    owners.get(key).add(district.id);
  }
}
const neighbours = new Map(boundaries.districts.map(d => [d.id, new Set()]));
for (const ids of owners.values()) for (const a of ids) for (const b of ids) if (a !== b) neighbours.get(a).add(b);
const byId = new Map(boundaries.districts.map(d => [d.id, d]));

const rows = boundaries.districts.map(d => ({
  id: d.id, name_ar: d.nameAr, name_en: d.nameEn, governorate_ar: d.governorateNameAr, governorate_en: d.governorateNameEn,
  area_km2: d.areaKm2, population_2025: population.get(d.id) ?? null,
  neighbours: [...neighbours.get(d.id)].map(id => byId.get(id)).map(n => n.governorateId === d.governorateId ? n.nameAr : `${n.nameAr} (${n.governorateNameAr})`),
  already_reviewed: Boolean(reviewedDistrictProfiles[d.id]),
}));
mkdirSync(new URL('../data/yemen-map/', import.meta.url), {recursive: true});
writeFileSync(new URL('../data/yemen-map/districts-research-input.json', import.meta.url), JSON.stringify(rows, null, 1));
const gov = {};
for (const row of rows) { const g = row.id.slice(0, 4); gov[g] = (gov[g] || 0) + (row.population_2025 || 0); }
writeFileSync(new URL('../data/yemen-map/governorate-population-2025.json', import.meta.url), JSON.stringify(gov, null, 1));
console.log('districts', rows.length, 'with population', rows.filter(r => r.population_2025).length, 'reviewed', rows.filter(r => r.already_reviewed).length, 'no neighbours', rows.filter(r => !r.neighbours.length).length);

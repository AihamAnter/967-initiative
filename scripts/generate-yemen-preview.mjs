// Static, dependency-free preview from the same boundaries used by the atlas.
// Run with: node scripts/generate-yemen-preview.mjs
import {readFile, writeFile} from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../public/data/yemen-map/yemen-boundaries.json', import.meta.url), 'utf8'));
const ring = points => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(3)},${(-y).toFixed(3)}`).join(' ') + 'Z';
const path = geometry => (geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat()).map(ring).join(' ');
const [west, south, east, north] = data.country.bounds;
const width = east - west, height = north - south, pad = .35;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${west-pad} ${-north-pad} ${width+pad*2} ${height+pad*2}" fill="none">
<!-- Derived from public/data/yemen-map/yemen-boundaries.json; geometry and islands preserved. -->
<path d="${path(data.country.geometry)}" fill="#dce6d8" stroke="#66846b" stroke-width=".025"/>
${data.governorates.map((region, i) => `<path d="${path(region.geometry)}" fill="${['#bfd2bc','#cbdcc4','#d7e2cf','#b3cdc2'][i%4]}" stroke="#f7f4ec" stroke-width=".025" stroke-linejoin="round"/>`).join('\n')}
</svg>\n`;
await writeFile(new URL('../public/images/yemen-preview.svg', import.meta.url), svg);
console.log(`Yemen preview: ${Buffer.byteLength(svg)} bytes, ${data.governorates.length} governorates, original bounds retained.`);

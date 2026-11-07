// يبني خريطة محافظات اليمن المبسطة لدروس مدرسة 967 (الإصدار الثاني) من ملف الحدود الكامل.
// node scripts/build-school-v2-map.mjs  →  public/data/school-v2/yemen-governorates.json
import {readFileSync, writeFileSync} from 'node:fs';

const src = JSON.parse(readFileSync('public/data/yemen-map/yemen-boundaries.json', 'utf8'));
const W = 600, PAD = 8, TOL = 0.6; // عرض الإطار، الهامش، دقة التبسيط بالبكسل
const lat0 = 15.5 * Math.PI / 180, kx = Math.cos(lat0);
const rings = g => g.geometry.type === 'Polygon' ? g.geometry.coordinates : g.geometry.coordinates.flat();
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const g of src.governorates) for (const ring of rings(g)) for (const [lon, lat] of ring) {
  const x = lon * kx, y = -lat; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
}
const scale = (W - 2 * PAD) / (maxX - minX), H = Math.round((maxY - minY) * scale + 2 * PAD);
const project = ([lon, lat]) => [PAD + (lon * kx - minX) * scale, PAD + (-lat - minY) * scale];

function simplify(points, tol) { // Douglas–Peucker
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length); keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); const [ax, ay] = points[a], [bx, by] = points[b];
    let best = -1, dist = 0; const len = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - points[i][1]) - (ax - points[i][0]) * (by - ay)) / len; if (d > dist) { dist = d; best = i; } }
    if (dist > tol) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return points.filter((_, i) => keep[i]);
}
// الحلقة مغلقة (أولها = آخرها)، فنقسمها عند أبعد نقطة عن البداية ونبسط النصفين.
function simplifyRing(ring, tol) {
  let far = 0, best = -1;
  ring.forEach(([x, y], i) => { const d = Math.hypot(x - ring[0][0], y - ring[0][1]); if (d > best) { best = d; far = i; } });
  return [...simplify(ring.slice(0, far + 1), tol).slice(0, -1), ...simplify(ring.slice(far), tol)];
}
// أسماء المحافظات بالإملاء الصحيح (الملف المصدر بلا همزات ولا تاء مربوطة).
const NAMES = {YE11: 'إب', YE12: 'أبين', YE13: 'أمانة العاصمة', YE14: 'البيضاء', YE15: 'تعز', YE16: 'الجوف', YE17: 'حجة', YE18: 'الحديدة', YE19: 'حضرموت', YE20: 'ذمار', YE21: 'شبوة', YE22: 'صعدة', YE23: 'صنعاء', YE24: 'عدن', YE25: 'لحج', YE26: 'مأرب', YE27: 'المحويت', YE28: 'المهرة', YE29: 'عمران', YE30: 'الضالع', YE31: 'ريمة', YE32: 'سقطرى'};
const r1 = n => Math.round(n * 10) / 10;
const governorates = src.governorates.map(g => {
  const d = rings(g).map(ring => simplifyRing(ring.map(project), TOL)).filter(r => r.length >= 4)
    .map(r => 'M' + r.map(([x, y]) => r1(x) + ' ' + r1(y)).join('L') + 'Z').join('');
  const [cx, cy] = project(g.center);
  if (!NAMES[g.pcode]) throw Error('missing name ' + g.pcode);
  return {id: g.pcode, nameAr: NAMES[g.pcode], d, cx: r1(cx), cy: r1(cy)};
}).sort((a, b) => a.id.localeCompare(b.id));
const out = {source: src.source, viewBox: `0 0 ${W} ${H}`, governorates};
writeFileSync('public/data/school-v2/yemen-governorates.json', JSON.stringify(out));
console.log('governorates', governorates.length, 'bytes', JSON.stringify(out).length, 'viewBox', out.viewBox);

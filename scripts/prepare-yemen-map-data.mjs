import fs from 'node:fs';
import path from 'node:path';

const sourceDir = path.join(process.cwd(), 'data/yemen-map/source/geojson');
const outputDir = path.join(process.cwd(), 'public/data/yemen-map');
const outputFile = path.join(outputDir, 'yemen-boundaries.json');

const files = {
  adm0: path.join(sourceDir, 'yem_admin0.geojson'),
  adm1: path.join(sourceDir, 'yem_admin1.geojson'),
  adm2: path.join(sourceDir, 'yem_admin2.geojson'),
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function round(value) {
  return Number(value.toFixed(5));
}

function sqDistanceToSegment(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  let dx = x2 - x1;
  let dy = y2 - y1;
  if (dx !== 0 || dy !== 0) {
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    dx = x - (x1 + t * dx);
    dy = y - (y1 + t * dy);
  } else {
    dx = x - x1;
    dy = y - y1;
  }
  return dx * dx + dy * dy;
}

function rdp(points, first, last, sqTolerance, simplified) {
  let maxSqDistance = sqTolerance;
  let index = -1;
  for (let i = first + 1; i < last; i += 1) {
    const sqDistance = sqDistanceToSegment(points[i], points[first], points[last]);
    if (sqDistance > maxSqDistance) {
      index = i;
      maxSqDistance = sqDistance;
    }
  }
  if (index > -1) {
    if (index - first > 1) rdp(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1) rdp(points, index, last, sqTolerance, simplified);
  }
}

function simplifyRing(ring, tolerance) {
  if (ring.length <= 5) return ring.map(([x, y]) => [round(x), round(y)]);
  const open = ring.slice(0, -1);
  const simplified = [open[0]];
  rdp(open, 0, open.length - 1, tolerance * tolerance, simplified);
  simplified.push(open[open.length - 1]);
  const clean = simplified.map(([x, y]) => [round(x), round(y)]);
  clean.push(clean[0]);
  return clean.length >= 4 ? clean : ring.map(([x, y]) => [round(x), round(y)]);
}

function simplifyGeometry(geometry, tolerance) {
  if (!geometry) return geometry;
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map(ring => simplifyRing(ring, tolerance)),
    };
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map(poly => poly.map(ring => simplifyRing(ring, tolerance))),
    };
  }
  return geometry;
}

function boundsForGeometry(geometry, bounds = [Infinity, Infinity, -Infinity, -Infinity]) {
  function visit(coords) {
    if (typeof coords[0] === 'number') {
      const [lon, lat] = coords;
      bounds[0] = Math.min(bounds[0], lon);
      bounds[1] = Math.min(bounds[1], lat);
      bounds[2] = Math.max(bounds[2], lon);
      bounds[3] = Math.max(bounds[3], lat);
      return;
    }
    coords.forEach(visit);
  }
  visit(geometry.coordinates);
  return bounds;
}

function normalizeGovernorate(feature) {
  const p = feature.properties;
  const geometry = simplifyGeometry(feature.geometry, 0.004);
  return {
    id: p.adm1_pcode,
    nameAr: p.adm1_name1 || p.adm1_name,
    nameEn: p.adm1_name,
    pcode: p.adm1_pcode,
    areaKm2: p.area_sqkm ? Math.round(p.area_sqkm) : null,
    center: [p.center_lon, p.center_lat],
    validOn: p.valid_on,
    geometry,
    bounds: boundsForGeometry(geometry),
  };
}

function normalizeDistrict(feature) {
  const p = feature.properties;
  const geometry = simplifyGeometry(feature.geometry, 0.0045);
  return {
    id: p.adm2_pcode,
    governorateId: p.adm1_pcode,
    nameAr: p.adm2_name1 || p.adm2_name,
    nameEn: p.adm2_name,
    pcode: p.adm2_pcode,
    governorateNameAr: p.adm1_name1 || p.adm1_name,
    governorateNameEn: p.adm1_name,
    areaKm2: p.area_sqkm ? Math.round(p.area_sqkm) : null,
    center: [p.center_lon, p.center_lat],
    validOn: p.valid_on,
    geometry,
    bounds: boundsForGeometry(geometry),
  };
}

const adm0 = readJson(files.adm0).features[0];
const governorates = readJson(files.adm1).features.map(normalizeGovernorate);
const districts = readJson(files.adm2).features.map(normalizeDistrict);
const districtCounts = districts.reduce((counts, district) => {
  counts[district.governorateId] = (counts[district.governorateId] || 0) + 1;
  return counts;
}, {});

for (const governorate of governorates) {
  governorate.districtCount = districtCounts[governorate.id] || 0;
}

const adm0Geometry = simplifyGeometry(adm0.geometry, 0.004);
const payload = {
  source: {
    title: 'Yemen administrative level 0-2 boundaries (COD-AB)',
    provider: 'OCHA Field Information Services Section (FISS) / HDX',
    originalSource: 'Central Statistical Organization (CSO), Yemen',
    dataset: 'cod-ab-yem',
    resource: 'yem_admin_boundaries.geojson.zip',
    license: 'Creative Commons Attribution for Intergovernmental Organisations (CC BY-IGO)',
    licenseUrl: 'http://creativecommons.org/licenses/by/3.0/igo/legalcode',
    validOn: adm0.properties.valid_on,
    version: adm0.properties.version,
    reviewedForAccuracy: '2024-12-23',
  },
  country: {
    id: adm0.properties.adm0_pcode,
    nameAr: adm0.properties.adm0_name1,
    nameEn: adm0.properties.adm0_name,
    areaKm2: adm0.properties.area_sqkm ? Math.round(adm0.properties.area_sqkm) : null,
    center: [adm0.properties.center_lon, adm0.properties.center_lat],
    geometry: adm0Geometry,
    bounds: boundsForGeometry(adm0Geometry),
  },
  governorates,
  districts,
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(payload));
console.log(`Wrote ${outputFile}`);
console.log(`${governorates.length} governorates, ${districts.length} districts`);

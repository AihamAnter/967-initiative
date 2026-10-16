export function normalizeArabic(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

export function boundsToViewBox(bounds, padding = 0.08) {
  const [minLon, minLat, maxLon, maxLat] = bounds;
  const width = maxLon - minLon;
  const height = maxLat - minLat;
  const padX = width * padding;
  const padY = height * padding;
  return {
    x: minLon - padX,
    y: -maxLat - padY,
    width: width + padX * 2,
    height: height + padY * 2,
  };
}

export function mergeBounds(items) {
  return items.reduce(
    (bounds, item) => [
      Math.min(bounds[0], item.bounds[0]),
      Math.min(bounds[1], item.bounds[1]),
      Math.max(bounds[2], item.bounds[2]),
      Math.max(bounds[3], item.bounds[3]),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}

export function viewBoxToString(viewBox) {
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
}

function ringPath(ring) {
  return ring.map(([lon, lat], index) => `${index ? 'L' : 'M'}${lon},${-lat}`).join(' ') + ' Z';
}

export function geometryToPath(geometry) {
  if (!geometry) return '';
  if (geometry.type === 'Polygon') return geometry.coordinates.map(ringPath).join(' ');
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flatMap(poly => poly.map(ringPath)).join(' ');
  return '';
}

export function formatNumber(value) {
  return formatLatinNumber(value) || 'البيانات غير متوفرة حاليًا';
}

export function screenToSvgPoint(svg, event, viewBox) {
  return mapScreenPoint(svg.getBoundingClientRect(), event, viewBox);
}

export {zoomMapViewport as zoomViewBox} from '@/lib/mapViewport';
import {formatNumber as formatLatinNumber} from '@/lib/format';
import {mapScreenPoint} from '@/lib/mapViewport';


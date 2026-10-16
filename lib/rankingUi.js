import {toLatinDigits} from './format.js';

export function rankingLocation(search, indicators, fallback = {}) {
  const params = new URLSearchParams(search);
  const slug = params.get('indicator');
  const indicator = indicators.find(item => item.slug === slug) || indicators.find(item => item.slug === fallback.indicator) || indicators[0];
  const rawYear = toLatinDigits(params.get('year') || fallback.year || '');
  const year = /^\d{4}$/.test(rawYear) && Number(rawYear) >= 1900 && Number(rawYear) <= 2200 ? Number(rawYear) : null;
  const compare = String(params.get('compare') || fallback.compare || '').toUpperCase();
  return {indicator: indicator?.slug || '', year, scope: params.get('scope') === 'arab' ? 'arab' : 'world', compare: /^[A-Z]{3}$/.test(compare) && compare !== 'YEM' ? compare : ''};
}

export function rankingSharePath(selection) {
  const params = new URLSearchParams();
  if (selection.indicator) params.set('indicator', selection.indicator);
  if (Number.isInteger(selection.year)) params.set('year', String(selection.year));
  params.set('scope', selection.scope === 'arab' ? 'arab' : 'world');
  if (/^[A-Z]{3}$/.test(selection.compare || '') && selection.compare !== 'YEM') params.set('compare', selection.compare);
  return '/yemen-ranking?' + params.toString();
}

export function rankingBarGeometry(rows) {
  const values = rows.map(item => item.value).filter(value => typeof value === 'number' && Number.isFinite(value));
  const min = Math.min(0, ...values), max = Math.max(0, ...values);
  const extent = max - min;
  const baseline = extent ? -min / extent * 100 : 0;
  return {baseline, bars: Object.fromEntries(rows.map(item => {
    const valid = typeof item.value === 'number' && Number.isFinite(item.value);
    const width = valid && extent ? Math.abs(item.value) / extent * 100 : 0;
    return [item.code, {left: item.value < 0 ? baseline - width : baseline, width}];
  }))};
}

export function rankingHistoryPoints(values, width = 700, height = 150) {
  const byYear = new Map();
  for (const item of values || []) {
    if (item.country === 'YEM' && Number.isInteger(Number(item.year)) && typeof item.value === 'number' && Number.isFinite(item.value)) byYear.set(Number(item.year), {year: Number(item.year), value: item.value});
  }
  const points = [...byYear.values()].sort((a, b) => a.year - b.year);
  if (!points.length) return [];
  const start = points[0].year, end = points.at(-1).year;
  const low = Math.min(...points.map(item => item.value)), high = Math.max(...points.map(item => item.value));
  return points.map(item => ({...item, x: 12 + (end === start ? .5 : (item.year - start) / (end - start)) * (width - 24), y: 12 + (high === low ? .5 : (high - item.value) / (high - low)) * (height - 24)}));
}

import {getLastCompletedYear, isRankingCode, validateRankingDataset} from './rankings.js';

const origin = 'https://api.worldbank.org';
const arabCountries = new Set(['DZA', 'BHR', 'COM', 'DJI', 'EGY', 'IRQ', 'JOR', 'KWT', 'LBN', 'LBY', 'MRT', 'MAR', 'OMN', 'PSE', 'QAT', 'SAU', 'SOM', 'SDN', 'SYR', 'TUN', 'ARE', 'YEM']);
const countryNames = new Intl.DisplayNames(['ar'], {type: 'region'});

async function fetchPage(pathname, parameters, page, signal) {
  const url = new URL(pathname, origin);
  // Paths and query fields are assembled here, never supplied as user URLs.
  if (url.origin !== origin || !url.pathname.startsWith('/v2/')) throw new Error('مصدر غير مسموح.');
  url.search = new URLSearchParams({...parameters, format: 'json', per_page: '10000', page: String(page)}).toString();
  const response = await fetch(url, {signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), redirect: 'error', headers: {Accept: 'application/json'}, cache: 'no-store'});
  if (!response.ok) throw new Error(`تعذر الاتصال بالبنك الدولي (${response.status}).`);
  if (Number(response.headers.get('content-length') || 0) > 8000000) throw new Error('استجابة المصدر أكبر من الحد الآمن.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('استجابة المصدر فارغة.');
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const {value, done} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 8000000) { await reader.cancel(); throw new Error('استجابة المصدر أكبر من الحد الآمن.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let result;
  try { result = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)); }
  catch { throw new Error('استجابة البنك الدولي ليست JSON صالحاً.'); }
  if (!Array.isArray(result) || result.length !== 2 || !result[0] || !Array.isArray(result[1])) throw new Error('استجابة البنك الدولي غير مكتملة أو المؤشر غير متاح.');
  const header = result[0];
  const pages = Number(header.pages), total = Number(header.total);
  if (Number(header.page) !== page || !Number.isInteger(pages) || pages < 1 || pages > 30 || !Number.isInteger(total) || total < 0 || total > 100000 || (total > 0 && result[1].length === 0)) throw new Error('ترقيم صفحات المصدر غير صالح.');
  return {header, rows: result[1], pages, total};
}

async function fetchPages(pathname, parameters = {}, signal) {
  const first = await fetchPage(pathname, parameters, 1, signal);
  const rows = [...first.rows];
  for (let page = 2; page <= first.pages; page++) {
    const next = await fetchPage(pathname, parameters, page, signal);
    if (next.pages !== first.pages || next.total !== first.total || (first.header.lastupdated && next.header.lastupdated !== first.header.lastupdated)) throw new Error('تغيرت بيانات المصدر أثناء التحميل. أعد المحاولة.');
    rows.push(...next.rows);
    if (rows.length > first.total) throw new Error('عدد سجلات المصدر غير متسق.');
  }
  if (rows.length !== first.total) throw new Error('لم تُحمّل جميع صفحات المصدر.');
  return {rows, header: first.header};
}

export async function fetchWorldBankDataset(code, {fromYear = 2000, toYear = getLastCompletedYear()} = {}) {
  if (!isRankingCode(code)) throw new Error('رمز مؤشر البنك الدولي غير صالح.');
  if (!Number.isInteger(fromYear) || !Number.isInteger(toYear) || fromYear < 1960 || toYear > getLastCompletedYear() || fromYear > toYear || toYear - fromYear > 100) throw new Error('نطاق السنوات غير صالح.');
  const deadline = AbortSignal.timeout(45000);
  const [metadata, countryData, observations] = await Promise.all([
    fetchPages(`/v2/indicator/${code}`, {source: '2'}, deadline),
    fetchPages('/v2/country', {}, deadline),
    fetchPages(`/v2/country/all/indicator/${code}`, {source: '2', date: `${fromYear}:${toYear}`}, deadline),
  ]);
  const indicator = metadata.rows.find(item => item.id === code && String(item.source?.id) === '2');
  if (!indicator) throw new Error('هذا الرمز غير متاح ضمن مؤشرات التنمية العالمية (WDI).');
  const countries = countryData.rows.filter(country => country.region?.id && country.region.id !== 'NA' && /^[A-Z]{3}$/.test(country.id) && /^[A-Z]{2}$/.test(country.iso2Code)).map(country => ({
    code: country.id, iso2: country.iso2Code,
    name: country.id === 'YEM' ? 'اليمن' : (countryNames.of(country.iso2Code) || country.name),
    arab: arabCountries.has(country.id),
  })).sort((a, b) => a.code.localeCompare(b.code));
  const available = new Map(countries.map(country => [country.code, country]));
  const iso2 = new Map(countries.map(country => [country.iso2, country.code]));
  const values = [];
  for (const row of observations.rows) {
    if (row.indicator?.id !== code) throw new Error('المصدر أعاد رمز مؤشر غير متوقع.');
    const country = row.countryiso3code || iso2.get(row.country?.id);
    const year = /^\d{4}$/.test(String(row.date)) ? Number(row.date) : NaN;
    if (!available.has(country) || !Number.isInteger(year) || year < fromYear || year > toYear || typeof row.value !== 'number' || !Number.isFinite(row.value)) continue;
    values.push({country, year, value: row.value});
  }
  values.sort((a, b) => a.country.localeCompare(b.country) || a.year - b.year);
  const dataset = {version: 1, indicatorCode: code, source: {
    name: 'البنك الدولي — مؤشرات التنمية العالمية (WDI)', url: `https://data.worldbank.org/indicator/${code}`, updatedAt: observations.header.lastupdated || null,
    sourceOrganization: typeof indicator.sourceOrganization === 'string' ? indicator.sourceOrganization : '',
    sourceNote: typeof indicator.sourceNote === 'string' ? indicator.sourceNote : '',
  }, fetchedAt: new Date().toISOString(), fromYear, toYear, countries, values};
  return validateRankingDataset(dataset, code);
}

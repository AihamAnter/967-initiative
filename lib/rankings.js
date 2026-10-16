const scopes = new Set(['world', 'arab']);
const directions = new Set(['asc', 'desc']);

export function getLastCompletedYear(now = new Date()) { return now.getUTCFullYear() - 1; }
export function isRankingCode(value) { return typeof value === 'string' && /^[A-Z0-9][A-Z0-9_.]{1,79}$/.test(value); }
export function isRankingSlug(value) { return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100; }

// A snapshot is one indicator's historical observations. Never accept implicit
// conversions (null/'' become zero), duplicate country-years, or future years.
export function validateRankingDataset(dataset, expectedCode, now = new Date()) {
  const lastYear = getLastCompletedYear(now);
  if (!dataset || dataset.version !== 1 || !isRankingCode(dataset.indicatorCode) || (expectedCode && dataset.indicatorCode !== expectedCode)) throw new Error('رمز بيانات الترتيب لا يطابق المؤشر.');
  if (!Number.isInteger(dataset.fromYear) || !Number.isInteger(dataset.toYear) || dataset.fromYear < 1960 || dataset.toYear > lastYear || dataset.fromYear > dataset.toYear) throw new Error('نطاق سنوات الترتيب غير صالح.');
  if (!dataset.source || typeof dataset.source.name !== 'string' || !dataset.source.name.trim() || typeof dataset.source.url !== 'string' || !dataset.source.url.startsWith('https://data.worldbank.org/indicator/')) throw new Error('مصدر بيانات الترتيب غير صالح.');
  try {
    const source = new URL(dataset.source.url);
    if (source.origin !== 'https://data.worldbank.org' || source.username || source.password || source.pathname !== `/indicator/${dataset.indicatorCode}` || source.search || source.hash) throw new Error();
  } catch { throw new Error('رابط مصدر بيانات الترتيب غير صالح.'); }
  if (typeof dataset.fetchedAt !== 'string' || !Number.isFinite(Date.parse(dataset.fetchedAt))) throw new Error('تاريخ جلب الترتيب غير صالح.');
  if (dataset.source.updatedAt !== null && dataset.source.updatedAt !== undefined && (typeof dataset.source.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataset.source.updatedAt) || !Number.isFinite(Date.parse(dataset.source.updatedAt)))) throw new Error('تاريخ تحديث المصدر غير صالح.');
  for (const field of ['sourceOrganization', 'sourceNote']) if (dataset.source[field] !== undefined && (typeof dataset.source[field] !== 'string' || dataset.source[field].length > 30000)) throw new Error('وصف مصدر الترتيب غير صالح.');
  if (!Array.isArray(dataset.countries) || !dataset.countries.length || dataset.countries.length > 300 || !Array.isArray(dataset.values) || dataset.values.length > 30000) throw new Error('حجم بيانات الترتيب غير صالح.');
  const countryCodes = new Set();
  for (const country of dataset.countries) {
    if (!country || !/^[A-Z]{3}$/.test(country.code) || !/^[A-Z]{2}$/.test(country.iso2) || typeof country.name !== 'string' || !country.name.trim() || country.name.length > 150 || typeof country.arab !== 'boolean' || countryCodes.has(country.code)) throw new Error('بيانات البلدان غير صالحة أو متكررة.');
    countryCodes.add(country.code);
  }
  const observations = new Set();
  for (const observation of dataset.values) {
    const key = `${observation?.country}:${observation?.year}`;
    if (!countryCodes.has(observation?.country) || !Number.isInteger(observation?.year) || observation.year < dataset.fromYear || observation.year > dataset.toYear || typeof observation.value !== 'number' || !Number.isFinite(observation.value) || observations.has(key)) throw new Error('قيم الترتيب غير صالحة أو متكررة.');
    observations.add(key);
  }
  return dataset;
}

export function getRankingYears(dataset) {
  validateRankingDataset(dataset);
  return [...new Set(dataset.values.map(item => item.year))].sort((a, b) => b - a);
}

export function getDefaultRankingYear(dataset) {
  validateRankingDataset(dataset);
  const years = dataset.values.filter(item => item.country === 'YEM').map(item => item.year);
  return years.length ? Math.max(...years) : null;
}

export function buildRanking(dataset, {year, scope = 'world', direction = 'desc'} = {}) {
  validateRankingDataset(dataset);
  if (!Number.isInteger(year) || year < dataset.fromYear || year > dataset.toYear || !scopes.has(scope) || !directions.has(direction)) throw new Error('خيارات الترتيب غير صالحة.');
  const countries = new Map(dataset.countries.filter(country => scope === 'world' || country.arab).map(country => [country.code, country]));
  const rows = dataset.values.filter(item => item.year === year && countries.has(item.country)).map(item => ({code: item.country, name: countries.get(item.country).name, value: item.value}));
  const order = direction === 'desc' ? -1 : 1;
  // Country codes are ASCII. Avoid locale/ICU ordering differences between the
  // server and browsers for equal values, which otherwise break hydration.
  rows.sort((a, b) => order * (a.value - b.value) || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  const counts = new Map();
  for (const row of rows) counts.set(row.value, (counts.get(row.value) || 0) + 1);
  let rank = 0;
  return rows.map((row, index) => {
    if (!index || row.value !== rows[index - 1].value) rank = index + 1;
    return {...row, rank, tieCount: counts.get(row.value)};
  });
}

export function getYemenNeighborhood(rows, before = 2, after = 2) {
  if (!Array.isArray(rows) || !Number.isInteger(before) || !Number.isInteger(after) || before < 0 || after < 0 || before + after > 100) throw new Error('خيارات الجوار غير صالحة.');
  const index = rows.findIndex(row => row.code === 'YEM');
  if (index === -1) return [];
  const count = before + after + 1;
  const start = Math.max(0, Math.min(index - before, rows.length - count));
  return rows.slice(start, start + count);
}

export function getRankingSnapshotSummary(dataset, updatedAt = dataset?.fetchedAt) {
  validateRankingDataset(dataset);
  return {updatedAt, fromYear: dataset.fromYear, toYear: dataset.toYear, countryCount: new Set(dataset.values.map(item => item.country)).size, valueCount: dataset.values.length, latestYemenYear: getDefaultRankingYear(dataset), sourceUpdatedAt: dataset.source.updatedAt ?? null};
}

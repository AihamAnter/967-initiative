const easternArabicDigits = /[٠-٩۰-۹]/g;

export function toLatinDigits(value) {
  return String(value ?? '').replace(easternArabicDigits, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

export function formatNumber(value, options) {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  const normalized = Number(toLatinDigits(value));
  if (!Number.isFinite(normalized)) return '';
  return new Intl.NumberFormat('en-US-u-nu-latn', {...options, numberingSystem:'latn'}).format(normalized);
}

export function formatArabicDate(value, options = {year: 'numeric', month: 'long', day: 'numeric'}) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-YE-u-nu-latn', {...options, numberingSystem:'latn'}).format(date);
}

export function formatYear(value) {
  const year = Number(toLatinDigits(value));
  return value !== null && value !== undefined && String(value).trim() && Number.isInteger(year) ? String(year) : '';
}

// Label-first counts avoid incorrect Arabic singular/dual/plural constructions.
export function formatCount(value, label = 'النتائج') {
  return `${label}: ${formatNumber(value)}`;
}

// Large values read better rounded: 42,961,653 → "43 مليون", 21,606,160,663 → "21.6 مليار".
// Small values keep their exact form. Western digits, as everywhere on the site.
export function formatCompact(value) {
  const n = Number(toLatinDigits(value));
  if (value === null || value === undefined || String(value).trim() === '' || !Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  const scaled = (divisor, word) => {
    const v = n / divisor;
    return formatNumber(v, {maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1}) + ' ' + word;
  };
  if (abs >= 1e9) return scaled(1e9, 'مليار');
  if (abs >= 1e6) return scaled(1e6, 'مليون');
  return formatNumber(n, {maximumFractionDigits: abs >= 100 ? 0 : 2});
}

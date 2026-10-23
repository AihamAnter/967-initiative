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

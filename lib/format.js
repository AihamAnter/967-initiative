const easternArabicDigits = /[٠-٩۰-۹]/g;

export function toLatinDigits(value) {
  return String(value ?? '').replace(easternArabicDigits, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

export function formatNumber(value, options) {
  const normalized = Number(toLatinDigits(value));
  if (!Number.isFinite(normalized)) return '';
  return new Intl.NumberFormat('en-US-u-nu-latn', options).format(normalized);
}

export function formatArabicDate(value, options = {year: 'numeric', month: 'long', day: 'numeric'}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-YE-u-nu-latn', options).format(date);
}

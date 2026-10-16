import {toLatinDigits} from './format.js';

// Arabic books open with a cover, followed by facing pages 2/3, 4/5, …
export function normalisePdfPage(value, count, spread = false) {
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const requested = Number(toLatinDigits(value));
  if (!Number.isInteger(requested) || !Number.isInteger(count) || count < 1) return null;
  const page = Math.min(count, Math.max(1, requested));
  return spread && page > 1 && page % 2 !== 0 ? page - 1 : page;
}

export function facingPdfPages(start, count, spread) {
  if (!count) return {};
  const page = normalisePdfPage(start, count, spread) || 1;
  if (!spread) return {single: page};
  if (page === 1) return {left: 1, right: null};
  return {left: page + 1 <= count ? page + 1 : null, right: page};
}

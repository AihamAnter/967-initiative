import {READING_KINDS, readingPathInfo} from './readingList.js';

// "Continue where you left off" for guests: the last few public detail pages
// opened on this device. Stored only in this browser (localStorage), never sent
// to the server, and clearable from the home page.
export const RECENT_TRAIL_KEY = '967-recent-trail-v1';
export const RECENT_TRAIL_LIMIT = 6;
const DETAIL_KINDS = new Set(['work', 'issue', 'figure', 'history', 'company', 'professional', 'indicator', 'university', 'medicalCenter', 'domain', 'speaker', 'debate']);

export function recentTrailEntry(pathname, documentTitle, now = Date.now()) {
  const info = readingPathInfo(pathname);
  if (!info || !DETAIL_KINDS.has(info.kind)) return null;
  const title = String(documentTitle || '').replace(/\s*\|\s*مبادرة 967\s*$/, '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160);
  if (!title || title === 'الصفحة غير موجودة' || title.startsWith('مبادرة 967 |')) return null;
  return {href: info.path, kind: info.kind, label: READING_KINDS[info.kind], title, at: now};
}

export function parseRecentTrail(serialized) {
  try {
    const items = JSON.parse(serialized || '[]');
    if (!Array.isArray(items)) return [];
    return items.filter(item => item && typeof item.href === 'string' && readingPathInfo(item.href)?.path === item.href && typeof item.title === 'string' && Number.isFinite(item.at))
      .map(item => ({href: item.href, kind: readingPathInfo(item.href).kind, label: READING_KINDS[readingPathInfo(item.href).kind], title: item.title.slice(0, 160), at: item.at}))
      .slice(0, RECENT_TRAIL_LIMIT);
  } catch {return [];}
}

export function addToRecentTrail(items, entry) {
  if (!entry) return items;
  return [entry, ...items.filter(item => item.href !== entry.href)].slice(0, RECENT_TRAIL_LIMIT);
}

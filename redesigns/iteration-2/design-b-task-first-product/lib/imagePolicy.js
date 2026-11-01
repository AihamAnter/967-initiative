// One remote-image policy shared by next.config.mjs (optimizer allowlist) and
// render-time checks. A URL is only handed to the optimizer when it matches the
// same protocol + host + path pattern that next.config allows; anything else is
// rendered unoptimized or replaced by a placeholder, so a bad editorial URL can
// never throw inside next/image and take down a page.

const STATIC_PATTERNS = [
  {protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**'},
  {protocol: 'https', hostname: 'commons.wikimedia.org', pathname: '/wiki/Special:FilePath/**'},
  {protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/wikipedia/commons/**'},
];

export function imageRemotePatterns(supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const patterns = [...STATIC_PATTERNS];
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      patterns.push({protocol: url.protocol.replace(':', ''), hostname: url.hostname, pathname: '/storage/v1/object/public/**'});
    } catch { /* An invalid env URL simply adds no pattern. */ }
  }
  return patterns;
}

function pathMatches(pattern, pathname) {
  const prefix = pattern.endsWith('/**') ? pattern.slice(0, -2) : null;
  return prefix ? pathname.startsWith(prefix) : pathname === pattern;
}

/** 'local' | 'optimize' | 'direct' | null (unsafe / unusable). */
export function imageDelivery(value, patterns = imageRemotePatterns()) {
  if (typeof value !== 'string') return null;
  const src = value.trim();
  if (!src || /[\u0000-\u001f\\]/.test(src)) return null;
  if (src.startsWith('/') && !src.startsWith('//')) return 'local';
  let url;
  try { url = new URL(src); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const allowed = patterns.some(pattern => pattern.protocol + ':' === url.protocol && pattern.hostname === url.hostname && !pattern.port && pathMatches(pattern.pathname, url.pathname));
  return allowed ? 'optimize' : 'direct';
}

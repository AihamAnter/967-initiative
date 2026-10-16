/**
 * Recognise supported public media URLs without trusting the submitted URL as
 * an iframe source. Only embed URLs assembled for known providers are used.
 */
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com']);
const TIKTOK_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const FACEBOOK_HOSTS = new Set(['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.watch']);

export function safeExternalUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function parseMediaUrl(value) {
  const externalUrl = safeExternalUrl(value);
  if (!externalUrl) return {kind: 'external', embedUrl: null, thumbnailUrl: null, externalUrl: null, ratio: 'landscape'};
  const url = new URL(externalUrl);
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);

  if (YOUTUBE_HOSTS.has(host)) {
    const id = host.endsWith('youtu.be') ? parts[0] : (parts[0] === 'watch' ? url.searchParams.get('v') : ['shorts', 'live', 'embed', 'v'].includes(parts[0]) ? parts[1] : null);
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return {
        kind: 'youtube', externalUrl, ratio: 'landscape',
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`,
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    }
  }

  if (INSTAGRAM_HOSTS.has(host) && ['reel', 'p', 'tv'].includes(parts[0]) && /^[a-zA-Z0-9_-]{5,30}$/.test(parts[1] || '')) {
    return {
      kind: 'instagram', externalUrl, ratio: 'portrait', thumbnailUrl: null,
      embedUrl: `https://www.instagram.com/${parts[0]}/${parts[1]}/embed/`,
    };
  }

  const tikTokIndex = parts.findIndex(p => p === 'video');
  if (TIKTOK_HOSTS.has(host) && tikTokIndex !== -1 && /^\d{12,25}$/.test(parts[tikTokIndex + 1] || '')) {
    return {
      kind: 'tiktok', externalUrl, ratio: 'portrait', thumbnailUrl: null,
      embedUrl: `https://www.tiktok.com/embed/v2/${parts[tikTokIndex + 1]}`,
    };
  }

  const vimeoId = parts[0] === 'video' ? parts[1] : parts[0];
  if (VIMEO_HOSTS.has(host) && /^\d{5,15}$/.test(vimeoId || '')) {
    return {
      kind: 'vimeo', externalUrl, ratio: 'landscape', thumbnailUrl: null,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
    };
  }

  if (FACEBOOK_HOSTS.has(host) && host !== 'fb.watch' &&
      ((parts.includes('videos') && /^\d+$/.test(parts[parts.indexOf('videos') + 1] || '')) ||
      (parts[0] === 'watch' && /^\d+$/.test(url.searchParams.get('v') || '')))) {
    // Facebook requires its official plugin URL; its availability depends on
    // whether the original post is public and allows embedding.
    const canonical = new URL(externalUrl);
    canonical.protocol = 'https:';
    return {
      kind: 'facebook', externalUrl, ratio: 'landscape', thumbnailUrl: null,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(canonical.href)}&show_text=false`,
    };
  }

  if (/\.mp4$/i.test(url.pathname)) {
    return {kind: 'video', externalUrl, ratio: 'landscape', thumbnailUrl: null, embedUrl: externalUrl};
  }
  return {kind: 'external', externalUrl, ratio: 'landscape', thumbnailUrl: null, embedUrl: null};
}

export function mediaLabel(kind) {
  return {
    youtube: 'يوتيوب', instagram: 'إنستغرام', tiktok: 'تيك توك',
    vimeo: 'فيميو', facebook: 'فيسبوك', video: 'فيديو', external: 'المنصة الأصلية',
  }[kind] || 'فيديو';
}

export function workThumbnail(work) {
  const explicit = safeExternalUrl(work?.thumbnail_url);
  if (explicit) return explicit;
  return parseMediaUrl(work?.external_url).thumbnailUrl;
}

export function canOptimizeImage(value) {
  if (typeof value !== 'string') return false;
  if (value.startsWith('/')) return true;
  try {
    const host = new URL(value).hostname;
    return host === 'i.ytimg.com' || (process.env.NEXT_PUBLIC_SUPABASE_URL && host === new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname);
  } catch {return false;}
}

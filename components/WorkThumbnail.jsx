'use client';

import SafeImage from './front/SafeImage';

// Leave the editorial fallback visible if a provider removes its thumbnail.
// Shares SafeImage's URL policy and ref-based error handling (no duplicate download).
export default function WorkThumbnail({src, priority = false, sizes = '(max-width:600px) 95vw, (max-width:1000px) 46vw, 420px', className, quality = 75}) {
  return <SafeImage src={src} priority={priority} sizes={sizes} className={className} quality={quality}/>;
}

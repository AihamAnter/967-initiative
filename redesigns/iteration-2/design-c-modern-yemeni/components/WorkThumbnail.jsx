'use client';

import Image from 'next/image';
import {useState} from 'react';
import {canOptimizeImage} from '@/lib/media';

// Leave the editorial fallback visible if a provider removes its thumbnail.
export default function WorkThumbnail({src, priority = false, sizes = '(max-width:600px) 95vw, (max-width:1000px) 46vw, 420px',className}) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (failedSrc === src) return null;
  return <Image overrideSrc={canOptimizeImage(src)?'/_next/image?url='+encodeURIComponent(src)+'&w=828&q=75':undefined} src={src} alt="" fill priority={priority} sizes={sizes} className={className} unoptimized={!canOptimizeImage(src)} onError={() => setFailedSrc(src)}/>;
}

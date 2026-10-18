'use client';

import Image from 'next/image';
import {useState} from 'react';
import {canOptimizeImage} from '@/lib/media';

// Leave the editorial fallback visible if a provider removes its thumbnail.
export default function WorkThumbnail({src}) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (failedSrc === src) return null;
  return <Image src={src} alt="" fill sizes="(max-width:600px) 95vw, (max-width:1000px) 46vw, 420px" unoptimized={!canOptimizeImage(src)} onError={() => setFailedSrc(src)}/>;
}

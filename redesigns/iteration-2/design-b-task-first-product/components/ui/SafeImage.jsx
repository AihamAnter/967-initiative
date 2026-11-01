'use client';
import Image from 'next/image';
import {useState} from 'react';
import {imageDelivery} from '@/lib/imagePolicy';

// next/image behind the shared host/path policy. An unsafe URL never reaches
// the optimizer (which would throw during render) and a failed request falls
// back to the caller's placeholder. Either way only this card is affected.
export default function SafeImage({src, alt = '', fallback = null, ...props}) {
  const [failed, setFailed] = useState(null);
  const delivery = imageDelivery(src);
  if (!delivery || failed === src) return fallback;
  return <Image src={src.trim()} alt={alt} unoptimized={delivery === 'direct'} onError={() => setFailed(src)} {...props}/>;
}

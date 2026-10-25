'use client';
import Image from 'next/image';
import {useState} from 'react';
import {safeImageUrl} from '@/lib/media';
import styles from './ProfileAvatar.module.css';

// The adjacent heading supplies the accessible name. A failed external photo
// becomes initials rather than a broken image or an unrelated stock portrait.
export default function ProfileAvatar({name, src, imagePosition = 'center', className = ''}) {
  const [failedSrc, setFailedSrc] = useState(null);
  const image = safeImageUrl(src);
  const initials = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word.charAt(0)).join(' ');
  const showImage = Boolean(image && failedSrc !== image);
  return <span className={`${styles.avatar} ${className}`} aria-hidden="true" data-avatar-state={showImage ? 'image' : 'initials'}>
    {showImage ? <Image src={image} alt="" fill unoptimized sizes="96px" style={{objectPosition:imagePosition}} onError={()=>setFailedSrc(image)}/> : initials}
  </span>;
}

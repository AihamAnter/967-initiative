'use client';

import {useState} from 'react';

/** Official/attributed third-party marks are shown directly from their source.
 * A broken or hotlink-protected URL falls back to the existing category icon.
 */
export default function InstitutionLogo({src,name,children,maxSize=64}) {
 const [failed,setFailed]=useState(false);
 if (!src||failed) return children;
 return <img
  src={src}
  alt={`شعار ${name}`}
  loading="lazy"
  decoding="async"
  referrerPolicy="no-referrer"
  onError={()=>setFailed(true)}
  style={{display:'block',width:'100%',height:'100%',maxWidth:maxSize,maxHeight:maxSize,objectFit:'contain'}}
 />;
}

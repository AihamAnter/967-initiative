'use client';
import Image from 'next/image';
import {useState} from 'react';
import {safeImageUrl,canOptimizeImage} from '@/lib/media';
export default function SafeImage({src,...props}){
 const [failed,setFailed]=useState(null);
 const safe=safeImageUrl(src);
 if(!safe||failed===safe)return <span role="img" aria-label={props.alt||'الصورة غير متاحة'}>967</span>;
 return <Image {...props} overrideSrc={canOptimizeImage(safe)?'/_next/image?url='+encodeURIComponent(safe)+'&w=640&q=75':undefined} src={safe} unoptimized={!canOptimizeImage(safe)} onError={()=>setFailed(safe)}/>;
}

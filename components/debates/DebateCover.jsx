'use client';
import './DebateCover.css';
import Image from 'next/image';
import {useState} from 'react';
import DebateLogo from './DebateLogo';
import {httpsUrl} from '@/lib/debates';

export default function DebateCover({url,title='',eager=false}){
 const [failed,setFailed]=useState(null),[loaded,setLoaded]=useState(null),src=httpsUrl(url),showImage=src&&failed!==src;
 return <div className="debate-cover" data-cover-state={showImage?(loaded===src?'image':'loading'):'fallback'}><div className="debate-cover-placeholder"><DebateLogo decorative priority={eager} sizes="(max-width: 600px) 96px, 128px"/><span>نختلف لنفهم.</span></div>{showImage&&<Image unoptimized width={1280} height={720} referrerPolicy="no-referrer" src={src} alt={title?'غلاف المناظرة: '+title:''} priority={eager} onLoad={()=>setLoaded(src)} onError={()=>setFailed(src)}/>}</div>;
}

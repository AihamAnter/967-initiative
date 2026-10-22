'use client';
import Image from 'next/image';
import {useState} from 'react';
import {MessagesSquare} from 'lucide-react';
import {httpsUrl} from '@/lib/debates';

export default function DebateCover({url,title='',eager=false}){
 const [failed,setFailed]=useState(null),src=httpsUrl(url);
 return <div className="debate-cover" data-cover-state={src&&failed!==src?'image':'fallback'}>{src&&failed!==src?<Image unoptimized width={1280} height={720} referrerPolicy="no-referrer" src={src} alt={title?'غلاف المناظرة: '+title:''} loading={eager?'eager':'lazy'} onError={()=>setFailed(src)}/>:<div className="debate-cover-placeholder"><MessagesSquare size={48} strokeWidth={1} aria-hidden="true"/><span>نختلف لنفهم.</span></div>}</div>;
}

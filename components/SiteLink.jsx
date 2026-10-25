'use client';
import {forwardRef} from 'react';
import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {usePageVisibility} from './PageVisibilityProvider';
import {contextualHref} from '@/lib/navigationContext';

const SiteLink=forwardRef(function SiteLink({href,...props},ref){
 const {isVisible}=usePageVisibility();
 const pathname=usePathname(),search=useSearchParams().toString(),source=(pathname||'')+(search?'?'+search:'');
 const path=typeof href==='string'?href:href?.pathname;
 return !path||isVisible(path)?<Link ref={ref} href={contextualHref(href,source)} {...props}/>:null;
});
export default SiteLink;

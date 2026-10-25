'use client';
import {forwardRef} from 'react';
import Link from 'next/link';
import {usePageVisibility} from './PageVisibilityProvider';

const SiteLink=forwardRef(function SiteLink({href,...props},ref){
 const {isVisible}=usePageVisibility();
 const path=typeof href==='string'?href:href?.pathname;
 return !path||isVisible(path)?<Link ref={ref} href={href} {...props}/>:null;
});
export default SiteLink;

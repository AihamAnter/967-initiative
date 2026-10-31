'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {pageViewBucket} from '@/lib/siteAnalytics';
import {usePageVisibility} from '@/components/PageVisibilityProvider';

function trackingAllowed(){
 return typeof navigator!=='undefined'&&navigator.doNotTrack!=='1'&&navigator.globalPrivacyControl!==true;
}
export function reportSiteUsage(event,section){
 if(!trackingAllowed()||typeof document==='undefined'||document.visibilityState==='hidden')return;
 fetch('/api/analytics/event',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({event,section}),credentials:'omit',keepalive:true
 }).catch(()=>{/* Analytics must never block navigation. */});
}
// Aggregate categories, not URLs. No cookies, cross-page identifier or page titles.
export default function SiteUsageTracker(){
 const pathname=usePathname();
 const {isVisible}=usePageVisibility();
 useEffect(()=>{
  if(!isVisible(pathname))return;
  const section=pageViewBucket(pathname);
  if(!section)return;
  reportSiteUsage('page_view',section);
 },[pathname,isVisible]);
 return null;
}
export function SearchMissTracker({category='all'}){
 useEffect(()=>{
  reportSiteUsage('search_miss',category);
 },[category]);
 return null;
}

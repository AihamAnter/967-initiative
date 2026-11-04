'use client';
import {audienceRequest} from '@/components/debates/useAudience';

export function fetchNotifications({mode='summary',category='all',page=1}={}){
 const params=new URLSearchParams({mode,category,page:String(page)});
 return audienceRequest('/api/notifications?'+params.toString());
}
export async function markNotification(source,id){
 const result=await audienceRequest('/api/notifications',{action:'read',source,id});
 if(typeof window!=='undefined')window.dispatchEvent(new Event('967:notifications-changed'));
 return result;
}
export async function markNotificationsRead(){
 const result=await audienceRequest('/api/notifications',{action:'read_all'});
 if(typeof window!=='undefined')window.dispatchEvent(new Event('967:notifications-changed'));
 return result;
}

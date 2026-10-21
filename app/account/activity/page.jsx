import AudienceAccount from '@/components/debates/AudienceAccount';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata({title:'حساب المستخدم',path:'/account/activity',noindex:true,nofollow:true});
export default function Page(){return <AudienceAccount activity={true}/>;}

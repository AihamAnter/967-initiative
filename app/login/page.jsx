import AudienceAuth from '@/components/debates/AudienceAuth';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata({title:'تسجيل الدخول',path:'/login',noindex:true,nofollow:true});
export default function Page(){return <AudienceAuth mode="login"/>;}

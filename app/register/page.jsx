import AudienceAuth from '@/components/debates/AudienceAuth';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata({title:'إنشاء حساب',path:'/register',noindex:true,nofollow:true});
export default function Page(){return <AudienceAuth mode="register"/>;}

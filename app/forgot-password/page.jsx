import AudienceAuth from '@/components/debates/AudienceAuth';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata({title:'استعادة كلمة المرور',path:'/forgot-password',noindex:true,nofollow:true});
export default function Page(){return <AudienceAuth mode="forgot"/>;}

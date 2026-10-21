import AudienceAuth from '@/components/debates/AudienceAuth';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata({title:'تأكيد الحساب',path:'/auth/callback',noindex:true,nofollow:true});
export default function Page(){return <AudienceAuth mode="callback"/>;}

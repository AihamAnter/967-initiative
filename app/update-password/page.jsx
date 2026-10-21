import AudienceAuth from '@/components/debates/AudienceAuth';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata({title:'تحديث كلمة المرور',path:'/update-password',noindex:true,nofollow:true});
export default function Page(){return <AudienceAuth mode="update"/>;}

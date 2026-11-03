import MemberReports from '@/components/admin/MemberReports';
import {pageMetadata} from '@/lib/seo';
export const metadata={...pageMetadata({title:'بلاغات حسابات المستخدمين | إدارة 967',path:'/admin/member-reports',noindex:true,nofollow:true}),referrer:'no-referrer'};
export default function Page(){return <MemberReports/>;}

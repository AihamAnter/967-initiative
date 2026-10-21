import DebateAdmin from '@/components/debates/DebateAdmin';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata({title:'إدارة المناظرات',path:'/admin/debates',noindex:true,nofollow:true});
export default function Page(){return <DebateAdmin/>;}

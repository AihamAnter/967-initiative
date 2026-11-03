import ManagementUsersDashboard from '@/components/admin/ManagementUsersDashboard';
import {pageMetadata} from '@/lib/seo';

export const metadata={...pageMetadata({
 title:'المستخدمين | إدارة 967',
 description:'إدارة حسابات مستخدمي منصة 967.',
 path:'/admin/users',
 noindex:true,nofollow:true
}),referrer:'no-referrer'};

export default function ManagementUsersPage(){return <ManagementUsersDashboard/>;}

import MessageReports from '@/components/admin/MessageReports';
import {pageMetadata} from '@/lib/seo';
export const metadata={...pageMetadata({title:'بلاغات الرسائل | إدارة 967',description:'مراجعة بلاغات الرسائل الخاصة.',path:'/admin/message-reports',noindex:true,nofollow:true}),referrer:'no-referrer'};
export default function Page(){return <MessageReports/>;}

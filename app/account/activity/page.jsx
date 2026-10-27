import AccountWorkspace from '@/components/account/AccountWorkspace';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata({title:'مشاركاتي | 967',path:'/account/activity',noindex:true,nofollow:true});
export default function Page(){return <AccountWorkspace initialTab="contributions"/>;}

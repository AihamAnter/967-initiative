import AdminDashboard from '@/components/AdminDashboard';
import {pageMetadata} from '@/lib/seo';
export const metadata = pageMetadata({title:'تسجيل الدخول', description:'الدخول إلى إدارة مبادرة 967.', path:'/admin', noindex:true, nofollow:true});
export default function Admin(){return <section className="admin-page"><div className="container"><AdminDashboard/></div></section>}

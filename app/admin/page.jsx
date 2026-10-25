import EditorProtection from '@/components/admin/EditorProtection';
import AdminDashboard from '@/components/AdminDashboard';
import {pageMetadata} from '@/lib/seo';
import {ADMIN_TAB_IDS} from '@/lib/adminLists';
export const metadata = pageMetadata({title:'لوحة التحرير', description:'إدارة المحتوى والطلبات ومهام فريق مبادرة 967.', path:'/admin', noindex:true, nofollow:true});
export default async function Admin({searchParams}){const query=await searchParams;const initialTab=ADMIN_TAB_IDS.includes(query.tab)?query.tab:'issues';const initialItem=typeof query.item==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(query.item)?query.item:'';return <section className="admin-page"><div className="container"><EditorProtection><AdminDashboard initialTab={initialTab} initialItem={initialItem} initialRegion={query.region==='district'?'district':'governorate'}/></EditorProtection></div></section>}

import AdminDashboard from '@/components/AdminDashboard';
import {pageMetadata} from '@/lib/seo';
import {inlineAdminTabs} from '@/lib/inlineEditorTargets';
export const metadata = pageMetadata({title:'تسجيل الدخول', description:'الدخول إلى إدارة مبادرة 967.', path:'/admin', noindex:true, nofollow:true});
export default async function Admin({searchParams}){const query=await searchParams;const initialTab=inlineAdminTabs.has(query.tab)?query.tab:'issues';const initialItem=typeof query.item==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(query.item)?query.item:'';return <section className="admin-page"><div className="container"><AdminDashboard initialTab={initialTab} initialItem={initialItem} initialRegion={query.region==='district'?'district':'governorate'}/></div></section>}

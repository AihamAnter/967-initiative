import {notFound} from 'next/navigation';
import {getContentPages,getContentPage} from '@/lib/data';
import {contentPagePath} from '@/lib/contentPages';
import {pageMetadata} from '@/lib/seo';
import {privacyRequestTypes} from '@/lib/contributions';
import PolicyPage from './PolicyPage';
import ContentText from './ContentText';
import FaqList from './FaqList';
import ContactForm from './ContactForm';
import InlineTarget from './inline/InlineTarget';

export async function contentPageMetadata(slug){
 const page=await getContentPage(slug);if(!page)notFound();
 return pageMetadata({title:page.title,description:page.description,path:contentPagePath(page)});
}

export default async function ManagedContentPage({slug,searchParams}){
 const pages=await getContentPages(),page=pages.find(item=>item.slug===slug);if(!page)notFound();
 const availablePaths=pages.map(contentPagePath);
 const related=['privacy','terms'].includes(slug)?['privacy','terms']:['help','privacy-requests'];
 const navigation=pages.filter(item=>related.includes(item.slug)).map(item=>({href:contentPagePath(item),title:item.title}));
 const params=await searchParams||{};
 const type=privacyRequestTypes.includes(params.type)?params.type:'';
 return <PolicyPage title={page.title} description={page.description} path={contentPagePath(page)} summary={page.summary} navigation={navigation} updatedAt={page.updatedAt} showContact={page.kind!=='requests'} contactHref={availablePaths.includes('/privacy-requests')?'/privacy-requests#contribution-form':'/contribute?type=استفسار#contribution-form'}>
  <InlineTarget kind="page" id={page.id} slug={page.slug} title={page.title} href={contentPagePath(page)}/>
  {page.sections.map((section,index)=><section key={section.id}><h2>{page.kind==='article'?`${index+1}. `:''}{section.title}</h2><ContentText text={section.text} availablePaths={availablePaths}/></section>)}
  {page.kind==='faq'&&<FaqList items={page.faqs} availablePaths={availablePaths}/>}
  {page.kind==='about'&&page.team.length>0&&<section className="about-team"><h2>الطاقم ومهامهم</h2>{page.team.some(member=>member.isExample)&&<p className="team-example-note">الملفات الموسومة بالتجريبية أمثلة مؤقتة، وستُستبدل ببيانات الطاقم الحقيقية.</p>}<div className="about-team-grid">{page.team.map(member=><article className="about-team-card" key={member.id}>{member.isExample&&<span className="status-badge">بيانات تجريبية</span>}<h3>{member.name}</h3><strong>{member.role}</strong>{member.bio&&<p>{member.bio}</p>}</article>)}</div></section>}
  {page.kind==='requests'&&<section className="managed-request-form"><h2>أرسل طلبك أو بلاغك</h2><ContactForm initialType={type} types={privacyRequestTypes} typeLabel="نوع الطلب أو البلاغ" submitLabel="إرسال الطلب" draftKey="967-privacy-requests-draft-v1" privacyHref={availablePaths.includes('/privacy')?'/privacy':null}/></section>}
 </PolicyPage>;
}

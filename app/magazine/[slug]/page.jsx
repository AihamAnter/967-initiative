export const dynamic='force-dynamic';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowRight,CalendarDays,BookOpen} from 'lucide-react';
import {getIssue} from '@/lib/data';
import {formatArabicDate,formatNumber} from '@/lib/format';
import PdfReader from '@/components/PdfReader';
export async function generateMetadata({params}){const {slug}=await params;const issue=await getIssue(slug);return {title:issue?.title||'عدد غير موجود',description:issue?.summary||'',alternates:{canonical:'/magazine/'+slug},...(issue?.is_demo?{robots:{index:false,follow:false}}:{})};}
export default async function IssuePage({params}){const {slug}=await params,issue=await getIssue(slug);if(!issue)notFound();return <>
 <section className="reader-intro"><div className="container"><Link href="/magazine" className="back-link"><ArrowRight size={17}/> العودة إلى أرشيف المجلة</Link><span className="eyebrow">{issue.is_demo?'نسخة استعراضية — ليست عدداً رسمياً':`مجلة 967 / العدد ${formatNumber(issue.number)}`}</span><h1>{issue.title}</h1><p>{issue.summary}</p><span className="issue-date"><CalendarDays size={16}/>{formatArabicDate(issue.issue_date+'T12:00:00')}</span></div></section>
 <section className="reader-section"><div className="container"><PdfReader url={issue.pdf_url} title={issue.title}/></div></section>
 </>}

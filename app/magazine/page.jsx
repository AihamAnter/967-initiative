export const dynamic='force-dynamic';
import Link from 'next/link';
import {ArrowUpLeft,BookOpen,Download,CalendarDays} from 'lucide-react';
import {getIssues} from '@/lib/data';
import {demoIssue} from '@/lib/config';
import IssueGrid from '@/components/IssueGrid';
export const metadata={title:'مجلة 967 الأسبوعية',description:'اقرأ مجلة 967 اليمنية الأسبوعية مباشرة أو حمّلها بصيغة PDF. أرشيف منظم للأعداد.'};
export default async function Magazine(){const list=await getIssues(),issues=list.length?list:[demoIssue],latest=issues[0];return <>
 <section className="page-hero magazine-hero"><div className="container"><span className="eyebrow">المجلة الأسبوعية / 03</span><h1>كل أسبوع.<br/><span className="accent-word">صفحة جديدة.</span></h1><div className="page-hero-bottom"><p>قصص وملفات وتحليلات عن اليمن. مجلة تُقرأ في وقتك، وتبقى مرجعاً كلما احتجت إليها.</p><span className="page-decoration">967 / WEEKLY</span></div></div></section>
 <section className="section latest-issue"><div className="container"><div className="issue-spotlight"><div className="spotlight-cover"><img src={latest.cover_url||'/images/demo-cover.svg'} alt={'غلاف '+latest.title}/></div><div className="spotlight-copy"><span className="eyebrow">{latest.is_demo?'نسخة استعراضية للقارئ':'العدد الأخير'}</span><span className="issue-number">{latest.is_demo?'DEMO':'NO. '+String(latest.number).padStart(3,'0')}</span><h2>{latest.title}</h2><p>{latest.summary}</p><div className="spotlight-date"><CalendarDays size={16}/>{new Date(latest.issue_date+'T12:00:00').toLocaleDateString('ar-YE',{year:'numeric',month:'long',day:'numeric'})}</div><div className="spotlight-actions"><Link href={'/magazine/'+latest.slug} className="btn btn-red">اقرأ العدد <BookOpen size={18}/></Link><a className="btn btn-outline" href={latest.pdf_url} target="_blank" rel="noopener noreferrer" download>تحميل PDF <Download size={18}/></a></div></div></div></div></section>
 <section className="section archive-section"><div className="container"><IssueGrid issues={issues}/>{!list.length&&<p className="archive-note">ستظهر هنا الأعداد الحقيقية فور نشرها من لوحة الإدارة. المحتوى الحالي تجريبي فقط.</p>}</div></section>
 </>}

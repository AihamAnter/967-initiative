import Link from 'next/link';
import {pageMetadata} from '@/lib/seo';
import Image from 'next/image';
import {canOptimizeImage} from '@/lib/media';
import {BookOpen, Download, CalendarDays} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import IssueGrid from '@/components/IssueGrid';
import {getIssues} from '@/lib/data';
import {formatArabicDate,formatNumber} from '@/lib/format';
export const dynamic='force-dynamic';
export const metadata = pageMetadata({title:'مجلة 967', description:'اقرأ أحدث إصدارات مجلة 967 واستكشف أرشيف الأعداد أو حمّل نسختك بصيغة PDF.', path:'/magazine'});
export default async function Magazine() {
 const issues=await getIssues(),latest=issues[0];
 return <><PageIntro title="صفحات من الحكاية اليمنية." category="مجلة 967" description="ملفات وقصص وأفكار تقرأها في وقتك. افتح العدد من المتصفح أو احتفظ بنسختك بصيغة PDF."/>
 {latest?<section className="section latest-issue"><div className="container"><article className="issue-spotlight"><div className="spotlight-cover">{latest.cover_url?<Image src={latest.cover_url} alt={'غلاف '+latest.title} width={450} height={600} priority sizes="(max-width:760px) 80vw, 30vw" unoptimized={!canOptimizeImage(latest.cover_url)}/>:<BookOpen size={55}/>}</div><div className="spotlight-copy"><span className="eyebrow">أحدث إصدار</span><span className="issue-number">العدد {formatNumber(latest.number)}</span><h2>{latest.title}</h2>{latest.summary&&<p>{latest.summary}</p>}<time className="spotlight-date" dateTime={latest.issue_date}><CalendarDays size={16}/>{formatArabicDate(latest.issue_date)}</time>{Array.isArray(latest.contents)&&latest.contents.length>0&&<ul>{latest.contents.filter(x=>typeof x==='string').map(x=><li key={x}>{x}</li>)}</ul>}<div className="spotlight-actions"><Link className="btn btn-primary" href={'/magazine/'+latest.slug}>اقرأ العدد <BookOpen size={18}/></Link><a className="btn btn-outline" href={latest.pdf_url} download target="_blank" rel="noopener noreferrer">تحميل PDF <Download size={18}/></a></div></div></article></div></section>:<section className="section"><div className="container empty-state"><BookOpen size={34}/><h2>الإصدار القادم يبدأ من هنا.</h2><p>لم تُنشر أعداد في الأرشيف بعد.</p><Link href="/magazine/demo" className="btn btn-outline">جرّب القارئ بملف توضيحي</Link><p className="small-muted">الملف التوضيحي ليس عدداً منشوراً من المجلة.</p></div></section>}
 {issues.length>0&&<section className="section archive-section"><div className="container"><IssueGrid issues={issues}/></div></section>}</>;
}

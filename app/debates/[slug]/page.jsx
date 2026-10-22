import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getDebateCatalog,getDebateDetail} from '@/lib/debateServer';
import {DEBATE_TYPES,DEBATE_STAGES,formatDebateDateTime,SUMMARY_FIELDS,debateDateLabel,httpsUrl} from '@/lib/debates';
import {pageMetadata,siteUrl} from '@/lib/seo';
import {JsonLd,breadcrumbSchema} from '@/lib/seo-schema';
import DebateVideo from '@/components/debates/DebateVideo';
import DebateInteraction from '@/components/debates/DebateInteraction';
import DebateCard from '@/components/debates/DebateCard';
import DebateShare from '@/components/debates/DebateShare';
import DebateDisclosure from '@/components/debates/DebateDisclosure';
import InlineTarget from '@/components/inline/InlineTarget';
export async function generateMetadata({params}){const {slug}=await params,{debate:d}=await getDebateDetail(slug);return pageMetadata({title:d?.seo_title||d?.title||'المناظرة غير متاحة',description:d?.seo_description||d?.question,path:'/debates/'+slug,image:d?.cover_url,noindex:!d});}
export default async function Page({params}){
 const {slug}=await params,{debate:d,available}=await getDebateDetail(slug);
 if(!available)return <div className="container debate-account"><h1>تعذر تحميل المناظرة</h1><p>الخدمة غير متاحة حالياً. حاول مجدداً لاحقاً.</p><Link href="/debates">العودة إلى المناظرات</Link></div>;
 if(!d)notFound();
 const {debates}=await getDebateCatalog(),related=debates.filter(x=>x.id!==d.id&&x.category===d.category).slice(0,3);
 const hasRecording=d.recording_published&&httpsUrl(d.recording_url),isLive=d.debate_type==='external_live'&&d.stage==='live'&&httpsUrl(d.live_url);
 const waitingTitle=d.stage==='cancelled'?'أُلغيت هذه المناظرة':d.stage==='postponed'?'المناظرة مؤجلة':d.stage==='ended'?'انتهت المناظرة':d.publication_status==='archived'?'مناظرة مؤرشفة':d.debate_type==='prerecorded'?'التسجيل غير متاح بعد':'بانتظار بدء المناظرة';
 const videoSchema=hasRecording&&d.first_published_at&&httpsUrl(d.cover_url)?{'@context':'https://schema.org','@type':'VideoObject',name:d.title,description:d.description||d.question,thumbnailUrl:d.cover_url,uploadDate:d.first_published_at,url:siteUrl('/debates/'+d.slug),...(d.duration_seconds?{duration:'PT'+d.duration_seconds+'S'}:{})}:null;
 return <><InlineTarget kind="debate" id={d.id} slug={d.slug} title={d.title} href={'/debates/'+d.slug}/><JsonLd data={breadcrumbSchema([{name:'مناظرات 967',path:'/debates'},{name:d.title,path:'/debates/'+d.slug}])}/><JsonLd data={videoSchema}/>
  <header className="debate-detail-hero debate-detail-header"><div className="container"><div className="debate-detail-topline"><Link href="/debates" className="eyebrow">مناظرات 967</Link><div className="debate-meta"><span>{d.category}</span><span>{DEBATE_TYPES[d.debate_type]}</span><span>{DEBATE_STAGES[d.stage]}</span></div></div><h1>{d.title}</h1><div className="debate-detail-toolbar">{d.scheduled_at&&<p>{debateDateLabel(d)}: <time dateTime={d.scheduled_at}>{formatDebateDateTime(d.scheduled_at)}</time></p>}<DebateShare/></div></div></header>
  <div className="container debate-detail-content debate-detail-compact">
   {hasRecording?<DebateVideo debate={d}/>:isLive?<section id="recording" className="debate-live-callout"><span className="eyebrow">مباشر الآن</span><h2>شاهد المناظرة على {d.live_platform||'المنصة الخارجية'}</h2><a href={httpsUrl(d.live_url)} className="btn btn-primary" target="_blank" rel="noopener noreferrer">شاهد البث المباشر</a></section>:<section className="debate-watch-pending"><h2>{waitingTitle}</h2><p>{d.question}</p>{d.stage!=='cancelled'&&httpsUrl(d.live_url)&&<a href={httpsUrl(d.live_url)} target="_blank" rel="noopener noreferrer">صفحة البث على {d.live_platform||'المنصة الخارجية'}</a>}</section>}
   <nav className="debate-detail-nav" aria-label="أقسام المناظرة"><a href="#discussion">ساحة النقاش</a><a href="#polls">استطلاع الرأي والنتائج</a><a href="#participants">المشاركون</a></nav>
   <section id="participants" className="debate-participants-compact"><div className="debate-section-heading"><h2>المشاركون ومواقفهم</h2></div><div className="debate-participant-list">{d.participants.map(p=><article className="debate-participant" key={p.id}><Link className="debate-participant-identity" href={'/debates/speakers/'+p.speaker.slug}>{httpsUrl(p.speaker.photo_url)?<Image unoptimized width={52} height={52} referrerPolicy="no-referrer" src={httpsUrl(p.speaker.photo_url)} alt="" loading="lazy"/>:<span className="debate-person-avatar" aria-hidden="true">{p.speaker.name.trim().charAt(0)}</span>}<div><h3>{p.speaker.name}</h3><small>{p.role_label}{p.speaker.specialty?' · '+p.speaker.specialty:''}</small></div></Link>{p.stance&&<div><p className="debate-participant-stance">{p.stance.length>150?p.stance.slice(0,150)+String.fromCharCode(8230):p.stance}</p>{p.stance.length>150&&<details><summary>قراءة الموقف كاملاً</summary><p>{p.stance}</p></details>}</div>}</article>)}</div></section>
   <div className="debate-context-disclosures"><DebateDisclosure id="about" title="عن القضية" description="السؤال الرئيسي وخلفية الحوار"><p className="debate-context-question">{d.question}</p>{d.description&&<p className="debate-prose">{d.description}</p>}</DebateDisclosure>{d.axes.length>0&&<DebateDisclosure id="axes" title="محاور النقاش" description={d.axes.length+' محاور'}><ol>{d.axes.map(a=><li key={a}>{a}</li>)}</ol></DebateDisclosure>}</div>
   {d.summary_published&&Object.keys(d.summary).some(k=>d.summary[k])&&<DebateDisclosure id="debate-summary" title="ملخص المناظرة" description="خلاصة الحوار والمواقف"><div className="debate-summary-content">{Object.entries(SUMMARY_FIELDS).filter(([key])=>typeof d.summary[key]==='string'&&d.summary[key].trim()).map(([key,label])=><div key={key}><h3>{label}</h3><p className="debate-prose">{d.summary[key]}</p></div>)}</div></DebateDisclosure>}
   <DebateInteraction debate={d}/>
   {related.length>0&&<section><h2>حوارات ذات صلة</h2><div className="debate-grid">{related.map(x=><DebateCard debate={x} key={x.id}/>)}</div></section>}
  </div></>;
}

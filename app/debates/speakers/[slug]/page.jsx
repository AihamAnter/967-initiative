import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getDebateSpeaker} from '@/lib/debateServer';
import {pageMetadata} from '@/lib/seo';
import {httpsUrl} from '@/lib/debates';
import DebateCard from '@/components/debates/DebateCard';
export async function generateMetadata({params}){const {slug}=await params,{data}=await getDebateSpeaker(slug);return pageMetadata({title:data?.speaker.name||'ملف المناظر',description:data?.speaker.bio,path:'/debates/speakers/'+slug,image:data?.speaker.photo_url,noindex:!data});}
export default async function Page({params}){const {slug}=await params,{data,available}=await getDebateSpeaker(slug);if(!available)return <div className="container section"><h1>تعذر تحميل ملف المناظر</h1><Link href="/debates">المناظرات</Link></div>;if(!data)notFound();const s=data.speaker;return <div className="container debate-account"><Link href="/debates" className="eyebrow">مناظرات 967</Link><section className="debate-panel debate-speaker-profile">{httpsUrl(s.photo_url)&&<Image unoptimized width={960} height={540} referrerPolicy="no-referrer" src={httpsUrl(s.photo_url)} alt=""/>}<div><h1>{s.name}</h1><p>{s.specialty}</p><p className="debate-prose">{s.bio}</p><div className="debate-actions">{s.social_links?.filter(l=>httpsUrl(l.url)).map((l,i)=><a key={i} href={httpsUrl(l.url)} target="_blank" rel="noopener noreferrer">{l.label||'رابط اجتماعي'}</a>)}</div></div></section><h2>مشاركات في الحوار</h2>{data.debates.length?<div className="debate-grid">{data.debates.map(d=><DebateCard key={d.id} debate={d}/>)}</div>:<p>لا توجد مناظرات منشورة لهذا المناظر بعد.</p>}</div>;}

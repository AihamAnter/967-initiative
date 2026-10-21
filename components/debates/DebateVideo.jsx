'use client';
import Image from 'next/image';
import {useState} from 'react';
import {Play,ExternalLink} from 'lucide-react';
import {parseMediaUrl} from '@/lib/media';
import {httpsUrl} from '@/lib/debates';
export default function DebateVideo({debate}){
 const [loaded,setLoaded]=useState(false),[start,setStart]=useState(0);
 const url=httpsUrl(debate.recording_url),parsed=parseMediaUrl(url),youtube=parsed.kind==='youtube'||parsed.provider==='youtube'||parsed.embedUrl?.includes('youtube');
 const embed=youtube&&parsed.embedUrl?parsed.embedUrl.replace('www.youtube.com','www.youtube-nocookie.com').replace('youtube.com/','youtube-nocookie.com/')+(parsed.embedUrl.includes('?')?'&':'?')+'start='+start+'&autoplay=1':null;
 if(!url)return null;
 return <section className="debate-watch" id="recording">
  <div className="debate-video">{loaded&&embed?<iframe key={start} src={embed} title={'تسجيل '+debate.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen/>:<div className="debate-video-poster">{httpsUrl(debate.cover_url)&&<Image unoptimized width={960} height={540} referrerPolicy="no-referrer" src={httpsUrl(debate.cover_url)} alt="" loading="eager"/>}{embed?<button onClick={()=>setLoaded(true)} className="btn btn-primary"><Play size={22}/> تشغيل المناظرة</button>:<p>شاهد التسجيل على المنصة الأصلية عبر الرابط أدناه.</p>}</div>}</div>
  <div className="debate-watch-footer"><div><h2>تسجيل المناظرة</h2>{debate.duration_seconds&&<span>{Math.ceil(debate.duration_seconds/60)} دقيقة</span>}</div><a href={url} target="_blank" rel="noopener noreferrer">فتح على المنصة الأصلية <ExternalLink size={14}/></a></div>
  {debate.chapters?.length>0&&<details className="debate-video-chapters"><summary>فصول التسجيل <span>{debate.chapters.length}</span></summary><div className="debate-chapters">{debate.chapters.map(c=><button disabled={!embed} key={c.id} onClick={()=>{setStart(c.start_seconds);setLoaded(true);document.getElementById('recording')?.scrollIntoView({block:'start',behavior:'smooth'});}}><bdi>{Math.floor(c.start_seconds/60)}:{String(c.start_seconds%60).padStart(2,'0')}</bdi> {c.title}</button>)}</div></details>}
 </section>;
}

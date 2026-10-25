import Link from '@/components/SiteLink';
import {getDebateCatalog} from '@/lib/debateServer';
import {DEBATE_EMPTY,selectFeaturedDebate} from '@/lib/debates';
import DebateCard from './DebateCard';
import DebateLogo from './DebateLogo';
export default async function HomeDebates(){const {debates,available}=await getDebateCatalog();const d=selectFeaturedDebate(debates)||debates.filter(d=>['ended','recording_available'].includes(d.stage)).sort((a,b)=>Date.parse(b.scheduled_at||b.created_at)-Date.parse(a.scheduled_at||a.created_at))[0];return <section className="home-debates"><div className="container"><div className="debate-section-heading"><div className="debate-brand-heading"><DebateLogo decorative/><div><span className="eyebrow">مساحة يمنية للحوار</span><h2>مناظرات 967 · نختلف لنفهم.</h2></div></div><Link href="/debates" className="text-link">استكشف المناظرات</Link></div>{d?<DebateCard debate={d} featured/>:<div className="home-debate-intro"><div><h2>لكل سؤال، أكثر من زاوية.</h2><p>{available?DEBATE_EMPTY:'نجهّز مساحة مناظرات 967 للحوار والسؤال والمشاركة.'}</p></div><Link href="/debates/suggest" className="btn btn-primary">اقترح أول موضوع</Link></div>}</div></section>;}

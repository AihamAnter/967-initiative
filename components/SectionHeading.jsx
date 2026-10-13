import Link from 'next/link';
import {ArrowUpLeft} from 'lucide-react';
export default function SectionHeading({kicker,title,copy,href,linkLabel}){return <div className="section-head"><div><span className="eyebrow">{kicker}</span><h2>{title}</h2>{copy&&<p>{copy}</p>}</div>{href&&<Link href={href} className="text-link">{linkLabel||'استكشف المزيد'}<ArrowUpLeft size={18}/></Link>}</div>}

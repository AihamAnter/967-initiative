import Link from '@/components/SiteLink';
import {navSections} from '@/lib/navigation';

// Local sibling navigation for the media section (same names as the header).
export default function MediaSiblings({current}) {
  const media = navSections.find(section => section.id === 'media');
  return <nav className="ed-siblings" aria-label="أقسام الإعلام"><span>في الإعلام</span><ul>{media.links.map(([href, label]) => <li key={href}>{href === current ? <span aria-current="page">{label}</span> : <Link href={href}>{label}</Link>}</li>)}</ul></nav>;
}

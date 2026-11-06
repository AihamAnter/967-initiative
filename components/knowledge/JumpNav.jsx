import {BarChart3, BookOpenText, CalendarRange, FileText, Images, Info, Link2, ListOrdered, MapPinned, ScrollText, Table2, UsersRound} from 'lucide-react';
import styles from './JumpNav.module.css';

// A pinned row of "jump to" chips for long knowledge detail pages (app style).
// Every target is a heading or section id that already exists on the page;
// the content itself is unchanged and stays fully visible.
const ICONS = {chart: BarChart3, card: Info, table: Table2, sources: Link2, reading: BookOpenText, timeline: CalendarRange, gallery: Images, contents: ListOrdered, places: MapPinned, people: UsersRound, text: FileText, history: ScrollText};

export default function JumpNav({items, label = 'أقسام هذه الصفحة'}) {
  const list = (items || []).filter(item => item && item.href);
  if (list.length < 2) return null;
  return <nav className={styles.nav} aria-label={label}>
    <ul>{list.map(({href, title, icon}) => {
      const Icon = ICONS[icon] || FileText;
      return <li key={href}><a href={href}><Icon size={15} strokeWidth={2} aria-hidden="true"/>{title}</a></li>;
    })}</ul>
  </nav>;
}

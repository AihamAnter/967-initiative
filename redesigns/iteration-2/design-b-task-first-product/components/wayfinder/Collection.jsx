import Link from 'next/link';
import {ArrowLeft, ArrowRight, X} from 'lucide-react';
import {NAV_TASKS, isActivePath} from '@/lib/navigation';
import {formatNumber} from '@/lib/format';
import styles from './Collection.module.css';

// Compact collection/detail header: where am I (task → section), what is this,
// and the sibling destinations of the same task as one-tap tabs.
export function PageHeader({task, title, description, children, tabs = true, currentPath, isVisible = () => true, aside}) {
  const def = NAV_TASKS.find(item => item.id === task);
  const siblings = tabs && def ? def.links.filter(([href]) => !href.includes('#') && !href.includes('?') && isVisible(href)) : [];
  return <header className={styles.header} data-task={task}>
    <div className={styles.headerMain}>
      {def && <p className={styles.trail}><Link href={def.href}>{def.verb}</Link><span aria-hidden="true">/</span><span>{def.section}</span></p>}
      <h1>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
      {children}
    </div>
    {aside && <div className={styles.aside}>{aside}</div>}
    {siblings.length > 1 && <nav className={styles.tabs} aria-label={'أقسام ' + def.verb}><ul>{siblings.map(([href, label]) => <li key={href}><Link href={href} aria-current={isActivePath(currentPath, href) ? 'page' : undefined}>{label}</Link></li>)}</ul></nav>}
  </header>;
}

export function hrefWith(base, state, defaults, patch = {}) {
  const next = {...state, ...patch};
  const params = new URLSearchParams();
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = next[key];
    if (value === undefined || value === '' || String(value) === String(fallback)) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return base + (query ? '?' + query : '');
}

export function ActiveChips({chips, clearHref}) {
  if (!chips.length) return null;
  return <div className={styles.chips} aria-label="عوامل التصفية النشطة">
    <ul>{chips.map(chip => <li key={chip.key}><Link href={chip.href} aria-label={'إزالة ' + chip.label}>{chip.label}<X size={14} aria-hidden="true"/></Link></li>)}</ul>
    <Link href={clearHref} className={styles.clear}>مسح الكل</Link>
  </div>;
}

export function ResultCount({count, noun, note}) {
  return <p className={styles.count} aria-live="polite"><strong>{noun}: <span className="ui-ltr">{formatNumber(count)}</span></strong>{note && <span>{note}</span>}</p>;
}

// Link-based pagination: works without JavaScript, shareable, and each page is
// a real server render of 12 items, so payload never grows with the catalogue.
export function Pager({page, pages, hrefFor, label = 'تصفح الصفحات'}) {
  if (pages <= 1) return null;
  const numbers = [...new Set([1, page - 1, page, page + 1, pages].filter(value => value >= 1 && value <= pages))].sort((a, b) => a - b);
  return <nav className={styles.pager} aria-label={label}>
    {page > 1 ? <Link href={hrefFor(page - 1)} rel="prev" className={styles.step}><ArrowRight size={17} aria-hidden="true"/>السابق</Link> : <span className={styles.step} aria-hidden="true" data-disabled><ArrowRight size={17}/>السابق</span>}
    <ol>{numbers.map((value, index) => <li key={value}>{index > 0 && value - numbers[index - 1] > 1 && <span className={styles.gap} aria-hidden="true">…</span>}{value === page ? <span aria-current="page" className={styles.num}><span className="sr-only">الصفحة </span>{value}</span> : <Link href={hrefFor(value)} className={styles.num}><span className="sr-only">الصفحة </span>{value}</Link>}</li>)}</ol>
    {page < pages ? <Link href={hrefFor(page + 1)} rel="next" className={styles.step}>التالي<ArrowLeft size={17} aria-hidden="true"/></Link> : <span className={styles.step} aria-hidden="true" data-disabled>التالي<ArrowLeft size={17}/></span>}
  </nav>;
}

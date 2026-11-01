import NextLink from 'next/link';
import {pageIsVisible} from '@/lib/pageVisibility';
import {ArrowUpLeft, AtSign, Facebook, Instagram, Youtube} from 'lucide-react';
import BrandLogo from './BrandLogo';
import {defaultSiteSettings} from '@/lib/siteSettings';
import {contentPagePath} from '@/lib/contentPages';
import {navTasks} from '@/lib/navigation';
import styles from './shell/Footer.module.css';

// Design B footer: the same six task groups as the header, in ONE DOM structure.
// Links stay visible (compact wrapped lists on phones) instead of being hidden in
// disclosures, so keyboard and screen-reader access never diverges by width.
export default function Footer({settings = defaultSiteSettings}) {
  const pages = (settings.contentPages || []).filter(page => page.showInFooter && page.isPublished !== false);
  const visible = href => pageIsVisible(href.split('?')[0], settings.pageVisibility, settings.contentPages || []);
  const contentLinks = pages.filter(page => !['privacy', 'terms'].includes(page.slug)).map(page => ({slug: page.slug, title: page.title, href: contentPagePath(page)}));
  const tasks = navTasks({isVisible: visible, contentLinks}).map(task => task.id === 'join'
    ? {...task, links: [...task.links, ...contentLinks.filter(item => !task.links.some(([href]) => href === item.href)).map(item => [item.href, item.title])]}
    : task);
  const socials = [{key: 'instagram', label: 'إنستغرام', icon: Instagram}, {key: 'youtube', label: 'يوتيوب', icon: Youtube}, {key: 'facebook', label: 'فيسبوك', icon: Facebook}, {key: 'tiktok', label: 'تيك توك', icon: AtSign}].filter(item => settings[item.key]);
  const policies = pages.filter(page => ['privacy', 'terms'].includes(page.slug));
  return <footer className={styles.footer} data-site-footer>
    <div className={styles.inner}>
      <div className={styles.about}>
        <NextLink href="/" className={styles.brand} aria-label="مبادرة 967 — الرئيسية"><BrandLogo light/></NextLink>
        <h2>{settings.footerTitle}</h2>
        <p>{settings.footerDescription}</p>
        {socials.length > 0 && <ul className={styles.socials} aria-label="حسابات 967">{socials.map(({key, label, icon: Icon}) => <li key={key}><a href={settings[key]} target="_blank" rel="noopener noreferrer"><Icon size={18} aria-hidden="true"/>{label}</a></li>)}</ul>}
      </div>
      <nav className={styles.groups} aria-label="خريطة المنصة">
        {tasks.map(task => <section key={task.id} data-tone={task.tone} aria-labelledby={'footer-' + task.id}>
          <h3 id={'footer-' + task.id}>{task.verb}<span>{task.section}</span></h3>
          <ul>{task.links.map(([href, label]) => <li key={href}><NextLink href={href}>{label}</NextLink></li>)}</ul>
        </section>)}
      </nav>
    </div>
    <div className={styles.bottom}>
      <span>© {new Date().getFullYear()} مبادرة 967 · المعرفة تجمعنا، والمشاركة تقرّبنا.</span>
      <ul aria-label="روابط إضافية">
        {policies.map(page => <li key={page.id}><NextLink href={contentPagePath(page)}>{page.title}</NextLink></li>)}
        {visible('/search') && <li><NextLink href="/search">ابحث في المنصة <ArrowUpLeft size={14} aria-hidden="true"/></NextLink></li>}
        <li><NextLink href="/admin">دخول المحررين</NextLink></li>
      </ul>
    </div>
  </footer>;
}

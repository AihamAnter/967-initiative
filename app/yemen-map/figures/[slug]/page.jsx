import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {
  ArrowRight,
  ArrowUpLeft,
  AtSign,
  BookOpenText,
  CalendarDays,
  ExternalLink,
  Facebook,
  Globe2,
  Landmark,
  MapPinned,
  Youtube,
} from 'lucide-react';
import {getYemeniFigure, getYemeniFigures} from '@/lib/data';

export const dynamic = 'force-dynamic';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

function figureInitials(name) {
  return String(name || '').split(/\s+/).filter(word => !['الملكة', 'الملك', 'بن', 'بنت'].includes(word)).slice(0, 2)
    .map(word => word.replace(/^ال/, '').slice(0, 1)).join(' ');
}

function socialLinks(figure) {
  return [
    {url: figure.website, label: 'الموقع الإلكتروني', icon: Globe2},
    {url: figure.facebookUrl, label: 'فيسبوك', icon: Facebook},
    {url: figure.instagramUrl, label: 'إنستغرام', icon: AtSign},
    {url: figure.xUrl, label: 'منصة X', icon: AtSign},
    {url: figure.youtubeUrl, label: 'يوتيوب', icon: Youtube},
  ].filter(item => item.url);
}

function absoluteUrl(value) {
  if (!value) return undefined;
  try {
    return new URL(value, siteUrl).toString();
  } catch {
    return undefined;
  }
}

export async function generateMetadata({params}) {
  const {slug} = await params;
  const figure = await getYemeniFigure(slug);
  if (!figure) return {title: 'الشخصية غير موجودة'};

  const title = `${figure.fullName} | شخصيات يمنية`;
  const description = figure.shortBio || figure.knownFor;
  const canonical = `/yemen-map/figures/${figure.slug}`;

  return {
    title,
    description,
    keywords: [figure.fullName, figure.knownFor, figure.field, figure.governorateName, 'شخصيات يمنية', 'اليمن'],
    alternates: {canonical},
    openGraph: {
      title,
      description,
      type: 'profile',
      url: canonical,
      locale: 'ar_YE',
      images: figure.imageUrl ? [{url: figure.imageUrl, alt: figure.fullName}] : undefined,
    },
    twitter: {
      card: figure.imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: figure.imageUrl ? [figure.imageUrl] : undefined,
    },
  };
}

function ProfileFact({icon: Icon, label, value, ltr = false}) {
  if (!value) return null;
  return <div className="figure-profile-fact">
    <Icon size={18}/>
    <div><dt>{label}</dt><dd dir={ltr ? 'ltr' : undefined}>{value}</dd></div>
  </div>;
}

export default async function YemeniFigureProfilePage({params}) {
  const {slug} = await params;
  const [figure, figures] = await Promise.all([getYemeniFigure(slug), getYemeniFigures()]);
  if (!figure) notFound();

  const links = socialLinks(figure);
  const related = figures
    .filter(item => item.id !== figure.id)
    .sort((a, b) => {
      const aScore = Number(a.field === figure.field) * 2 + Number(a.governorateId === figure.governorateId);
      const bScore = Number(b.field === figure.field) * 2 + Number(b.governorateId === figure.governorateId);
      return bScore - aScore;
    })
    .slice(0, 3);

  const profileUrl = `${siteUrl}/yemen-map/figures/${figure.slug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${profileUrl}#person`,
    name: figure.fullName,
    url: profileUrl,
    description: figure.shortBio || figure.knownFor,
    image: absoluteUrl(figure.imageUrl),
    birthDate: figure.birthYear ? String(figure.birthYear) : undefined,
    deathDate: figure.deathYear ? String(figure.deathYear) : undefined,
    nationality: {'@type': 'Country', name: 'اليمن'},
    knowsAbout: [figure.field, figure.knownFor].filter(Boolean),
    sameAs: links.map(link => link.url),
    additionalProperty: [
      {'@type': 'PropertyValue', name: 'المجال', value: figure.field},
      {'@type': 'PropertyValue', name: 'المحافظة المرتبطة', value: figure.governorateName},
      {'@type': 'PropertyValue', name: 'الفترة', value: figure.era},
    ].filter(item => item.value),
  };

  return <div className="figure-profile-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData).replace(/</g, '\\u003c')}}/>

    <section className="figure-profile-hero">
      <div className="container figure-profile-hero-grid">
        <div className="figure-profile-copy">
          <Link href="/yemen-map#yemeni-figures" className="back-link"><ArrowRight size={17}/> العودة إلى شخصيات يمنية</Link>
          <div className="figure-profile-tags">
            <span>{figure.era}</span>
            <span>{figure.field}</span>
            <span><MapPinned size={14}/>{figure.governorateName}</span>
          </div>
          <h1>{figure.fullName}</h1>
          <strong>{figure.knownFor}</strong>
          <p>شخصية يمنية مرتبطة بمحافظة {figure.governorateName}، ضمن مجال {figure.field}.</p>
          {links.length > 0 && <nav className="figure-profile-socials" aria-label={`روابط ${figure.fullName}`}>
            {links.map(({url, label, icon: Icon}) => <a href={url} target="_blank" rel="noopener noreferrer" key={label}><Icon size={17}/><span>{label}</span><ExternalLink size={13}/></a>)}
          </nav>}
        </div>

        <div className="figure-profile-portrait">
          {figure.imageUrl
            ? <Image src={figure.imageUrl} alt={`صورة ${figure.fullName}`} fill priority sizes="(max-width: 850px) 100vw, 42vw" unoptimized={figure.imageUrl.startsWith('http')}/>
            : <span className="figure-profile-initials" aria-hidden="true">{figureInitials(figure.fullName)}</span>}
          <div><span>{figure.field}</span><strong>{figure.fullName}</strong></div>
        </div>
      </div>
    </section>

    <section className="figure-profile-body">
      <div className="container figure-profile-layout">
        <main className="figure-profile-main">
          <section>
            <span className="eyebrow">السيرة والتعريف</span>
            <h2>عن {figure.fullName}</h2>
            <p className="figure-profile-biography">{figure.shortBio}</p>
          </section>

          <section className="figure-profile-significance">
            <BookOpenText size={27}/>
            <div><span className="eyebrow">معروف بـ</span><h2>{figure.knownFor}</h2><p>يُصنّف هذا الملف ضمن {figure.field} ويرتبط بمحافظة {figure.governorateName} في دليل شخصيات يمنية.</p></div>
          </section>
        </main>

        <aside className="figure-profile-aside">
          <div className="figure-profile-facts">
            <h2>معلومات سريعة</h2>
            <dl>
              <ProfileFact icon={Landmark} label="الفترة" value={figure.era}/>
              <ProfileFact icon={BookOpenText} label="المجال" value={figure.field}/>
              <ProfileFact icon={MapPinned} label="المحافظة المرتبطة" value={figure.governorateName}/>
              <ProfileFact icon={CalendarDays} label="سنة الميلاد" value={figure.birthYear} ltr/>
              <ProfileFact icon={CalendarDays} label="سنة الوفاة" value={figure.deathYear} ltr/>
            </dl>
          </div>
          <Link className="figure-profile-directory-link" href="/yemen-map#yemeni-figures">استعراض جميع الشخصيات <ArrowUpLeft size={17}/></Link>
        </aside>
      </div>
    </section>

    {related.length > 0 && <section className="figure-profile-related">
      <div className="container">
        <div className="figure-profile-related-head"><div><span className="eyebrow">شخصيات مرتبطة</span><h2>ملفات أخرى للاستكشاف</h2></div><Link className="text-link" href="/yemen-map#yemeni-figures">عرض الدليل <ArrowUpLeft size={16}/></Link></div>
        <div className="figure-profile-related-grid">{related.map(item => <Link href={`/yemen-map/figures/${item.slug}`} key={item.id}>
          <div><span>{item.field} · {item.governorateName}</span><h3>{item.fullName}</h3><p>{item.knownFor}</p></div><ArrowUpLeft size={20}/>
        </Link>)}</div>
      </div>
    </section>}
  </div>;
}

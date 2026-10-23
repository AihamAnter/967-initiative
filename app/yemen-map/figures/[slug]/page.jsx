import Image from 'next/image';
import {toLatinDigits} from '@/lib/format';
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
import {detailPath, pageMetadata} from '@/lib/seo';
import {breadcrumbSchema, figureSchema, JsonLd} from '@/lib/seo-schema';
import FigureDossier from '@/components/FigureDossier';
import InlineTarget from '@/components/inline/InlineTarget';
import CorrectionLink from '@/components/CorrectionLink';

export const dynamic = 'force-dynamic';

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

export async function generateMetadata({params}) {
  const {slug} = await params;
  const figure = await getYemeniFigure(slug);
  if (!figure) notFound();

  const title = `${figure.fullName} | شخصيات يمنية`;
  const description = toLatinDigits(figure.shortBio || figure.knownFor);
  return pageMetadata({title, description, path:detailPath('yemen-map/figures', figure.slug), noindex:figure.isDemo, image:figure.imageUrl, type:'profile'});
}

function ProfileFact({icon: Icon, label, value, ltr = false}) {
  if (!value) return null;
  return <div className="figure-profile-fact">
    <dt><Icon size={18}/>{label}</dt><dd dir={ltr ? 'ltr' : undefined}>{value}</dd>
  </div>;
}

export default async function YemeniFigureProfilePage({params}) {
  const {slug} = await params;
  const [figure, figures] = await Promise.all([getYemeniFigure(slug), getYemeniFigures()]);
  if (!figure) notFound();

  const links = socialLinks(figure);
  const hasDossier=figure.profile&&['sections','facts','timeline','works','gallery','notes'].some(key=>figure.profile[key]?.length);
  const portrait=figure.profile?.gallery.find(photo=>photo.url===figure.imageUrl);
  const related = figures
    .filter(item => item.id !== figure.id && (item.field === figure.field || (figure.governorateId && item.governorateId === figure.governorateId)))
    .sort((a, b) => {
      const aScore = Number(a.field === figure.field) * 2 + Number(a.governorateId === figure.governorateId);
      const bScore = Number(b.field === figure.field) * 2 + Number(b.governorateId === figure.governorateId);
      return bScore - aScore;
    })
    .slice(0, 3);

  return <div className="figure-profile-page">
    <InlineTarget kind="figure" id={figure.id} slug={figure.slug} title={figure.fullName} href={detailPath('yemen-map/figures',figure.slug)} isDemo={figure.isDemo}/>
    <JsonLd data={figureSchema(figure)}/>
    <JsonLd data={breadcrumbSchema([{name:'اكتشف اليمن', path:'/yemen-map'}, {name:figure.fullName, path:detailPath('yemen-map/figures', figure.slug)}])}/>

    <section className="figure-profile-hero">
      <div className="container figure-profile-hero-grid">
        <div className="figure-profile-copy">
          <Link href={'/yemen-map'+(figure.governorateId?'?region='+encodeURIComponent(figure.governorateId):'')+'#yemeni-figures'} className="back-link"><ArrowRight size={17}/> العودة إلى شخصيات يمنية</Link>
          <div className="figure-profile-tags">
            <span>{figure.era}</span>
            <span>{figure.field}</span>
            {figure.governorateName&&<span><MapPinned size={14}/>{figure.governorateName}</span>}
          </div>
          <h1>{figure.fullName}</h1>
          {figure.isDemo && <p className="data-disclosure">ملف توضيحي من الكتالوج التجريبي للمشروع. يحتاج إلى مراجعة المصادر والبيانات قبل اعتماده؛ لا يمثل ملفاً موثقاً منشوراً.</p>}
          <strong>{toLatinDigits(figure.knownFor)}</strong>
          <p>{toLatinDigits(figure.shortBio)}</p>
          {links.length > 0 && <nav className="figure-profile-socials" aria-label={`روابط ${figure.fullName}`}>
            {links.map(({url, label, icon: Icon}) => <a href={url} target="_blank" rel="noopener noreferrer" key={label}><Icon size={17}/><span>{label}</span><ExternalLink size={13}/></a>)}
          </nav>}
        </div>

        <div className="figure-profile-portrait" data-kind={portrait?.kind||'portrait'}>
          {figure.imageUrl
            ? <Image src={figure.imageUrl} alt={figure.profile?.gallery.find(photo=>photo.url===figure.imageUrl)?.alt||`صورة ${figure.fullName}`} fill priority sizes="(max-width: 850px) 100vw, 42vw" unoptimized={figure.imageUrl.startsWith('http')}/>
            : <span className="figure-profile-initials" aria-hidden="true">{figureInitials(figure.fullName)}</span>}
          <div><span>{{context:'صورة سياقية مرتبطة بالسيرة',artwork:'تصوير فني',document:'وثيقة تاريخية'}[portrait?.kind]||figure.field}</span><strong>{figure.fullName}</strong>{figure.imageSourceUrl&&<a href={figure.imageSourceUrl} title={figure.imageCredit} target="_blank" rel="noopener noreferrer">مصدر الصورة وحقوقها</a>}</div>
        </div>
      </div>
    </section>

    <section className="figure-profile-body">
      <div className="container figure-profile-layout">
        <div className="figure-profile-main">
          {hasDossier ? <FigureDossier profile={figure.profile} figure={figure}/> : <>
          <section>
            <span className="eyebrow">السيرة والتعريف</span>
            <h2>عن {figure.fullName}</h2>
            <p className="figure-profile-biography">{toLatinDigits(figure.biographyText||figure.shortBio)}</p>
          </section>

          {(figure.birthYear || figure.deathYear || figure.timeline?.length > 0) && <section><span className="eyebrow">محطات من السيرة</span><h2>التسلسل الزمني</h2><ol className="figure-timeline">{[
            ...(figure.birthYear ? [{year:figure.birthYear,title:'الميلاد'}] : []),
            ...(figure.timeline || []),
            ...(figure.deathYear ? [{year:figure.deathYear,title:'الوفاة'}] : []),
          ].sort((a,b)=>Number(a.year)-Number(b.year)).map((item,index)=><li key={index}><time>{item.year}</time><div><strong>{item.title}</strong>{item.description&&<p>{item.description}</p>}</div></li>)}</ol></section>}

          <section><span className="eyebrow">المراجع</span><h2>مصادر الملف</h2>{figure.sources?.length ? <ul>{figure.sources.map(item=><li key={item.url}><a className="text-link" href={item.url} target="_blank" rel="noopener noreferrer">{item.title}<ExternalLink size={14}/></a></li>)}</ul> : <p className="small-muted">لم تُرفق مراجع تفصيلية بهذا الملف بعد. <Link className="text-link" href="/contribute?type=اقتراح%20شخصية%20أو%20معلومة%20تاريخية">ساهم بمصدر أو تصحيح</Link></p>}</section>

          <section className="figure-profile-significance">
            <BookOpenText size={27}/>
            <div><span className="eyebrow">معروف بـ</span><h2>{toLatinDigits(figure.knownFor)}</h2><p>يُصنّف هذا الملف ضمن {figure.field} ويرتبط بمحافظة {figure.governorateName} في دليل شخصيات يمنية.</p></div>
          </section>
          </>}
        </div>

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
          {figure.governorateId && <Link className="figure-profile-directory-link" href={'/yemen-map?region='+encodeURIComponent(figure.governorateId)+'#map'}>استكشف {figure.governorateName} على الخريطة <MapPinned size={17}/></Link>}
          <CorrectionLink title={figure.fullName} path={detailPath('yemen-map/figures',figure.slug)} id={figure.id}/>
        </aside>
      </div>
    </section>

    {related.length > 0 && <section className="figure-profile-related">
      <div className="container">
        <div className="figure-profile-related-head"><div><span className="eyebrow">شخصيات مرتبطة</span><h2>ملفات أخرى للاستكشاف</h2></div><Link className="text-link" href="/yemen-map#yemeni-figures">عرض الدليل <ArrowUpLeft size={16}/></Link></div>
        <div className="figure-profile-related-grid">{related.map(item => <Link href={`/yemen-map/figures/${item.slug}`} key={item.id}>
          <div><span>{item.field} · {item.governorateName}</span><h3>{item.fullName}</h3><p>{toLatinDigits(item.knownFor)}</p></div><ArrowUpLeft size={20}/>
        </Link>)}</div>
      </div>
    </section>}
  </div>;
}

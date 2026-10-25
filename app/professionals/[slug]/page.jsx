import ContentReadingAction from '@/components/reading/ContentReadingAction';
import Link from '@/components/SiteLink';
import ProfileAvatar from '@/components/design/ProfileAvatar';
import {notFound} from 'next/navigation';
import {ArrowRight, ArrowUpLeft, BadgeCheck, BriefcaseBusiness, CalendarDays, ExternalLink, Globe2, Languages, Mail, MapPin, MessageCircle, Phone, UserRoundCheck} from 'lucide-react';
import {getProfessional, getProfessionals} from '@/lib/data';
import {relatedProjections} from '@/lib/relatedContent';
import {formatNumber} from '@/lib/format';
import {detailPath, pageMetadata} from '@/lib/seo';
import {breadcrumbSchema, JsonLd} from '@/lib/seo-schema';
import {whatsappUrl} from '@/lib/contactLinks';
import {collectionDefaults,listReturnPath} from '@/lib/listState';
import InlineTarget from '@/components/inline/InlineTarget';
import CorrectionLink from '@/components/CorrectionLink';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}) {
  const {slug} = await params;
  const person = await getProfessional(slug);
  if (!person) notFound();
  return pageMetadata({title:`${person.fullName} | المهنيون`, description:person.bio, path:detailPath('professionals', person.id), noindex:person.isDemo});
}

function ContactLink({href, icon: Icon, label, external = false}) {
  if (!href) return null;
  return <a className="professional-contact-link" href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}><Icon size={18}/><span>{label}</span>{external && <ExternalLink size={14}/>}</a>;
}

export default async function ProfessionalProfilePage({params,searchParams}) {
  const {slug} = await params;
  const person = await getProfessional(slug);
  if (!person) notFound();
  const professionals = await getProfessionals(relatedProjections.professionals);
  const related = professionals.filter(item => item.id !== person.id && item.category === person.category).slice(0, 3);
  const query=await searchParams;
  const returnTo=listReturnPath(query.from,'/professionals',collectionDefaults.professionals,'#professionals-directory');

  return <>
    <InlineTarget kind="professional" id={person.databaseId} slug={person.id} title={person.fullName} href={detailPath('professionals',person.id)} isDemo={person.isDemo}/>
    <JsonLd data={breadcrumbSchema([{name:'المهنيون', path:'/professionals'}, {name:person.fullName, path:detailPath('professionals', person.id)}])}/>
    <section className="professional-profile-hero">
      <div className="professional-profile-copy">
        <Link href={returnTo} className="back-link"><ArrowRight size={17}/> العودة إلى دليل المهنيين</Link>
        <div className="professional-profile-identity">
        <ProfileAvatar className="professional-profile-avatar" name={person.fullName} src={person.profileImageUrl} imagePosition={person.imagePosition}/>
        <div>
        <div className="professional-profile-labels"><span>{person.category}</span><span><MapPin size={13}/>{person.location}</span>{person.isVerified && <span className="verified"><BadgeCheck size={14}/> ملف موثق</span>}</div>
        <h1>{person.fullName}</h1>{person.isDemo && <span className="status-badge">نموذج تجريبي — ليس ملفاً موثقاً</span>}{person.needsReview && !person.isDemo && <span className="status-badge">بيانات بحاجة إلى مراجعة إدارية</span>}
        <strong>{person.professionTitle}</strong>
        </div></div>
        <p>{person.bio}</p>
        <div className="professional-profile-actions">
          {person.whatsapp && <ContactLink href={whatsappUrl(person.whatsapp,`مرحباً، وصلت إلى ملفك في مبادرة 967 وأرغب في الاستفسار عن ${person.professionTitle}.`)} icon={MessageCircle} label="تواصل عبر واتساب" external/>}
          {person.phone && <ContactLink href={'tel:' + person.phone} icon={Phone} label="اتصال مباشر"/>}
          {person.email && <ContactLink href={'mailto:' + person.email} icon={Mail} label="البريد الإلكتروني"/>}
          {!person.whatsapp && !person.phone && !person.email && <span className="professional-no-contact">التواصل المباشر غير متاح من خلال هذا الملف حالياً.</span>}
        </div>
      </div>
    </section>

    <section className="professional-profile-body"><div className="container professional-profile-layout">
      <div className="professional-profile-main">
        <ContentReadingAction kind="professional" href={detailPath('professionals',person.id)} title={person.fullName}/>
        <section><span className="eyebrow">الخدمات</span><h2>ما الذي يقدمه؟</h2><div className="professional-services-list">{person.services.map((service, index) => <div key={service}><span>{String(index + 1).padStart(2, '0')}</span><strong>{service}</strong></div>)}</div></section>
        <section><span className="eyebrow">المهارات</span><h2>خبرات ومهارات عملية</h2><div className="professional-skills">{person.skills.map(skill => <span key={skill}><UserRoundCheck size={16}/>{skill}</span>)}</div></section>
        <section><span className="eyebrow">نطاق الخدمة</span><h2>أين يمكن طلب الخدمة؟</h2><div className="professional-areas">{person.serviceAreas.map(area => <span key={area}><MapPin size={16}/>{area}</span>)}</div></section>
      </div>

      <aside className="professional-profile-aside">
        <div className="professional-facts">
          <h2>بيانات مهنية</h2>
          <div><BriefcaseBusiness size={18}/><span>المهنة<strong>{person.professionTitle}</strong></span></div>
          <div><CalendarDays size={18}/><span>الخبرة بالسنوات<strong>{person.yearsExperience === null || person.yearsExperience === undefined ? 'غير محدد' : formatNumber(person.yearsExperience)}</strong></span></div>
          <div><UserRoundCheck size={18}/><span>طريقة الخدمة<strong>{person.serviceMode}</strong></span></div>
          <div><BadgeCheck size={18}/><span>التوفر<strong>{person.availability || 'حسب الاتفاق'}</strong></span></div>
          <div><Languages size={18}/><span>اللغات<strong>{person.languages.length ? person.languages.join('، ') : 'العربية'}</strong></span></div>
        </div>
        <div className="professional-contact-panel"><h2>تواصل مع المهني</h2>
          <ContactLink href={whatsappUrl(person.whatsapp)} icon={MessageCircle} label="واتساب" external/>
          <ContactLink href={person.phone ? 'tel:' + person.phone : null} icon={Phone} label={person.phone}/>
          <ContactLink href={person.email ? 'mailto:' + person.email : null} icon={Mail} label={person.email}/>
          <ContactLink href={person.website} icon={Globe2} label="الموقع الإلكتروني" external/>
          <ContactLink href={person.instagram} icon={ExternalLink} label="إنستغرام" external/>
          {!person.phone && !person.whatsapp && !person.email && !person.website && !person.instagram && <p>لا توجد وسائل تواصل منشورة لهذا الملف حتى الآن.</p>}
        </div>
        <CorrectionLink title={person.fullName} path={detailPath('professionals',person.id)} id={person.databaseId||person.id}/>
      </aside>
    </div></section>

    {related.length > 0 && <section className="professional-related"><div className="container"><div className="professional-related-head"><div><span className="eyebrow">من المجال نفسه</span><h2>مهنيون آخرون</h2></div><Link className="text-link" href="/professionals#professionals-directory">عرض الدليل <ArrowUpLeft size={16}/></Link></div><div className="professional-related-grid">{related.map(item => <Link href={'/professionals/' + item.id} key={item.id}><span>{item.location}</span><h3>{item.fullName}</h3><p>{item.professionTitle}</p><ArrowUpLeft size={18}/></Link>)}</div></div></section>}
  </>;
}

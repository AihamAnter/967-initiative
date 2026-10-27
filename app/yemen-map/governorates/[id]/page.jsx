import Link from '@/components/SiteLink';
import {notFound} from 'next/navigation';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {publicDb} from '@/lib/supabase';
import {getMapBoundaries,readPublicMapProfiles} from '@/lib/mapProfileRepository';
import {yemenGovernorates} from '@/lib/yemeniFigures';
import {governorateHeritageSources,governorateProfileSections,isGovernorateId} from '@/lib/governorateEditorial';
import {pageMetadata} from '@/lib/seo';
import styles from './GovernorateProfile.module.css';

export const dynamic='force-dynamic';

export async function generateMetadata({params}) {
  const {id}=await params;
  const item=yemenGovernorates.find(item=>item.id===id);
  if(!item)return {};
  return pageMetadata({
    title:item.name+' | خريطة اليمن',
    description:'ملف موسع عن محافظة '+item.name+' يشمل التاريخ والجغرافيا والاقتصاد والمعالم والمديريات، ضمن أطلس مبادرة 967.',
    path:'/yemen-map/governorates/'+id,
  });
}

function ContentSections({profile}) {
  return governorateProfileSections.filter(item=>profile[item.key]).map(item=><section id={item.key} key={item.key} className={styles.section}>
    <h2>{item.title}</h2>
    {profile[item.key].split(/\n\s*\n/).filter(Boolean).map((text,index)=><p key={index}>{text.trim()}</p>)}
  </section>);
}

export default async function GovernorateProfilePage({params}){
  const {id}=await params;
  if(!isGovernorateId(id))notFound();
  const settings=await getSiteSettings();
  if(!sectionIsVisible('atlas',settings.pageVisibility))notFound();
  const [boundaries,profiles]=await Promise.all([getMapBoundaries(),readPublicMapProfiles(publicDb())]);
  const region=boundaries.governorates.find(item=>item.id===id);
  const profile=profiles[id];
  if(!region||!profile)notFound();
  const districts=boundaries.districts.filter(item=>item.governorateId===id);
  const refs=governorateHeritageSources[id]||[];
  const heading=region.nameAr;
  return <main className={styles.page}>
    <header className={styles.hero}>
      <div className="container">
        <Link className={styles.back} href={'/yemen-map?region='+encodeURIComponent(id)+'#map'}>العودة إلى الخريطة التفاعلية</Link>
        <span className={styles.kicker}>خريطة اليمن / المحافظات</span>
        <h1>{heading}</h1>
        <p>{profile.description?.split(/\n\s*\n/)[0]||'ملف معرفي عن المحافظة.'}</p>
        <div className={styles.facts}>
          <div><span>المركز الإداري</span><strong>{profile.capital||'غير موثق في الدليل'}</strong></div>
          <div><span>المساحة المسجلة</span><strong>{profile.area_km2?Number(profile.area_km2).toLocaleString('ar')+' كم²':'غير متوفرة'}</strong></div>
          <div><span>المديريات بالخريطة</span><strong>{districts.length.toLocaleString('ar')}</strong></div>
          <div><span>السكان</span><strong>{profile.population?Number(profile.population).toLocaleString('ar')+' · '+(profile.population_year||'السنة غير متوفرة'):'لا يوجد تقدير سكاني موثق'}</strong></div>
        </div>
      </div>
    </header>
    <div className={'container '+styles.layout}>
      <article className={styles.article}>
        <ContentSections profile={profile}/>
        <section className={styles.sources} aria-label="مراجع وتحذيرات التوثيق">
          <h2>المصادر وحدود المعلومات</h2>
          <p>النصوص التعريفية من أطلس 967، وهي مادة معرفية عامة وليست بياناً رسمياً محدثاً للخدمات أو الأمن أو أحوال الطرق. الأعداد والحدود الإدارية من فهرس الخريطة المعتمد بالموقع، ولا نعرض تقدير سكان دون سنة ومصدر.</p>
          {refs.length>0&&<><p>المراجع الخارجية التالية تتعلق تحديداً بالمواقع التراثية المذكورة، ولا تشكل توثيقاً لجميع التفاصيل الاجتماعية والاقتصادية:</p><ul>{refs.map(ref=><li key={ref.url}><a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.title}</a></li>)}</ul></>}
          <p>يمكن لفريق التحرير استكمال المصادر التفصيلية وتصحيح المعلومات من لوحة إدارة الأطلس قبل اعتمادها في المراجع البحثية.</p>
        </section>
      </article>
      <aside className={styles.sidebar}>
        <nav className={styles.navigation} aria-label="أقسام ملف المحافظة">
          <h2>داخل الملف</h2>
          {governorateProfileSections.filter(item=>profile[item.key]).map(item=><a href={'#'+item.key} key={item.key}>{item.title}</a>)}
          <a href="#districts">مديريات المحافظة</a>
        </nav>
        <section className={styles.districts} id="districts">
          <h2>المديريات التابعة</h2>
          <p>وفق حدود الخريطة الإدارية في 967.</p>
          <ul>{districts.map(d=><li key={d.id}><Link href={'/yemen-map?region='+id+'&district='+encodeURIComponent(d.id)+'#map'}>{d.nameAr}</Link></li>)}</ul>
        </section>
        {sectionIsVisible('figures',settings.pageVisibility)&&<Link className={styles.figureLink} href={'/yemeni-figures?region='+encodeURIComponent(id)}>تصفح الشخصيات المرتبطة بمحافظة {heading}</Link>}
      </aside>
    </div>
  </main>;
}

import Image from 'next/image';
import Link from '@/components/SiteLink';
import {ArrowUpLeft, ArrowLeft, Bookmark, Package, Play, UserRound} from 'lucide-react';
import ContentSurface, {ContentBadge} from '@/components/design/ContentSurface';
import YemeniMotif from '@/components/design/YemeniMotif';
import styles from './preview.module.css';

export const metadata = {
  title: 'معاينة الهوية البصرية',
  description: 'معاينة الألوان والخطوط ومكونات المحتوى للمرحلة الأولى من تصميم 967.',
  robots: {index: false, follow: false},
};

const palette = [
  {name: 'تركواز 967', color: 'var(--color-brand)', hex: '#007F86', description: 'الهوية والتفاعل', ink: '#fff'},
  {name: 'مرجاني', color: 'var(--color-coral)', hex: '#CF432F', description: 'الأعمال والحكايات', ink: '#fff'},
  {name: 'بنفسجي', color: 'var(--color-violet)', hex: '#7040C5', description: 'المجلة والقراءة', ink: '#fff'},
  {name: 'أزرق', color: 'var(--color-cobalt)', hex: '#2855D9', description: 'الأرقام والمعرفة', ink: '#fff'},
  {name: 'أصفر دافئ', color: 'var(--color-sun)', hex: '#F6BC36', description: 'المنتجات والتفاصيل', ink: 'var(--color-ink)'},
  {name: 'أخضر', color: 'var(--color-leaf)', hex: '#16734E', description: 'المكان والمجتمع', ink: '#fff'},
];

function SampleAction({href, children}) {
  return <Link href={href} className={styles.sampleAction}>{children}<ArrowUpLeft size={17} aria-hidden="true"/></Link>;
}

export default function DesignSystemPreview() {
  return <div className={styles.preview}>
    <section className={styles.intro}>
      <div className={`container ${styles.introGrid}`}>
        <div><span className={styles.kicker}>967 / الهوية البصرية / المرحلة الأولى</span>
          <h1>مساحة يمنية،<br/><span>بألوانها وحكاياتها.</span></h1>
          <p>ألوان حاضرة، وخط عربي واضح، وشخصية مختلفة لكل نوع من المحتوى.</p>
          <nav className={styles.previewNav} aria-label="أقسام معاينة الهوية"><a href="#palette">الألوان</a><a href="#typography">الخطوط</a><a href="#specimens">أنواع المحتوى <ArrowLeft size={16} aria-hidden="true"/></a></nav>
        </div>
        <div className={styles.motifPanel} aria-hidden="true"><YemeniMotif/><span>من تفاصيل المكان<br/><strong>تبدأ الهوية.</strong></span><b>٩٦٧</b></div>
      </div>
    </section>

    <div className="container">
      <p className={styles.notice}>هذه صفحة لمعاينة التصميم. البطاقات والأسماء والقيم أدناه أمثلة توضيحية، وروابطها تفتح أقسام المنصة.</p>
      <section id="palette" className={styles.section}>
        <div className={styles.sectionHeading}><span>01 / الألوان</span><h2>كل لون، له مكان.</h2><p>ألوان صريحة للمحتوى، مع خلفية دافئة ومساحات بيضاء تحافظ على وضوح القراءة.</p></div>
        <div className={styles.palette}>{palette.map(item => <div className={styles.swatch} key={item.hex}>
          <div style={{backgroundColor: item.color, color: item.ink}}><strong>{item.name}</strong><code dir="ltr">{item.hex}</code></div><p>{item.description}</p>
        </div>)}</div>
        <div className={styles.neutrals}><span>الخلفية العاجية <code dir="ltr">#FFFAF2</code></span><span>النص الداكن <code dir="ltr">#172E3B</code></span><span>النص الثانوي <code dir="ltr">#475E6B</code></span><span>الأحمر والأزرق لطرفَي المناظرة</span></div>
      </section>

      <section id="typography" className={styles.section}>
        <div className={styles.sectionHeading}><span>02 / الخطوط والتفاصيل</span><h2>عربية تقرأها براحة.</h2><p>IBM Plex Sans Arabic بأوزان واضحة وتسلسل ثابت للعناوين والنصوص والتصنيفات.</p></div>
        <div className={styles.typeGrid}>
          <div className={styles.typeSpecimen}><span className={styles.kicker}>عنوان رئيسي / وزن 700</span><p className={styles.displayType}>اليمن، أقرب إليك.</p><h3>حكايات تستحق أن تُروى.</h3><p className={styles.bodyType}>نقترب من اليمن عبر حكايات أهله، وثقافته، وأماكنه. نفتح مساحة للمعرفة والمشاركة، ونمنح كل حكاية شكلًا يناسبها.</p><span className={styles.caption}>نص أساسي 17px · تصنيف 14px · بيانات مساندة 13px</span></div>
          <div className={styles.detailsSpecimen}><YemeniMotif/><h3>تفاصيل من القمريات.</h3><p>زخرفة هندسية خفيفة ترافق المحتوى دون أن تزاحم الصور أو الكلمات.</p><div className={styles.spacing}>{[8,16,24,32].map(value => <div key={value}><span style={{width:value}}/><code>{value}px</code></div>)}</div><span className={styles.caption}>مسافات متناسقة من مقياس واحد.</span></div>
        </div>
      </section>

      <section id="specimens" className={styles.section}>
        <div className={styles.sectionHeading}><span>03 / أنواع المحتوى</span><h2>لكل حكاية، شكلها.</h2><p>ستة نماذج تشترك في الأساس، ويتميز كل منها بتكوينه ولونه وتفاصيله.</p></div>
        <div className={styles.samples}>
          <ContentSurface kind="video" className={styles.videoSample}>
            <div className={styles.videoArt}><YemeniMotif/><span>حكايات من اليمن</span><Play size={30} fill="currentColor" aria-hidden="true"/></div>
            <div className={styles.sampleBody}><ContentBadge kind="video"/><h3>من تفاصيل الحياة، نروي الحكاية.</h3><p>الصورة أولًا، مع عنوان واضح ومدخل مباشر للمشاهدة.</p><SampleAction href="/works">استكشف الأعمال</SampleAction></div>
          </ContentSurface>
          <ContentSurface kind="issue" className={styles.issueSample}>
            <div className={styles.issueArt}><Image src="/images/demo-cover.svg" width={180} height={240} alt="غلاف العدد التوضيحي المستخدم لمعاينة التصميم"/></div>
            <div className={styles.sampleBody}><ContentBadge kind="issue"/><h3>مساحة للقراءة والتأمل.</h3><p>الغلاف يقود التكوين، وترافقه تفاصيل العدد.</p><SampleAction href="/magazine">تصفح المجلة</SampleAction></div>
          </ContentSurface>
          <ContentSurface kind="indicator" className={styles.indicatorSample}>
            <div className={styles.sampleBody}><ContentBadge kind="indicator"/><h3>وراء كل رقم، صورة أوضح.</h3><div className={styles.sampleNumber}><strong dir="ltr">967</strong><span>رقم توضيحي للمعاينة</span></div><p>قيمة بارزة، ثم وحدة القياس والسنة والمصدر.</p><SampleAction href="/yemen-in-numbers">استكشف المؤشرات</SampleAction></div>
          </ContentSurface>
          <ContentSurface kind="debate" className={styles.debateSample}>
            <div className={styles.sampleBody}><ContentBadge kind="debate"/><h3>كيف نفتح مساحة لحوار أفضل؟</h3><p>سؤال واضح يجمع وجهتَي نظر، مع حضور متوازن للطرفين.</p><div className={styles.debateSides}><span>وجهة النظر الأولى</span><span>وجهة النظر الثانية</span></div><SampleAction href="/debates">استكشف المناظرات</SampleAction></div>
          </ContentSurface>
          <ContentSurface kind="profile" className={styles.profileSample}>
            <div className={styles.sampleBody}><ContentBadge kind="profile"/><div className={styles.profileIdentity}><span><UserRound size={32} aria-hidden="true"/></span><div><h3>ملف مهني توضيحي</h3><p>التخصص · المحافظة</p></div></div><p>الهوية والتخصص والخدمات في تكوين سهل التصفح.</p><SampleAction href="/professionals">اكتشف المهنيين</SampleAction></div>
          </ContentSurface>
          <ContentSurface kind="product" className={styles.productSample}>
            <div className={styles.productArt}><Package size={56} strokeWidth={1.4} aria-hidden="true"/><YemeniMotif/></div>
            <div className={styles.sampleBody}><ContentBadge kind="product"/><h3>صُنع في اليمن.</h3><p>مساحة للمنتج والعلامة، مع تصنيف ومعلومة مباشرة.</p><SampleAction href="/yemeni-products">تصفح المنتجات</SampleAction></div>
          </ContentSurface>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}><span>04 / عناصر التفاعل</span><h2>وضوح في كل خطوة.</h2><p>أزرار قابلة للتمييز، ومساحات لمس مريحة، وحدود ظاهرة عند التنقل بلوحة المفاتيح.</p></div>
        <div className={styles.controls}>
          <div><a className="btn btn-primary" href="#specimens">استكشف المحتوى <ArrowLeft size={18} aria-hidden="true"/></a><a className="btn btn-outline" href="#palette">شاهد الألوان <Bookmark size={17} aria-hidden="true"/></a><button className="btn btn-primary" type="button" disabled>غير متاح</button></div>
          <label>حقل نص للمعاينة<input type="text" placeholder="جرّب الكتابة والتنقل بزر Tab"/></label>
        </div>
      </section>
    </div>
  </div>;
}

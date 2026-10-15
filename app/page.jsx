export const dynamic='force-dynamic';
import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpLeft,ArrowLeft,Play,Newspaper,MessagesSquare,MapPin,PenLine,Instagram,ChevronLeft,MoveUpLeft,Radio,BookOpen,Handshake,Lightbulb,ChartNoAxesCombined,Database,LineChart} from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import ContactForm from '@/components/ContactForm';
import {getIssues,getWorks,getMarqueeItems} from '@/lib/data';
import {demoIssue,site} from '@/lib/config';
import {formatNumber} from '@/lib/format';

const pillars=[
 {no:'01',icon:Radio,title:'الإعلام الذي يشرح',body:'محتوى مرئي ومكتوب يضع الوقائع والأرقام في سياقها، بعيداً عن التهويل والغموض.'},
 {no:'02',icon:MessagesSquare,title:'الحوار الذي يفتح الأبواب',body:'مناظرات ونقاشات تتيح للأفكار المختلفة أن تُسمع، وتُختبر بالحجة والمعرفة.'},
 {no:'03',icon:Handshake,title:'المجتمع الذي يشارك',body:'أنشطة ميدانية ومشاريع تطوعية تبدأ من احتياجات الناس، وتبحث عن حلول قابلة للتنفيذ.'},
];
const initiatives=[
 {no:'01',icon:MapPin,status:'قيد التخطيط',title:'967 في الشارع',desc:'لقاءات واستطلاعات ميدانية ترصد مشكلات الناس وآراءهم، وتسلّط الضوء على تجاربهم.'},
 {no:'02',icon:MessagesSquare,status:'قيد التحضير',title:'مناظرات 967',desc:'حوارات منظمة حول قضايا اليمن، تستضيف رؤى مختلفة وتضع احترام الاختلاف أولاً.'},
 {no:'03',icon:Lightbulb,status:'المستقبل',title:'مشاريع مجتمعية',desc:'مبادرات صغيرة ومباشرة في المعرفة والخدمات والمشاركة المجتمعية، تُعلن تفاصيلها عند إطلاقها.'},
];
export default async function Home(){
 const [works,issues,marqueeItems]=await Promise.all([getWorks(),getIssues(),getMarqueeItems()]);
 const latest=issues[0]||demoIssue;
 const marqueeLoop=[...marqueeItems,...marqueeItems];
 return <>
 <section className="hero"><div className="hero-hatch" aria-hidden="true"/><div className="container hero-layout">
 <div className="hero-copy"><span className="hero-kicker"><span className="pulse"/> مبادرة إعلامية ومجتمعية يمنية <span className="hero-kicker-line"/></span>
 <h1>اليمن،<br/><span className="hero-title-outline">حكاية</span> لم<br/>تنتهِ بعد<span className="red-period">.</span></h1>
 <p className="hero-desc">نعرض الحقائق، نطرح الأسئلة، نفتح باب الحوار، ونعمل مع المجتمع. لأن مستقبل اليمن يبدأ بمعرفته وفهم واقعه.</p>
 <div className="hero-actions"><Link href="/works" className="btn btn-red">اكتشف أعمالنا <ArrowUpLeft size={18}/></Link><Link href="/magazine" className="btn btn-ghost">اقرأ مجلة 967 <ArrowLeft size={18}/></Link></div>
 <div className="hero-meta"><span>01 / 03</span><span className="meta-rule"/><span>صوت • معرفة • مشاركة</span></div></div>
 <div className="hero-visual hero-map" aria-label="خريطة اليمن"><Image className="hero-map-img" src="/images/red%20map.png" alt="خريطة اليمن" width={1586} height={992} priority/><div className="visual-vertical">FROM YEMEN<br/>FOR THE FUTURE</div><div className="visual-stamp"><span>مبادرة</span><b>967</b><span>اليمن</span></div><div className="visual-foot">MADE OF STORIES. BUILT FOR CHANGE. / 2026</div></div>
 </div><div className="marquee" aria-hidden="true"><div>{marqueeLoop.map((item,index)=><span className="marquee-item" key={index}>{item} <span>✳</span></span>)}</div></div></section>

 <section id="about" className="section about-section"><div className="container about-layout"><div className="about-left"><span className="eyebrow">01 / من نحن</span><h2 className="large-section-title">لسنا فقط<br/>من <em>يروي</em> القصة.</h2><div className="mini-graphic"><span>9</span><span>6</span><span>7</span></div></div><div className="about-right"><span className="small-red-rule"/><p className="lead">967 مبادرة يمنية مستقلة في طموحها الإعلامي والمجتمعي، تسعى إلى جعل المعرفة والحوار والمشاركة جزءاً من الحياة العامة.</p><p>نؤمن بأن فهم ما يحدث في اليمن هو الخطوة الأولى نحو تغييره. لذلك نجمع بين إنتاج المحتوى، وفتح النقاش، وتشجيع أنشطة ميدانية تعالج قضايا حقيقية وتسمح للناس بأن يكونوا جزءاً من الحل.</p><div className="value-list"><div><span>رؤيتنا</span><strong>مجتمع أكثر وعياً ومشاركة.</strong></div><div><span>رسالتنا</span><strong>المعرفة الواضحة، والحوار المفتوح، والعمل المشترك.</strong></div></div></div></div></section>

 <section className="section section-alt" id="mission"><div className="container"><SectionHeading kicker="02 / مجالات عملنا" title={<>ثلاث مسارات.<br/><span className="muted-title">غاية واحدة.</span></>} copy="يجتمع الإعلام والحوار والعمل الميداني في صورة واحدة: مجتمع أكثر قدرة على فهم قضاياه والمشاركة في حلها."/><div className="pillar-grid">{pillars.map(p=><article className="pillar-card" key={p.no}><div className="pillar-top"><span>{p.no}</span><p.icon size={28} strokeWidth={1.4}/></div><h3>{p.title}</h3><p>{p.body}</p><ArrowUpLeft className="pillar-arrow" size={20}/></article>)}</div></div></section>

 <section className="section work-teaser"><div className="container"><SectionHeading kicker="03 / المكتبة الإعلامية" title={<>قصص تستحق<br/>أن <span className="accent-word">تُسمع.</span></>} copy="فيديوهات، تحليلات، وتغطيات تقرّب قضايا اليمن إلى الناس." href="/works" linkLabel="شاهد جميع الأعمال"/><div className="teaser-grid"><Link href="/works" className="teaser-feature"><div className="teaser-pattern"><span>967</span></div><span className="teaser-tag">الإنتاج الإعلامي</span><div className="teaser-bottom"><div><span className="eyebrow">مكتبة الأعمال</span><h3>المعرفة تبدأ<br/>بسؤال.</h3></div><span className="round-arrow"><ArrowUpLeft/></span></div></Link><div className="teaser-side"><a href={site.instagram} target="_blank" rel="noopener noreferrer" className="social-feature"><Instagram size={28}/><span>تابع محتوى 967 على إنستغرام</span><ArrowUpLeft size={18}/></a><div className="teaser-note"><span className="eyebrow">أحدث الأعمال</span><h3>{works.length?'تابع آخر ما نشرناه':'مساحة تنمو مع كل عمل'}</h3><p>{works.length?`تضم المكتبة حالياً ${formatNumber(works.length)} عملاً منشوراً.`:'ستُضاف الفيديوهات والتغطيات والأنشطة المنشورة إلى المكتبة، مع تصنيفها حسب المنصة والموضوع.'}</p><Link href="/works" className="text-link">ادخل المكتبة <ArrowUpLeft size={16}/></Link></div></div></div></div></section>

 <section className="section magazine-teaser"><div className="container magazine-teaser-grid"><div className="magazine-copy"><span className="eyebrow light-eyebrow">04 / مجلة 967 الأسبوعية</span><h2>من الحدث<br/>إلى <em>الصفحة.</em></h2><p>مساحة أسبوعية نجمع فيها الملفات والتحليلات والقصص والأفكار. اقرأ المجلة مباشرة من المتصفح، أو حمّل نسختك بصيغة PDF.</p><div className="magazine-actions"><Link href="/magazine" className="btn btn-white">استكشف المجلة <ArrowUpLeft size={18}/></Link><Link href={'/magazine/'+latest.slug} className="simple-white-link">{latest.is_demo?'جرّب القارئ':'العدد الأخير'} <ArrowLeft size={16}/></Link></div><span className="magazine-index">967 / WEEKLY JOURNAL</span></div><div className="magazine-cover-stack"><div className="cover-shadow cover-shadow-one"/><div className="cover-shadow cover-shadow-two"/><img src="/images/demo-cover.svg" alt="تصميم توضيحي لغلاف مجلة 967"/></div></div></section>

 <section className="section home-stats-teaser"><div className="container home-stats-layout"><div className="home-stats-copy"><span className="eyebrow">05 / اليمن بالأرقام</span><h2>الرقم وحده<br/>لا يكفي.</h2><p>مرصد وطني يجمع المؤشرات الموثقة ويضع كل قيمة بجانب سنتها ومصدرها ومنهجيتها، مع سلاسل زمنية تكشف التغير والفجوات كما هي.</p><Link href="/yemen-in-numbers" className="btn btn-red">استكشف المرصد <ArrowUpLeft size={18}/></Link></div><div className="home-stats-features"><div><Database size={23}/><strong>64 مجالاً وطنياً</strong><span>من الاقتصاد والصحة إلى البيئة والثقافة</span></div><div><LineChart size={23}/><strong>اليمن عبر الزمن</strong><span>مقارنة سنوية منذ 1990 حسب البيانات المتاحة</span></div><div><ChartNoAxesCombined size={23}/><strong>مصدر لكل رقم</strong><span>توثيق واضح وحالة رسمية أو تقديرية</span></div></div></div></section>

 <section className="section initiative-section"><div className="container"><SectionHeading kicker="05 / خارج الشاشة" title={<>الكلمة مهمة.<br/><span className="muted-title">والفعل أيضاً.</span></>} copy="لا تنتهي المبادرة عند إنتاج المحتوى. هذه مساحات نخطط لتطويرها مع المجتمع."/><div className="initiatives">{initiatives.map(p=><article className="initiative-item" key={p.no}><span className="initiative-no">{p.no}</span><div className="initiative-icon"><p.icon size={27} strokeWidth={1.5}/></div><div className="initiative-info"><h3>{p.title}</h3><p>{p.desc}</p></div><span className="status-pill">{p.status}</span></article>)}</div></div></section>

 <section className="section contact-section" id="contact"><div className="container contact-layout"><div className="contact-copy"><span className="eyebrow">06 / تواصل معنا</span><h2>عندك فكرة؟<br/><span className="accent-word">نسمعك.</span></h2><p>موضوع يستحق التغطية، اقتراح لنشاط، رغبة في التطوع، أو حتى ملاحظة على معلومة نشرناها. اكتب لنا.</p><a className="instagram-line" href={site.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={22}/> @yemen967_ <ArrowUpLeft size={17}/></a></div><ContactForm/></div></section>
 </>;
}

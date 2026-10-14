import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpLeft, BadgeCheck, Handshake, SearchCheck, ShieldCheck} from 'lucide-react';
import ProfessionalDirectory from '@/components/ProfessionalDirectory';
import {getProfessionals} from '@/lib/data';
import {formatNumber} from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'مهنيون',
  description: 'دليل للعثور على الحرفيين والمهنيين ومقدمي الخدمات في اليمن والتواصل معهم.',
};

export default async function ProfessionalsPage() {
  const professionals = await getProfessionals();
  const isDemo = professionals.every(person => person.isDemo);
  return <>
    <section className="professionals-hero">
      <Image src="/images/professionals-hero.png" alt="مهنيون وحرفيون يمنيون في بيئة عمل" fill priority sizes="100vw"/>
      <div className="professionals-hero-shade"/>
      <div className="container professionals-hero-content">
        <span className="eyebrow">دليل الحرف والخدمات / 06</span>
        <h1>مهنيون<span>.</span></h1>
        <p>اعثر على الحرفي أو مقدم الخدمة المناسب، تعرّف على خبرته وخدماته ونطاق عمله، وتواصل معه مباشرة.</p>
        <a className="btn btn-red" href="#professionals-directory">ابحث عن مهني <ArrowUpLeft size={18}/></a>
      </div>
      <div className="professionals-hero-stats">
        <div><strong>{formatNumber(professionals.length)}</strong><span>{isDemo ? 'ملفات تجريبية' : 'مهنيون منشورون'}</span></div>
        <div><strong>{formatNumber(new Set(professionals.map(person => person.category)).size)}</strong><span>مجالات مهنية</span></div>
        <div><strong>{formatNumber(new Set(professionals.map(person => person.location)).size)}</strong><span>محافظات</span></div>
      </div>
    </section>

    <section className="professionals-intro"><div className="container professionals-intro-grid">
      <div><span className="eyebrow">المهارة أقرب</span><h2>الشخص المناسب.<br/>للعمل المناسب.</h2></div>
      <div><p>بحث مباشر عن أصحاب المهارات والخبرات المحلية، مع معلومات عملية تساعدك على الاختيار والتواصل دون قوائم مبهمة.</p><p className="professionals-data-note"><BadgeCheck size={17}/>{isDemo ? 'الملفات الحالية نماذج توضيحية حتى إضافة المهنيين من لوحة التحرير.' : 'تظهر هنا الملفات المنشورة والمعتمدة من لوحة التحرير.'}</p></div>
    </div></section>

    <section className="professionals-directory-section" id="professionals-directory"><div className="container"><ProfessionalDirectory professionals={professionals}/></div></section>

    <section className="professionals-principles"><div className="container">
      <div className="professionals-principles-head"><span className="eyebrow">دليل عملي</span><h2>معلومات تساعد على قرار أفضل.</h2></div>
      <div className="professionals-principles-grid">
        <div><SearchCheck size={25}/><h3>بحث واضح</h3><p>تصفية حسب المهنة والمحافظة وطريقة تقديم الخدمة.</p></div>
        <div><ShieldCheck size={25}/><h3>بيانات قابلة للتحقق</h3><p>إظهار حالة التوثيق والخبرة ووسائل التواصل المتاحة.</p></div>
        <div><Handshake size={25}/><h3>تواصل مباشر</h3><p>الوصول إلى المهني دون وسطاء أو خطوات غير ضرورية.</p></div>
      </div>
    </div></section>

    <section className="professionals-join"><div className="container"><div><span>هل أنت مهني أو مقدم خدمة؟</span><h2>أضف خبرتك إلى الدليل.</h2></div><Link className="btn btn-white" href="/#contact">اطلب إضافة ملفك <ArrowUpLeft size={18}/></Link></div></section>
  </>;
}

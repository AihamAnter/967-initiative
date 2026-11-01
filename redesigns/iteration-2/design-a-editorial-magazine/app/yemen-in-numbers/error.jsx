'use client';
import Link from 'next/link';

export default function YemenNumbersError({reset}) {
  return <section className="ed-notice" role="alert" aria-labelledby="numbers-error-title">
    <span className="ed-kicker">اليمن بالأرقام</span>
    <h1 id="numbers-error-title">تعذّر تحميل البيانات.</h1>
    <p>حدث خلل مؤقت أثناء قراءة المؤشرات. لم تُعرض أي قيمة غير موثقة بدلًا منها.</p>
    <div className="ed-notice-actions"><button type="button" className="ed-button" onClick={reset}>إعادة المحاولة</button><Link className="ed-button" data-variant="quiet" href="/">الصفحة الرئيسية</Link></div>
  </section>;
}

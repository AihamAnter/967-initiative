'use client';
// مدرسة 967 — صفحة مراجعة التجربة (المرحلة 7): المحررون يجربون دروس «أساسيات الاقتصاد» و«علم العروض» الجديدة قبل نشرها.
// المعاينة محلية بالكامل: لا تقدم ولا نقاط ولا كتابة في قاعدة البيانات.
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {ArrowLeft, BookOpen, FlaskConical, Hammer, Signpost, Search, Sparkles, Trophy, AlertTriangle, LogIn} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import {journeyUnits} from '@/lib/schoolJourney';
import CardLessonPlayer from './CardLessonPlayer';
import styles from './PilotBrowser.module.css';

const TEMPLATE = {story: [BookOpen, 'قصة'], lab: [FlaskConical, 'مختبر'], build: [Hammer, 'ابنِ بنفسك'], decision: [Signpost, 'مسار قرارات'], spot: [Search, 'اكتشف الخطأ'], mixed: [Sparkles, 'متنوع']};

async function get(query = '') {
  const db = browserDb(), {data} = await db?.auth.getSession() || {};
  const token = data?.session?.access_token;
  if (!token) return {status: 401};
  const res = await fetch('/api/school/pilot' + query, {cache: 'no-store', headers: {Authorization: 'Bearer ' + token}});
  return {status: res.status, json: await res.json().catch(() => ({}))};
}

export default function PilotBrowser() {
  const [state, setState] = useState({mode: 'loading', courses: [], error: ''});
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState('');
  useEffect(() => {
    get().then(r => setState(r.status === 200 ? {mode: 'ready', courses: r.json.courses, error: ''}
      : {mode: r.status === 401 ? 'login' : r.status === 403 ? 'denied' : 'error', courses: [], error: r.json?.error || ''}))
      .catch(e => setState({mode: 'error', courses: [], error: e.message}));
  }, []);
  async function play(slug, index) {
    setBusy(slug + index);
    try {
      const r = await get(`?course=${slug}&lesson=${index}`);
      if (r.status !== 200) throw Error(r.json?.error || 'تعذر فتح الدرس.');
      setOpen({slug, index, ...r.json});
    } catch (e) { setState(s => ({...s, error: e.message})); } finally { setBusy(''); }
  }

  if (state.mode !== 'ready') return <div className={styles.page}><div className={styles.notice}>
    {state.mode === 'loading' ? <p role="status">جارٍ التحقق من الصلاحيات…</p>
      : state.mode === 'login' ? <><h1>سجّل الدخول بحساب الإدارة</h1><p>صفحة التجربة متاحة للمحررين فقط.</p><Link className={styles.button} href={'/login?next=' + encodeURIComponent('/school/pilot')}><LogIn size={17} aria-hidden="true"/> تسجيل الدخول</Link></>
      : state.mode === 'denied' ? <><h1>هذه الصفحة للمحررين</h1><p>دروس التجربة قيد المراجعة ولم تُنشر بعد.</p><Link className={styles.button} href="/school">العودة إلى المدرسة</Link></>
      : <><h1>تعذر فتح التجربة</h1><p>{state.error}</p></>}
  </div></div>;

  return <div className={styles.page}>
    <header className={styles.head}>
      <span className={styles.eyebrow}>تجربة المدرسة الجديدة · للمراجعة قبل النشر</span>
      <h1>جرّب الدروس الجديدة</h1>
      <p>كل درس بطاقات قصيرة: تحدٍّ أولًا، ثم شرح مرئي، ثم تمارين متنوعة. المعاينة لا تحفظ تقدمًا ولا نقاطًا. دوّن ملاحظاتك على كل درس لنعدّله قبل النشر.</p>
      {state.error && <p className={styles.error} role="alert">{state.error}</p>}
    </header>
    {state.courses.map(c => <section key={c.slug} className={styles.course} aria-labelledby={'c-' + c.slug}>
      <h2 id={'c-' + c.slug}>{c.title}</h2><p className={styles.desc}>{c.description}</p>
      {journeyUnits(c.lessons, c.units).map((u, ui) => <div key={ui} className={styles.unit}>
        <h3><span>الوحدة {ui + 1}</span> {u.title}</h3>
        <ol className={styles.lessons}>
          {u.stages.map(i => c.lessons.find(l => l.index === i)).filter(Boolean).map(l => {
            const [Icon, label] = l.index === c.capstone ? [Trophy, 'مشروع ختامي'] : TEMPLATE[l.template] || TEMPLATE.mixed;
            return <li key={l.index}>
              <button type="button" className={styles.lesson} disabled={!l.valid || busy === c.slug + l.index} onClick={() => play(c.slug, l.index)}>
                <span className={styles.icon} aria-hidden="true"><Icon size={22}/></span>
                <span className={styles.text}><strong>الدرس {l.index + 1}: {l.title}</strong><small>{label} · {l.minutes} دقائق</small>
                  {!l.valid && <small className={styles.bad}><AlertTriangle size={13} aria-hidden="true"/> {l.error}</small>}</span>
                <ArrowLeft size={18} aria-hidden="true"/>
              </button>
            </li>;
          })}
        </ol>
      </div>)}
    </section>)}
    {open && <CardLessonPlayer key={open.slug + open.index} preview closeLabel="العودة إلى قائمة التجربة" onClose={() => setOpen(null)}
      slug={open.slug} stageIndex={open.index} lesson={open.lesson} guestSnapshot={open.snapshot} courseTitle={open.course} hasNext={false}/>}
  </div>;
}

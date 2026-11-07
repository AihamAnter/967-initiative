'use client';
// مدرسة 967 — محرر دروس البطاقات (الإصدار الثاني) داخل استوديو المدرسة.
// الحقول المشتركة بنماذج، وتفاصيل كل نوع تفاعل/عنصر مرئي بـ JSON يبدأ من نموذج صالح. التحقق حي، والمعاينة محلية.
import {useMemo, useState} from 'react';
import {ArrowUp, ArrowDown, Trash2, Plus, Eye, CheckCircle2, AlertTriangle} from 'lucide-react';
import {validateCardLesson, TASK_KINDS, VISUAL_KINDS, CARD_ROLES, LESSON_TEMPLATES} from '@/lib/schoolCards';
import {cardSnapshot} from '@/lib/schoolCardProgress';
import {TEMPLATE_LABELS, ROLE_LABELS, TASK_LABELS, VISUAL_LABELS, taskStarter, visualStarter, nextCardId} from '@/lib/schoolCardStarters';
import CardLessonPlayer from '../CardLessonPlayer';
import styles from './CardLessonEditor.module.css';

const TASK_COMMON = ['kind', 'context', 'prompt', 'hint', 'explain'];
const VISUAL_COMMON = ['kind', 'alt'];
const omit = (obj, keys) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => !keys.includes(k)));

// حقل JSON: يحتفظ بالنص أثناء الكتابة، ولا يرسل التغيير إلا إذا كان JSON صالحًا.
function JsonField({label, value, onChange}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 1));
  const [bad, setBad] = useState('');
  return <label className={styles.field}>{label}
    <textarea dir="ltr" spellCheck={false} rows={Math.min(14, Math.max(4, text.split('\n').length))} value={text} aria-invalid={Boolean(bad)}
      onChange={e => { setText(e.target.value); try { const v = JSON.parse(e.target.value); if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('كائن JSON مطلوب'); setBad(''); onChange(v); } catch (err) { setBad(err.message); } }}/>
    {bad && <small className={styles.bad} role="alert">JSON غير صالح: {bad}</small>}
  </label>;
}

function CardEditor({card, index, total, onChange, onMove, onRemove}) {
  const set = patch => onChange({...card, ...patch});
  const task = card.task, visual = card.visual;
  return <li className={styles.card}>
    <div className={styles.cardHead}>
      <strong>البطاقة {index + 1}</strong><span>{ROLE_LABELS[card.role]}{task ? ' · ' + TASK_LABELS[task.kind] : ''}</span>
      <div className={styles.tools}>
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label="نقل لأعلى"><ArrowUp size={16}/></button>
        <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="نقل لأسفل"><ArrowDown size={16}/></button>
        <button type="button" onClick={onRemove} aria-label="حذف البطاقة"><Trash2 size={16}/></button>
      </div>
    </div>
    <div className={styles.grid}>
      <label className={styles.field}>المعرّف (حروف إنجليزية صغيرة وأرقام وشرطة)<input dir="ltr" value={card.id} maxLength={40} onChange={e => set({id: e.target.value})}/></label>
      <label className={styles.field}>الدور<select value={card.role} onChange={e => set({role: e.target.value})}>{CARD_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></label>
    </div>
    <label className={styles.field}>العنوان (اختياري)<input value={card.title || ''} maxLength={70} onChange={e => set({title: e.target.value || undefined})}/></label>
    <label className={styles.field}>النص (اختياري، سطران أو ثلاثة)<textarea rows={2} maxLength={260} value={card.text || ''} onChange={e => set({text: e.target.value || undefined})}/></label>

    <fieldset className={styles.box}><legend>العنصر المرئي</legend>
      <select value={visual?.kind || ''} onChange={e => set({visual: e.target.value ? visualStarter(e.target.value) : undefined})}>
        <option value="">بلا عنصر مرئي</option>{VISUAL_KINDS.map(k => <option key={k} value={k}>{VISUAL_LABELS[k]}</option>)}
      </select>
      {visual && <>
        <label className={styles.field}>الوصف النصي لقارئ الشاشة (alt)<input value={visual.alt || ''} maxLength={240} onChange={e => set({visual: {...visual, alt: e.target.value}})}/></label>
        <JsonField key={'v-' + card.id + visual.kind} label="تفاصيل العنصر" value={omit(visual, VISUAL_COMMON)} onChange={v => set({visual: {kind: visual.kind, alt: visual.alt, ...v}})}/>
      </>}
    </fieldset>

    <fieldset className={styles.box}><legend>التفاعل</legend>
      <select value={task?.kind || ''} onChange={e => set({task: e.target.value ? taskStarter(e.target.value) : undefined})}>
        <option value="">بلا تفاعل (بطاقة شرح)</option>{TASK_KINDS.map(k => <option key={k} value={k}>{TASK_LABELS[k]}</option>)}
      </select>
      {task && <>
        <label className={styles.field}>السياق (اختياري: الموقف والأرقام)<textarea rows={2} maxLength={220} value={task.context || ''} onChange={e => set({task: {...task, context: e.target.value || undefined}})}/></label>
        <label className={styles.field}>السؤال (سؤال واحد، 140 حرفًا بحد أقصى)<input value={task.prompt || ''} maxLength={140} onChange={e => set({task: {...task, prompt: e.target.value}})}/></label>
        <JsonField key={'t-' + card.id + task.kind} label="بيانات التفاعل والإجابة" value={omit(task, TASK_COMMON)} onChange={v => set({task: {...v, kind: task.kind, context: task.context, prompt: task.prompt, hint: task.hint, explain: task.explain}})}/>
        <label className={styles.field}>التلميح (يقرّب ولا يكشف)<input value={task.hint || ''} maxLength={240} onChange={e => set({task: {...task, hint: e.target.value || undefined}})}/></label>
        <label className={styles.field}>الشرح (لماذا)<textarea rows={2} maxLength={600} value={task.explain || ''} onChange={e => set({task: {...task, explain: e.target.value}})}/></label>
      </>}
    </fieldset>
  </li>;
}

export default function CardLessonEditor({value, onChange, slug = 'preview'}) {
  const [preview, setPreview] = useState(false);
  const check = useMemo(() => {
    try {
      const {lesson, keys} = validateCardLesson(value);
      const graded = Object.keys(keys).length, visuals = lesson.cards.filter(c => c.visual || c.task?.kind === 'hotspot').length;
      return {ok: true, lesson, graded, visuals, cards: lesson.cards.length};
    } catch (e) { return {ok: false, error: e.message}; }
  }, [value]);
  const cards = value.cards || [];
  const set = patch => onChange({...value, ...patch});
  const setCards = next => set({cards: next});
  const move = (i, d) => { const next = [...cards]; [next[i], next[i + d]] = [next[i + d], next[i]]; setCards(next); };
  const add = kind => setCards([...cards, kind === 'explain'
    ? {id: nextCardId(cards, 'idea'), role: 'explain', title: 'عنوان الفكرة', text: 'اشرح الفكرة هنا.', visual: visualStarter('layers')}
    : {id: nextCardId(cards, 'practice'), role: 'practice', visual: visualStarter('scene'), task: taskStarter('choice')}]);

  return <div className={styles.editor}>
    <div className={styles.status} data-ok={check.ok || undefined} role="status">
      {check.ok ? <><CheckCircle2 size={18} aria-hidden="true"/> الدرس صالح: {check.cards} بطاقات، {check.graded} تفاعلات، عنصر مرئي في {check.visuals} منها.</>
        : <><AlertTriangle size={18} aria-hidden="true"/> {check.error}</>}
      <button type="button" disabled={!check.ok} onClick={() => setPreview(true)}><Eye size={16} aria-hidden="true"/> معاينة الدرس</button>
    </div>

    <div className={styles.grid}>
      <label className={styles.field}>عنوان الدرس<input value={value.title || ''} maxLength={90} onChange={e => set({title: e.target.value})}/></label>
      <label className={styles.field}>القالب<select value={value.template} onChange={e => set({template: e.target.value})}>{LESSON_TEMPLATES.map(t => <option key={t} value={t}>{TEMPLATE_LABELS[t]}</option>)}</select></label>
    </div>
    <label className={styles.field}>سطر يشرح ما سيتعلمه الطالب<input value={value.subtitle || ''} maxLength={180} onChange={e => set({subtitle: e.target.value})}/></label>
    <div className={styles.grid}>
      <label className={styles.field}>المدة بالدقائق<input type="number" min={2} max={12} value={value.minutes || 4} onChange={e => set({minutes: Number(e.target.value)})}/></label>
      <label className={styles.field}>«ما تعلمته» (نقطة في كل سطر، 2 إلى 4)<textarea rows={3} value={(value.summary || []).join('\n')} onChange={e => set({summary: e.target.value.split('\n')})}/></label>
    </div>

    <ol className={styles.cards}>
      {cards.map((card, i) => <CardEditor key={i} card={card} index={i} total={cards.length}
        onChange={c => setCards(cards.map((x, n) => n === i ? c : x))} onMove={d => move(i, d)} onRemove={() => setCards(cards.filter((_, n) => n !== i))}/>)}
    </ol>
    <div className={styles.addRow}>
      <button type="button" disabled={cards.length >= 12} onClick={() => add('explain')}><Plus size={16} aria-hidden="true"/> بطاقة شرح</button>
      <button type="button" disabled={cards.length >= 12} onClick={() => add('practice')}><Plus size={16} aria-hidden="true"/> بطاقة تمرين</button>
    </div>
    <p className={styles.note}>القواعد: أول بطاقة تحدٍّ، ولا أكثر من بطاقتي شرح متتاليتين، ومن 4 إلى 8 تفاعلات، وعنصر مرئي في 70% من البطاقات على الأقل، وأرقام غربية. بيانات «اليمن بالأرقام» تظهر في الدرس المنشور فقط.</p>

    {preview && check.ok && <CardLessonPlayer preview onClose={() => setPreview(false)} slug={slug} stageIndex={0}
      lesson={check.lesson} guestSnapshot={cardSnapshot(value)} courseTitle="المعاينة" hasNext={false}/>}
  </div>;
}

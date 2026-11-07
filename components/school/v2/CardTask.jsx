'use client';
// عرض التفاعل داخل البطاقة: اختيار، توقّع، صح/خطأ، كتابة هنا؛ بقية الأنواع في CardInteractions.
import {useState} from 'react';
import {Check, X, HelpCircle} from 'lucide-react';
import {INTERACTIONS, HOW_MORE, interactionReady} from './CardInteractions';
import styles from './CardLessonPlayer.module.css';

// مثال «كيف أجيب؟» لكل نوع.
const HOW = {
  choice: 'اضغط على الإجابة التي تراها صحيحة، ثم اضغط «تحقق».',
  predict: 'اختر ما تتوقع أن يحدث. لا بأس إن أخطأت؛ سترى ما يحدث فعلًا بعد «تحقق».',
  truefalse: 'لكل عبارة اضغط «صح» أو «خطأ»، ثم اضغط «تحقق».',
  type: 'اكتب الكلمة أو الرقم في المربع، ثم اضغط «تحقق». لا تقلق من التشكيل أو الهمزات.',
  ...HOW_MORE,
};

export function taskReady(task, value) {
  if (!task) return true;
  if (task.kind === 'choice' || task.kind === 'predict') return Number.isInteger(value);
  if (task.kind === 'truefalse') return Array.isArray(value) && value.length === task.statements.length && value.every(v => typeof v === 'boolean');
  if (task.kind === 'type') return typeof value === 'string' && value.trim().length > 0;
  return interactionReady(task, value);
}

export default function CardTask({task, value, onChange, locked, feedback}) {
  const [help, setHelp] = useState(false);
  if (!task) return null;
  const reveal = feedback?.reveal;
  return <div className={styles.task}>
    {task.context && <p className={styles.context}>{task.context}</p>}
    <h2 className={styles.prompt}>{task.prompt}</h2>
    <div className={styles.instruction}>
      <span>{task.instruction}</span>
      {HOW[task.kind] && <button type="button" className={styles.howButton} aria-expanded={help} onClick={() => setHelp(v => !v)}><HelpCircle size={15} aria-hidden="true"/> كيف أجيب؟</button>}
    </div>
    {help && <p className={styles.how} role="note">{HOW[task.kind]}</p>}

    {(task.kind === 'choice' || task.kind === 'predict') && <div role="radiogroup" aria-label="الخيارات" className={styles.options}>
      {task.options.map((option, i) => {
        const rightIndex = feedback?.done ? (feedback.correct ? value : reveal) : null;
        const state = rightIndex === i ? 'right' : feedback?.done && !feedback.correct && i === value ? 'wrong' : feedback && !feedback.correct && i === value ? 'wrong' : '';
        return <button type="button" role="radio" key={i} aria-checked={value === i} disabled={locked} data-state={state || undefined}
          className={styles.option} onClick={() => onChange(i)}>
          <span className={styles.optionMark} aria-hidden="true">{state === 'right' ? <Check size={16}/> : state === 'wrong' ? <X size={16}/> : ['أ', 'ب', 'ج', 'د'][i]}</span>
          <span>{option}</span>
        </button>;
      })}
    </div>}

    {task.kind === 'truefalse' && <div className={styles.statements}>
      {task.statements.map((statement, i) => {
        const current = Array.isArray(value) ? value[i] : undefined;
        const set = v => { const next = Array.isArray(value) ? [...value] : Array(task.statements.length).fill(undefined); next[i] = v; onChange(next); };
        const right = Array.isArray(reveal) ? reveal[i] : undefined;
        return <div key={i} className={styles.statement} data-wrong={feedback?.done && right !== undefined && right !== current || undefined}>
          <p>{statement}</p>
          <div className={styles.tf} role="radiogroup" aria-label={'العبارة ' + (i + 1)}>
            <button type="button" role="radio" aria-checked={current === true} disabled={locked} onClick={() => set(true)}>صح</button>
            <button type="button" role="radio" aria-checked={current === false} disabled={locked} onClick={() => set(false)}>خطأ</button>
          </div>
          {feedback?.done && right !== undefined && right !== current && <small className={styles.revealNote}>الصواب: {right ? 'صح' : 'خطأ'}</small>}
        </div>;
      })}
    </div>}

    {task.kind === 'type' && <label className={styles.typeField}>
      <span className="sr-only">إجابتك</span>
      <input type="text" dir="auto" maxLength={80} value={value || ''} disabled={locked} onChange={e => onChange(e.target.value)} placeholder="اكتب إجابتك هنا"/>
      {feedback?.done && Array.isArray(reveal) && <small className={styles.revealNote}>الصواب: {reveal[0]}</small>}
    </label>}

    {INTERACTIONS[task.kind] && (() => { const Interaction = INTERACTIONS[task.kind]; return <Interaction task={task} value={value} onChange={onChange} locked={locked} feedback={feedback}/>; })()}

    {task.kind === 'predict' && feedback?.done && task.reveal && <div className={styles.reveal}><strong>ما يحدث فعلًا</strong><p>{task.reveal.text}</p></div>}
  </div>;
}

'use client';
// مدرسة 967 — إعدادات مسار البطاقات في الاستوديو: الصيغة، والوحدات (سطر لكل وحدة)، والمشروع الختامي.
import {useState} from 'react';
import {parseUnits, unitsText as toText} from '@/lib/schoolJourney';
import styles from './CardLessonEditor.module.css';

export default function CourseUnitsEditor({value, onChange}) {
  const [text, setText] = useState(() => toText(value.units));
  const [error, setError] = useState('');
  const cards = value.format === 2;
  return <fieldset className={styles.box}><legend>مسار البطاقات (الإصدار الثاني)</legend>
    <label className={styles.field} style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
      <input type="checkbox" style={{width: 20, minHeight: 20}} checked={cards} onChange={e => onChange({...value, format: e.target.checked ? 2 : undefined})}/>
      يُعرض المسار بخريطة الرحلة ودروس البطاقات
    </label>
    <label className={styles.field}>الوحدات (سطر لكل وحدة: «العنوان: أرقام المحطات»)
      <textarea rows={4} value={text} placeholder={'السوق والاختيار: 1، 2، 3\nالأسعار والريال: 4، 5، 6'} aria-invalid={Boolean(error)}
        onChange={e => { setText(e.target.value); const r = parseUnits(e.target.value); setError(r.error || ''); if (!r.error) onChange({...value, units: r.units}); }}/>
      {error && <small className={styles.bad} role="alert">{error}</small>}
    </label>
    <label className={styles.field}>المشروع الختامي
      <select value={Number.isInteger(value.capstone) ? value.capstone : ''} onChange={e => onChange({...value, capstone: e.target.value === '' ? undefined : Number(e.target.value)})}>
        <option value="">بلا مشروع ختامي</option>
        {Array.from({length: 12}, (_, i) => <option key={i} value={i}>المحطة {i + 1}</option>)}
      </select>
    </label>
  </fieldset>;
}

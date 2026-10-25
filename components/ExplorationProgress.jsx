'use client';

import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {Check, ChevronDown, Compass, RotateCcw, Trophy} from 'lucide-react';
import {formatNumber} from '@/lib/format';
import {addExplorationId, restoreExplorationIds} from '@/lib/exploration';
import styles from './ExplorationProgress.module.css';

export function useExplorationTrail(storageKey, catalog) {
  const [ids, setIds] = useState([]);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;

  useEffect(() => {
    try {
      const restored = restoreExplorationIds(sessionStorage.getItem(storageKey), catalogRef.current);
      setIds(current => restoreExplorationIds(JSON.stringify([...restored, ...current]), catalogRef.current));
    } catch { /* Storage is optional; exploring still works. */ }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(ids)); setSaved(true); }
    catch { setSaved(false); }
  }, [ids, ready, storageKey]);

  const explore = useCallback(id => setIds(current => addExplorationId(current, id, catalogRef.current)), []);
  const restart = useCallback(() => setIds([]), []);
  const items = ids.map(id => catalog.find(item => item.id === id)).filter(Boolean).map(item => ({id:item.id, label:item.name}));
  return [items, explore, restart, saved];
}

export default function ExplorationProgress({items, goal = 3, title, description, completeLabel, tone = 'green', onRestart, persistent = false}) {
  const titleId = useId();
  const descriptionId = useId();
  const count = Math.min(items.length, goal);
  const complete = count === goal;
  const Icon = complete ? Trophy : Compass;

  return <aside className={`${styles.trail} ${tone === 'blue' ? styles.blue : ''} ${complete ? styles.completed : ''}`} aria-labelledby={titleId} data-exploration={tone}>
    <details className={styles.disclosure}>
      <summary className={styles.summary}>
        <span className={styles.icon}><Icon size={21} aria-hidden="true"/></span>
        <span className={styles.summaryCopy}><strong id={titleId}>{title}</strong><span className={styles.summaryMeta}>{complete?'جولة مكتملة':'جولة اكتشاف'} · المحطات: {formatNumber(count)} من {formatNumber(goal)}</span><progress className={styles.progress} value={count} max={goal} aria-labelledby={titleId} aria-describedby={descriptionId}/></span>
        <span className={styles.toggle}><span className={styles.closedLabel}>عرض الجولة</span><span className={styles.openLabel}>طي الجولة</span><ChevronDown size={16} aria-hidden="true"/></span>
      </summary>
    <div className={styles.content}>
      <p id={descriptionId} className={styles.description}>{description}</p>
      <ol className={styles.milestones} aria-label="محطات جولتك">{Array.from({length:goal}, (_, index) => {
        const item = items[index];
        return <li key={index} className={item ? styles.visited : ''}><span className={styles.step} aria-hidden="true">{item ? <Check size={14}/> : formatNumber(index + 1)}</span><span>{item ? item.label : `المحطة ${formatNumber(index + 1)}`}</span></li>;
      })}</ol>
      <div className={styles.footer}>
        <div>{complete ? <span className={styles.complete}><Trophy size={16} aria-hidden="true"/>{completeLabel}</span> : <span>{persistent ? 'محطاتك محفوظة في هذه التبويبة.' : 'كل اختيار جديد يضيف محطة إلى جولتك.'}</span>}</div>
        {count > 0 && onRestart && <button type="button" onClick={onRestart} className={styles.restart}><RotateCcw size={14} aria-hidden="true"/>جولة جديدة</button>}
      </div>
    </div>
    </details>
    <span className="sr-only" role="status" aria-atomic="true">المحطات المستكشفة: {formatNumber(count)} من {formatNumber(goal)}. {complete&&completeLabel}</span>
  </aside>;
}

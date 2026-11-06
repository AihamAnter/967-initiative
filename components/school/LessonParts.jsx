'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import styles from './LessonPlayer.module.css';

// Shared pieces of the lesson player (redesign v2, batch C). They only arrange
// what each lesson already renders; attempts, drafts and grading stay in the
// lesson components.

// When the step or question changes, bring the top of the player back into view
// if the reader had scrolled past it (the first render never scrolls).
export function usePlayerTop(key){
  const ref = useRef(null), first = useRef(true);
  useEffect(() => {
    if (first.current) {first.current = false; return;}
    const node = ref.current;
    if (!node || node.getBoundingClientRect().top >= 0) return;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    node.scrollIntoView({block: 'start', behavior: calm ? 'auto' : 'smooth'});
  }, [key]);
  return ref;
}

// One segment per step: done, current, still ahead.
export function StepSegments({total, current, label, valueNow = current + 1}) {
  const count = Math.max(1, Number(total) || 1);
  return <div className={styles.segments} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={count} aria-valuenow={valueNow}>
    {Array.from({length: count}, (_, i) => <span key={i} data-state={i < current ? 'done' : i === current ? 'current' : 'next'}/>)}
  </div>;
}

// A small coloured badge naming what kind of step this is.
export function StepKicker({icon: Icon, children, tone}) {
  return <span className={styles.kicker} data-tone={tone}>{Icon && <span className={styles.kickerIcon}><Icon size={16} aria-hidden="true"/></span>}{children}</span>;
}

// Learn-before-you-try steps with a pinned bar: previous, next, and on the last
// step the lesson's own start button (passed in as `finish`).
export function LessonStepper({steps, finish, label = 'تقدم شرح المحطة', headingId}) {
  const list = steps.filter(Boolean);
  const [step, setStep] = useState(0);
  const top = usePlayerTop(step);
  const current = list[Math.min(step, list.length - 1)];
  const last = step >= list.length - 1;
  return <section ref={top} className={styles.player} aria-labelledby={headingId}>
    <div className={styles.progressRow}>
      <StepSegments total={list.length} current={step} label={label}/>
      <span className={styles.count}>{step + 1}/{list.length}</span>
    </div>
    <div className={styles.card} key={current.key}>
      <StepKicker icon={current.icon} tone={current.tone}>{current.kicker}</StepKicker>
      <h2 id={headingId}>{current.title}</h2>
      {current.content}
    </div>
    <div className={styles.bar}>
      <button type="button" className={styles.prev} disabled={step === 0} onClick={() => setStep(n => Math.max(0, n - 1))}><ArrowRight size={17} aria-hidden="true"/> السابق</button>
      {last ? finish : <button type="button" className={styles.next} onClick={() => setStep(n => Math.min(list.length - 1, n + 1))}>{current.nextLabel || 'التالي'} <ArrowLeft size={17} aria-hidden="true"/></button>}
    </div>
  </section>;
}

// Score as a ring: the share of correct answers, with the number in the middle.
export function ScoreRing({score, total, passed}) {
  const ratio = total ? Math.max(0, Math.min(1, score / total)) : 0;
  const r = 34, c = 2 * Math.PI * r;
  return <div className={styles.ring} data-passed={passed ? 'true' : 'false'}>
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r={r} className={styles.ringTrack}/>
      <circle cx="40" cy="40" r={r} className={styles.ringValue} strokeDasharray={c} strokeDashoffset={c * (1 - ratio)}/>
    </svg>
    <strong dir="ltr">{score}<small>/{total}</small></strong>
  </div>;
}

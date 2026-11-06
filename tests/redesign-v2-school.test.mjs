import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('shared lesson player: segmented progress, step stepper, pinned bar and score ring', () => {
  const parts = read('components/school/LessonParts.jsx');
  for (const name of ['export function StepSegments', 'export function StepKicker', 'export function LessonStepper', 'export function ScoreRing', 'export function usePlayerTop'])
    assert.ok(parts.includes(name), name);
  assert.ok(parts.includes('role="progressbar"'));
  assert.ok(parts.includes("{last ? finish : <button"));
  const css = read('components/school/LessonPlayer.module.css');
  assert.ok(css.includes('.bar{position:sticky'));
  assert.ok(css.includes(':global(body:has(.ed-tabbar)) .bar'));
  assert.ok(css.includes('@media (prefers-reduced-motion:reduce)'));
  assert.ok(read('app/foundation/identity.css').includes('--lp-accent: var(--c-leaf, #3a7337)'));
});

test('custom-course lesson keeps every gate while using the player', () => {
  const guided = read('components/school/SchoolGuidedLesson.jsx');
  for (const token of ['<StepSegments total={total} current={step} label="تقدم شرح المحطة"/>', 'className={player.bar}', 'onClick={()=>onStart(labProof)}',
    'disabled={busy||(requireExercise&&!labComplete&&!hasActiveAttempt)}', "['science','civic','morse','gates'].includes(stage.lab?.kind)", 'onComplete={setLabProof}'])
    assert.ok(guided.includes(token), token);
  const generic = read('components/school/GenericSchoolLesson.jsx');
  for (const token of ['className={player.choice}', 'aria-pressed={selection===i}', "task.kind==='order'", "task.kind==='type'", 'maxLength={80}',
    'draft.save({answers,selection})', 'draft.save({answers:all,selection:null})', '<ScoreRing score={result.score} total={result.total} passed={result.passed}/>',
    'العودة إلى شرح الدرس', 'مراجعة التطبيق ثم إعادة المحاولة'])
    assert.ok(generic.includes(token), token);
});

test('musnad and arud intros become short steps with the same content and start buttons', () => {
  const musnad = read('components/school/SchoolLesson.jsx');
  for (const token of ['<LessonStepper headingId="musnad-step-title"', 'stage.tips.map', 'className={styles.letterTable}', 'className={styles.exampleSequence}',
    "'ابدأ المحطة'", 'href="/school/writing/musnad/alphabet"', 'href="/school/writing/musnad/practice"', 'href={MUSNAD_SOURCE}', '<ScoreRing'])
    assert.ok(musnad.includes(token), token);
  const arud = read('components/school/ArudLesson.jsx');
  for (const token of ['<LessonStepper headingId="arud-step-title"', 'stage.examples.map', "'ابدأ التدريب'", 'aria-label="حذف آخر رمز"', '<ScoreRing'])
    assert.ok(arud.includes(token), token);
  // The answer button stays within reach while answering.
  assert.ok(read('app/school/school.module.css').includes('.quizFooter{position:sticky'));
  assert.ok(read('app/school/writing/arud/arud.module.css').includes('.questionFooter{position:sticky'));
});

test('stations read as compact rows and the English label is gone', () => {
  assert.ok(read('components/school/SchoolCourseMap.module.css').includes('.timelineStage:before,.timelineStage:after{content:none;display:none}'));
  assert.ok(read('app/school/school.module.css').includes('grid-template-areas:"num copy top" "num copy foot"'));
  assert.ok(read('app/school/writing/arud/arud.module.css').includes('grid-template-areas:"idx chap status" "idx title status" "idx text bottom"'));
  assert.ok(!read('components/school/SchoolJourney.jsx').includes('967 SCHOOL'));
  assert.ok(!read('components/school/ArudJourney.jsx').includes('ARUD 967'));
});

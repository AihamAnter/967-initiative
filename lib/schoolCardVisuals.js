// مدرسة 967 — الإصدار الثاني: حسابات العناصر المرئية (بلا واجهة، قابلة للاختبار).

// اختصار الأرقام الكبيرة بالعربية مع أرقام غربية.
export function compactNumber(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  const a = Math.abs(n), t = (v, u) => (Math.round(v * 10) / 10).toLocaleString('en-US') + ' ' + u;
  if (a >= 1e9) return t(n / 1e9, 'مليار');
  if (a >= 1e6) return t(n / 1e6, 'مليون');
  if (a >= 1e4) return t(n / 1e3, 'ألف');
  return (Math.round(n * 100) / 100).toLocaleString('en-US');
}

// أربع درجات متساوية بين أصغر قيمة وأكبرها لخريطة القيم.
export function choroplethSteps(values) {
  const nums = Object.values(values || {}).filter(v => typeof v === 'number' && Number.isFinite(v));
  if (!nums.length) return {step: () => undefined, min: 0, max: 0};
  const min = Math.min(...nums), max = Math.max(...nums);
  return {min, max, step: v => typeof v !== 'number' ? undefined : max === min ? 4 : Math.min(4, 1 + Math.floor((v - min) / (max - min) * 4))};
}

// يحوّل قيمة مؤشر التفاعل إلى إزاحة منحنى (−25..25) حين يرتبط الرسم به (bind).
export function bindShift(visual, task, value) {
  if (!visual?.bind || task?.kind !== 'slider' || typeof value !== 'number') return 0;
  const span = task.max - task.min || 1;
  return Math.max(-25, Math.min(25, (value - task.initial) / span * 50));
}

export const lessonVisuals = lesson => lesson.cards.flatMap(c => [c.visual, c.task?.visual, c.task?.reveal?.visual]).filter(Boolean);

// سلسلة مؤشر «اليمن بالأرقام» للرسم: [سنة، قيمة] ضمن المدى، ومصدر آخر قيمة.
export function statSeries(indicator, years) {
  if (!indicator?.values?.length) return null;
  const [from, to] = Array.isArray(years) ? years : [-Infinity, Infinity];
  const rows = indicator.values.map(v => ({year: Number(v.year), value: Number(v.value), source: v.source}))
    .filter(v => Number.isFinite(v.year) && Number.isFinite(v.value) && v.year >= from && v.year <= to);
  if (rows.length < 2) return null;
  const source = rows.at(-1).source || indicator.adopted_source || null;
  return {name: indicator.name, unit: indicator.unit || '', points: rows.map(v => [v.year, v.value]),
    source: source ? {name: source.publisher || source.name || '', url: /^https:\/\//.test(source.url || '') ? source.url : ''} : null};
}

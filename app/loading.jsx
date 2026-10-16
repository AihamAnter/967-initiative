export default function Loading() {
  return <div className="container section" role="status" aria-live="polite"><p>جارٍ تحميل المحتوى…</p><div className="quiet-empty" aria-hidden="true" style={{minHeight:180, background:'var(--soft-primary)'}}/></div>;
}

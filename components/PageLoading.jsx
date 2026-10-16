// Use at leaf routes only: an ancestor loading boundary can stream HTTP 200
// before a missing detail record is known, preventing a genuine HTTP 404.
export default function PageLoading() {
  return <div className="container section" role="status" aria-live="polite" style={{minHeight:'calc(100svh - 76px)'}}><p>جارٍ تحميل المحتوى…</p><div className="quiet-empty" aria-hidden="true" style={{minHeight:180, background:'var(--soft-primary)'}}/></div>;
}

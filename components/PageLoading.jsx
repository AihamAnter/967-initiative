// Use at leaf routes only: an ancestor loading boundary can stream HTTP 200
// before a missing detail record is known, preventing a genuine HTTP 404.
import LoadingState from '@/components/LoadingState';

export default function PageLoading() {
  return <div className="ed-loading-page"><LoadingState title="نجهّز المحتوى…" description="نجمع البيانات ونرتّبها قبل العرض."/></div>;
}

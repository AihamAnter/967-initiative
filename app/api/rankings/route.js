import {getRankingCatalog, getRankingDataset} from '@/lib/rankingData';
import {isRankingSlug} from '@/lib/rankings';
import {rankingFailure, rankingJson} from '@/lib/rankingAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const slug = new URL(request.url).searchParams.get('indicator');
  if (!isRankingSlug(slug)) return rankingFailure('المؤشر غير موجود.', 404);
  try {
    const {indicators} = await getRankingCatalog();
    const indicator = indicators.find(item => item.slug === slug && item.is_published === true);
    if (!indicator) return rankingFailure('المؤشر غير موجود.', 404);
    return rankingJson({indicator, dataset: await getRankingDataset(indicator)});
  } catch (error) {
    console.error('ranking public read failed', error?.code || error?.name || 'service');
    return rankingFailure('تعذر تحميل بيانات الترتيب حالياً. أعد المحاولة.', 503);
  }
}

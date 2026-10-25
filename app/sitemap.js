import {
  getIssues,
  getProfessionals,
  getStatIndicators,
  getStatSections,
  getYemeniCompanies,
  getYemeniFigures,
  getWorks,
  getContentPages,
  getSiteSettings,
} from '@/lib/data';
import {buildSitemap, isIndexableDeployment} from '@/lib/seo';
import {getDebateCatalog} from '@/lib/debateServer';
import {collectPublicSources} from '@/lib/publicSourceCollection';
import {recordOperationalEvent} from '@/lib/operationalEvents';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  if (!isIndexableDeployment()) return [];
  const {data}=await collectPublicSources({issues:getIssues,companies:getYemeniCompanies,professionals:getProfessionals,figures:getYemeniFigures,statSections:getStatSections,statIndicators:getStatIndicators,works:getWorks,contentPages:getContentPages,debates:async()=>{
    const result=await getDebateCatalog();if(!result.available)throw new Error('Unavailable');return result.debates;
  }},{onUnavailable:source=>recordOperationalEvent('source_unavailable',{source,area:'sitemap'})});
  const settings=await getSiteSettings();
  return buildSitemap({...data,pageVisibility:settings.pageVisibility});
}

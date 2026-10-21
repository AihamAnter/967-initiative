import {
  getIssues,
  getProfessionals,
  getStatIndicators,
  getStatSections,
  getYemeniCompanies,
  getYemeniFigures,
  getWorks,
  getContentPages,
} from '@/lib/data';
import {buildSitemap, isIndexableDeployment} from '@/lib/seo';
import {getDebateCatalog} from '@/lib/debateServer';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  if (!isIndexableDeployment()) return [];
  const [issues, companies, professionals, figures, statSections, statIndicators, works,contentPages] = await Promise.all([
    getIssues(),
    getYemeniCompanies(),
    getProfessionals(),
    getYemeniFigures(),
    getStatSections(),
    getStatIndicators(),
    getWorks(),
    getContentPages(),
  ]);

  const {debates}=await getDebateCatalog();
  return buildSitemap({issues, companies, professionals, figures, statSections, statIndicators, works,contentPages,debates});
}

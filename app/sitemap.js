import {
  getIssues,
  getProfessionals,
  getStatIndicators,
  getStatSections,
  getYemeniCompanies,
  getYemeniFigures,
  getWorks,
} from '@/lib/data';
import {buildSitemap, isIndexableDeployment} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  if (!isIndexableDeployment()) return [];
  const [issues, companies, professionals, figures, statSections, statIndicators, works] = await Promise.all([
    getIssues(),
    getYemeniCompanies(),
    getProfessionals(),
    getYemeniFigures(),
    getStatSections(),
    getStatIndicators(),
    getWorks(),
  ]);

  return buildSitemap({issues, companies, professionals, figures, statSections, statIndicators, works});
}

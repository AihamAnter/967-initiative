import {
  getIssues,
  getProfessionals,
  getStatIndicators,
  getStatSections,
  getYemeniCompanies,
  getYemeniFigures,
  getWorks,
} from '@/lib/data';

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const [issues, companies, professionals, figures, statSections, statIndicators, works] = await Promise.all([
    getIssues(),
    getYemeniCompanies(),
    getProfessionals(),
    getYemeniFigures(),
    getStatSections(),
    getStatIndicators(),
    getWorks(),
  ]);

  return [
    {url: base, changeFrequency: 'weekly', priority: 1},
    {url: base + '/works', changeFrequency: 'weekly', priority: .8},
    {url: base + '/contribute', changeFrequency: 'monthly', priority: .6},
    {url: base + '/magazine', changeFrequency: 'weekly', priority: .9},
    {url: base + '/yemen-map', changeFrequency: 'monthly', priority: .85},
    {url: base + '/yemeni-products', changeFrequency: 'weekly', priority: .85},
    {url: base + '/professionals', changeFrequency: 'weekly', priority: .85},
    {url: base + '/yemen-in-numbers', changeFrequency: 'weekly', priority: .9},
    {url: base + '/yemen-in-numbers/timeline', changeFrequency: 'weekly', priority: .8},
    ...statSections.flatMap(section => section.domains.map(domain => ({url: base + '/yemen-in-numbers/' + domain.slug, changeFrequency: 'weekly', priority: .75}))),
    ...statIndicators.map(indicator => ({url: base + '/yemen-in-numbers/indicator/' + indicator.slug, lastModified: indicator.updated_at, changeFrequency: 'monthly', priority: .75})),
    ...figures.filter(figure=>!figure.isDemo).map(figure => ({url: base + '/yemen-map/figures/' + figure.slug, changeFrequency: 'monthly', priority: .72})),
    ...works.map(work=>({url:base+'/works/'+work.slug,lastModified:work.published_at,changeFrequency:'monthly',priority:.75})),
    ...professionals.filter(person=>!person.isDemo).map(person => ({url: base + '/professionals/' + person.id, changeFrequency: 'monthly', priority: .7})),
    ...companies.filter(company=>!company.isDemo).map(company => ({url: base + '/yemeni-products/' + company.id, changeFrequency: 'monthly', priority: .7})),
    ...issues.map(issue => ({url: base + '/magazine/' + issue.slug, lastModified: issue.issue_date, changeFrequency: 'monthly', priority: .75})),
  ];
}

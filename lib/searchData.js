import 'server-only';
import {cache} from 'react';
import {getWorks, getIssues, getStatIndicators, getStatSections, getYemeniFigures, getYemeniCompanies, getProfessionals, getSiteSettings} from './data';
import {buildSearchIndex, searchTypes} from './search';
import {getSearchPlaces} from './searchPlaces';
import {searchPages, getSettingsSearchPages} from './searchPages';
import {demoIssue} from './config';

export const getSearchData = cache(async () => {
  const names = ['works', 'issues', 'indicators', 'figures', 'companies', 'professionals', 'sections', 'places', 'settings'];
  const results = await Promise.allSettled([getWorks(), getIssues(), getStatIndicators(), getYemeniFigures(), getYemeniCompanies(), getProfessionals(), getStatSections(), getSearchPlaces(), getSiteSettings()]);
  const content = {pages:searchPages}, unavailable = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if(names[index]==='settings')content.pages=getSettingsSearchPages(result.value);
      else if(names[index]==='places'){content.places=result.value.places;unavailable.push(...result.value.unavailable);}
      else content[names[index]] = result.value;
    } else unavailable.push(searchTypes[names[index]]||'مجالات المرصد');
  });
  if(content.issues&&!content.issues.length)content.issues=[demoIssue];
  return {items: buildSearchIndex(content), unavailable};
});

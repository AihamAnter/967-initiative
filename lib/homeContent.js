import {selectFeaturedDebate, httpsUrl} from './debates.js';
import {workThumbnail} from './media.js';

// The home page does not need directory biographies, contacts or product JSON.
export const homeProjections={
 works:'id,slug,title,summary,category,platform,published_at,external_url,thumbnail_url,debate_id,debate_slug,is_published',
 issues:'id,slug,title,number,issue_date,cover_url,is_published',
 companies:'id,slug,name,category,location,image_url,image_position,is_demo,is_published',
 professionals:'id,slug,full_name,profession_title,category,location,email,is_demo,is_published',
};

// Keep one representative of each available content type in the opening grid.
// Only supplied public records are selected; an empty slot stays an invitation
// to explore its section rather than becoming fabricated editorial content.
export function selectHomeContent({works = [], issues = [], indicators = [], debates = [], companies = [], professionals = []}, now = Date.now()) {
  const issue = issues[0] || null;
  const debate = selectFeaturedDebate(debates, now) || [...debates]
    .filter(item => ['ended', 'recording_available'].includes(item.stage))
    .sort((a, b) => (Date.parse(b.scheduled_at || b.created_at) || 0) - (Date.parse(a.scheduled_at || a.created_at) || 0))[0] || null;
  const work = works.find(item => !debate || item.debate_slug !== debate.slug) || null;
  const highlights = indicators.filter(item => item.latestValue != null)
    .sort((a, b) => Number(b.latestValue.year) - Number(a.latestValue.year)).slice(0, 3);
  const leadKind = work && workThumbnail(work) ? 'video' : debate && httpsUrl(debate.cover_url) ? 'debate' : work ? 'video' : 'debate';
  return {
    work, issue, debate, highlights, leadKind,
    moreWorks: works.filter(item => item !== work && (!debate || item.debate_slug !== debate.slug)).slice(0, 3),
    moreIssues: issues.slice(1, 3),
    company: companies.find(item => !item.isDemo) || null,
    professional: professionals.find(item => !item.isDemo&&!item.needsReview) || null,
  };
}

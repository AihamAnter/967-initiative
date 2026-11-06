import {workThumbnail} from './media.js';
import {httpsUrl} from './debates.js';

// "Today" on the home page: what is new or important across the whole
// platform, not one fixed slot per content type. Only real published records
// are used (demo rows are skipped), so a quiet week shows fewer cards, never
// invented ones. New content types join by adding a mapper below.

const DAY = 86400000;
const time = value => {const t = Date.parse(value || ''); return Number.isFinite(t) ? t : 0;};
const enc = value => encodeURIComponent(String(value || ''));

// A debate that is live now is the most time-sensitive thing on the site; one
// scheduled for the future ranks as "today". Others rank by their own date.
function debateRank(debate, now) {
  if (debate.stage === 'live') return now + 30 * DAY;
  const at = time(debate.scheduled_at);
  if (['announced', 'upcoming'].includes(debate.stage) && at > now) return now;
  return Math.min(time(debate.scheduled_at || debate.created_at), now);
}

const DEBATE_STATE = {announced: 'معلنة', upcoming: 'قادمة', live: 'تُبث الآن', ended: 'انتهت', recording_available: 'التسجيل متاح'};

export function todayItems({works = [], issues = [], debates = [], indicators = []} = {}, now = Date.now()) {
  const items = [];
  for (const w of works) {
    if (!w?.slug || w.is_demo || w.isDemo) continue;
    items.push({
      key: 'work-' + (w.id || w.slug), kind: 'work', section: 'works', label: 'عمل إعلامي',
      title: w.title, summary: w.summary || '', date: w.published_at || null,
      href: w.debate_slug ? '/debates/' + enc(w.debate_slug) : '/works/' + enc(w.slug),
      image: workThumbnail(w) || null, meta: w.platform || '', rank: time(w.published_at),
    });
  }
  for (const d of debates) {
    if (!d?.slug || ['cancelled', 'postponed'].includes(d.stage)) continue;
    const date = d.scheduled_at || d.created_at || null;
    items.push({
      key: 'debate-' + (d.id || d.slug), kind: 'debate', section: 'debates', label: 'مناظرة',
      title: d.title, summary: d.question || d.summary || '', date,
      href: '/debates/' + enc(d.slug), image: httpsUrl(d.cover_url) || null,
      meta: DEBATE_STATE[d.stage] || '', live: d.stage === 'live',
      rank: debateRank(d, now),
    });
  }
  for (const issue of issues) {
    if (!issue?.slug) continue;
    items.push({
      key: 'issue-' + (issue.id || issue.slug), kind: 'issue', section: 'magazine', label: 'مجلة 967',
      title: issue.title || ('العدد ' + issue.number), summary: issue.number ? 'العدد ' + issue.number : '',
      date: issue.issue_date || null, href: '/magazine/' + enc(issue.slug),
      image: httpsUrl(issue.cover_url) || null, meta: '', rank: time(issue.issue_date),
    });
  }
  for (const ind of indicators) {
    const value = ind?.latestValue;
    if (!ind?.slug || value == null) continue;
    items.push({
      key: 'indicator-' + (ind.id || ind.slug), kind: 'indicator', section: 'statistics', label: 'اليمن بالأرقام',
      title: ind.name, summary: '', date: ind.updated_at || null,
      href: '/yemen-in-numbers/indicator/' + enc(ind.slug), image: null,
      figure: {value: value.value, unit: ind.unit || '', year: value.year},
      meta: ind.domain?.name || '', rank: time(ind.updated_at),
    });
  }
  return items.sort((a, b) => b.rank - a.rank || a.key.localeCompare(b.key));
}

/**
 * lead: a story (not a number) from the top five, preferring one with a picture;
 * rest: the following items, at most one indicator so numbers never crowd out stories.
 */
export function buildTodayFeed(sources, {now = Date.now(), limit = 6, isVisible = () => true} = {}) {
  const items = todayItems(sources, now).filter(item => isVisible(item.section));
  if (!items.length) return {lead: null, rest: []};
  const top = items.slice(0, 5), stories = top.filter(item => item.kind !== 'indicator');
  const lead = stories.find(item => item.image) || stories[0] || items[0];
  const rest = [];
  let numbers = 0;
  for (const item of items) {
    if (item === lead) continue;
    if (item.kind === 'indicator' && ++numbers > 1) continue;
    rest.push(item);
    if (rest.length >= limit) break;
  }
  return {lead, rest};
}

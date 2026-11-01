// One navigation vocabulary for the whole platform (Design B, "Wayfinder").
// The header, the mobile sections sheet, the home task launcher and the footer
// all read this file, so a destination has the same name everywhere.
//
// Each task has: a verb label (what the visitor wants to do), the editorial
// section name it leads to, a primary href (one tap), and its sibling links.
// Visibility is applied by callers with pageIsVisible/usePageVisibility.

export const NAV_TASKS = [
  {
    id: 'read', verb: 'اقرأ وشاهد', section: 'المحتوى', href: '/works', tone: 'coral',
    hint: 'أعمال إعلامية، مجلة، ومناظرات',
    links: [
      ['/works', 'الأعمال الإعلامية'],
      ['/magazine', 'مجلة 967'],
      ['/debates', 'مناظرات 967'],
      ['/read-later', 'محفوظاتي للقراءة'],
    ],
  },
  {
    id: 'explore', verb: 'استكشف اليمن', section: 'المعرفة', href: '/yemen-in-numbers', tone: 'cobalt',
    hint: 'أرقام، خريطة، تاريخ، وشخصيات',
    links: [
      ['/yemen-in-numbers', 'اليمن بالأرقام'],
      ['/yemen-ranking', 'ترتيب اليمن'],
      ['/yemen-map', 'خريطة اليمن'],
      ['/yemeni-figures', 'شخصيات يمنية'],
      ['/yemen-history', 'تاريخ اليمن'],
    ],
  },
  {
    id: 'learn', verb: 'تعلّم', section: 'مدرسة 967', href: '/school', tone: 'leaf',
    hint: 'مسارات تفاعلية تتقدم فيها خطوة بخطوة',
    links: [
      ['/school', 'كل المسارات'],
      ['/school/writing', 'الكتابة والأدب'],
      ['/school/nature', 'الفلك والطبيعة'],
      ['/school/logic', 'المنطق والتفكير'],
      ['/school/civic', 'السياسة والاقتصاد'],
      ['/school/writing/musnad', 'تعلّم خط المسند'],
      ['/school/writing/arud', 'تعلّم علم العروض'],
      ['/school/dashboard', 'رحلتي التعليمية'],
    ],
  },
  {
    id: 'play', verb: 'العب', section: 'ألعاب 967', href: '/games', tone: 'night',
    hint: 'تحدٍّ يومي وتسع ألعاب عن اليمن',
    links: [
      ['/games', 'كل الألعاب'],
      ['/games/leaderboard', 'لوحة المتصدرين'],
      ['/games/achievements', 'الشارات والإنجازات'],
    ],
  },
  {
    id: 'find', verb: 'اعثر على خدمة', section: 'الأدلة', href: '/yemeni-products', tone: 'sun',
    hint: 'شركات، مهنيون، جامعات، ومراكز طبية',
    links: [
      ['/yemeni-products', 'شركات ومنتجات يمنية'],
      ['/professionals', 'المهنيون'],
      ['/universities', 'الجامعات والمعاهد'],
      ['/medical-centers', 'المراكز الطبية'],
    ],
  },
  {
    id: 'join', verb: 'شارك', section: 'المبادرة', href: '/contribute', tone: 'brand',
    hint: 'تصحيح، اقتراح، تطوع، أو تواصل',
    links: [
      ['/contribute', 'تواصل وشارك'],
      ['/contribute?type=تصحيح%20معلومة', 'أرسل تصحيحاً'],
      ['/#projects', 'مشاريعنا'],
    ],
  },
];

// Initiative pages are managed content; the editor decides their titles.
export const INITIATIVE_PAGE_SLUGS = ['about', 'help', 'privacy-requests'];

export function navTasks({isVisible = () => true, contentLinks = []} = {}) {
  return NAV_TASKS.map(task => {
    const links = task.id === 'join'
      ? [...contentLinks.filter(item => INITIATIVE_PAGE_SLUGS.includes(item.slug)).map(item => [item.href, item.title]), ...task.links]
      : task.links;
    const visible = links.filter(([href]) => isVisible(href.split('?')[0]));
    const href = visible.some(([link]) => link === task.href) ? task.href : visible[0]?.[0];
    return {...task, href, links: visible};
  }).filter(task => task.links.length && task.href);
}

export function isActivePath(path, href) {
  if (!path || href === '/' || href.includes('#') || href.includes('?')) return false;
  return path === href || path.startsWith(href + '/');
}

export function activeTask(path, tasks) {
  return tasks.find(task => task.links.some(([href]) => isActivePath(path, href)))?.id || null;
}

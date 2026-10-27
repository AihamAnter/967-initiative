export const READING_LIST_KEY = '967-reading-list-v1';
export const READING_LIST_LIMIT = 100;

export const READING_KINDS = {
  work:'عمل إعلامي', issue:'عدد من المجلة', figure:'شخصية يمنية', company:'شركة ومنتجات',
  professional:'ملف مهني', indicator:'مؤشر إحصائي', domain:'مجال إحصائي',
  debate:'مناظرة', speaker:'ملف مناظر', ranking:'ترتيب اليمن', map:'الأطلس',
  timeline:'مقارنة زمنية', search:'بحث محفوظ', page:'صفحة من المنصة', university:'جامعة أو معهد', medicalCenter:'منشأة طبية',
};

const publicPages = {
  '/':['page','الرئيسية'], '/works':['page','الأعمال الإعلامية'], '/magazine':['page','مجلة 967'],
  '/yemen-map':['map','اكتشف اليمن'], '/yemeni-figures':['page','شخصيات يمنية'], '/yemeni-products':['page','منتجات يمنية'],
  '/professionals':['page','المهنيون'], '/yemen-in-numbers':['page','اليمن بالأرقام'],
  '/universities':['page','دليل الجامعات والمعاهد'], '/medical-centers':['page','دليل المراكز الطبية'],
  '/yemen-in-numbers/timeline':['timeline','المقارنة عبر الزمن'], '/yemen-ranking':['ranking','ترتيب اليمن'],
  '/debates':['page','مناظرات 967'], '/debates/suggest':['page','اقترح مناظرة'],
  '/search':['search','نتائج البحث'], '/about':['page','عن المبادرة'], '/help':['page','مركز المساعدة'],
  '/privacy':['page','سياسة الخصوصية'], '/terms':['page','شروط الاستخدام'],
  '/privacy-requests':['page','طلبات الخصوصية والبلاغات'], '/contribute':['page','تواصل وشارك'],
};
const detailRoutes = [
  [/^\/works\/([^/]+)$/,'work'], [/^\/magazine\/([^/]+)$/,'issue'],
  [/^\/yemen-map\/figures\/([^/]+)$/,'figure'], [/^\/yemeni-figures\/([^/]+)$/,'figure'], [/^\/yemeni-products\/([^/]+)$/,'company'],
  [/^\/professionals\/([^/]+)$/,'professional'], [/^\/yemen-in-numbers\/indicator\/([^/]+)$/,'indicator'],
  [/^\/universities\/([^/]+)$/,'university'], [/^\/medical-centers\/([^/]+)$/,'medicalCenter'],
  [/^\/yemen-in-numbers\/([^/]+)$/,'domain'], [/^\/debates\/speakers\/([^/]+)$/,'speaker'],
  [/^\/debates\/([^/]+)$/,'debate'], [/^\/pages\/([^/]+)$/,'page'],
];
const queryKeys = {
  '/works':['q','topic','platform','page'], '/professionals':['q','category','location','mode','page'],
  '/yemeni-products':['q','category','location','page'], '/yemen-in-numbers':['q','domain','year','page'],
  '/yemen-ranking':['indicator','year','scope','compare'], '/yemen-map':['region','district'],
  '/yemeni-figures':['figureQ','field','era','social','photo','century','birthFrom','birthTo','figureSort','visible','region'],
  '/debates':['q','category','type','stage','sort','page'],
  '/universities':['q','governorate','city','type','ownership','focus','level','mode','sort','page'],
  '/medical-centers':['q','governorate','city','type','ownership','specialty','service','emergency','sort','page'],
  '/search':['q','type','page','mode','scope','exclude'],
};
const queryDefaults = {page:'1',topic:'الكل',platform:'الكل',category:'الكل',location:'كل المحافظات',mode:'كل طرق الخدمة',domain:'all',year:'all',sort:'newest',scope:'world'};

export function readingPathInfo(pathname) {
  if (typeof pathname !== 'string' || pathname.length > 1500 || /[?#\\\u0000-\u0020\u007f]/.test(pathname)) return null;
  const path = pathname === '/' ? '/' : pathname.replace(/\/$/,'');
  if (Object.hasOwn(publicPages,path)) return {path,kind:publicPages[path][0],title:publicPages[path][1]};
  for (const [pattern,kind] of detailRoutes) {
    const match = pattern.exec(path);
    if (!match) continue;
    try {
      const slug = decodeURIComponent(match[1]);
      if (!slug || slug === '.' || slug === '..' || /[/\\\u0000-\u001f\u007f]/.test(slug)) return null;
      return {path:path.slice(0,path.lastIndexOf('/')+1)+encodeURIComponent(slug),kind,title:READING_KINDS[kind]};
    } catch {return null;}
  }
  return null;
}

// Keep only public view/filter parameters. Auth tokens and return URLs never enter storage.
export function publicReadingHref(pathname, search = '') {
  const info = readingPathInfo(pathname);
  if (!info) return null;
  const input = new URLSearchParams(search), output = new URLSearchParams();
  for (const key of queryKeys[info.path] || []) {
    const value = (input.get(key) || '').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,150);
    if (value && value !== queryDefaults[key]) output.set(key,value);
  }
  return info.path + (output.size ? '?' + output : '');
}

export function readingListItem(value) {
  if (!value || typeof value !== 'object' || !Object.hasOwn(READING_KINDS,value.kind) || typeof value.href !== 'string' || value.href.length > 3000 || typeof value.title !== 'string') return null;
  const match = /^([^?#]+)(?:\?([^#]*))?$/.exec(value.href);
  if (!match) return null;
  try {
    const info = readingPathInfo(match[1]);
    if (!info || info.kind !== value.kind) return null;
    const params = new URLSearchParams(match[2] || '');
    if ([...params.keys()].some(key => !(queryKeys[info.path] || []).includes(key))) return null;
    const title = value.title.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0,180);
    if (!title) return null;
    return {kind:value.kind, href:publicReadingHref(info.path,params), title};
  } catch { return null; }
}

// New saves are individual content items. Keep parsing earlier saved pages so
// this UI correction does not silently remove somebody's existing bookmarks.
const contentKinds = new Set(['work','issue','figure','company','professional','indicator','debate','speaker','university','medicalCenter']);
export function readingContentItem(value) {
  const item = readingListItem(value);
  return item && contentKinds.has(item.kind) ? item : null;
}

export function parseReadingList(serialized) {
  try {
    const input = JSON.parse(serialized);
    if (!Array.isArray(input)) return [];
    const result = [], seen = new Set();
    for (const value of input) {
      const item = readingListItem(value);
      if (!item || seen.has(item.href)) continue;
      result.push(item);seen.add(item.href);
      if (result.length === READING_LIST_LIMIT) break;
    }
    return result;
  } catch { return []; }
}

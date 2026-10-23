export const privacyRequestTypes=['طلب الاطلاع على البيانات','طلب تصحيح بيانات','طلب حذف بيانات','بلاغ عن محتوى أو انتهاك حقوق','بلاغ عن مشكلة تقنية'];
export const contributionTypes = ['استفسار', 'اقتراح موضوع', 'اقتراح شخصية أو معلومة تاريخية', 'تصحيح معلومة', 'اقتراح شركة أو منتج', 'طلب إضافة ملف مهني', 'اقتراح نشاط مجتمعي', 'التطوع والمشاركة', 'تعاون إعلامي', 'أخرى',...privacyRequestTypes];

// A reference supplies context only; it never grants edit access or selects a DB record.
export function resolveContributionReference(input = {}) {
  const text = (value, max) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
  const path = text(input.referencePath, 1000);
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || /%(?:2f|5c|0[0-ad]|1[0-9a-f]|7f)/i.test(path)) return null;
  try {
    const url = new URL(path, 'https://reference.invalid');
    const decodedPath = decodeURIComponent(url.pathname);
    if (url.origin !== 'https://reference.invalid' || decodedPath.includes('\\') || /^\/(?:admin|api|auth|account)(?:\/|$)/i.test(decodedPath)) return null;
    return {title:text(input.referenceTitle, 180) || 'صفحة على منصة 967', path:url.pathname + url.search + url.hash, id:text(input.referenceId, 100)};
  } catch {return null;}
}

export function buildCorrectionHref({title, path, id} = {}) {
  const reference = resolveContributionReference({referenceTitle:title, referencePath:path, referenceId:id});
  const params = new URLSearchParams({type:'تصحيح معلومة'});
  if (reference) {
    params.set('referenceTitle', reference.title);
    params.set('referencePath', reference.path);
    if (reference.id) params.set('referenceId', reference.id);
  }
  return '/contribute?' + params + '#contribution-form';
}

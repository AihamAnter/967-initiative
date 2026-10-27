import {createElement} from 'react';
import {site} from './config.js';
import {absoluteMediaUrl, detailPath, isPublicRecord, siteUrl, validLastModified} from './seo.js';
import {parseMediaUrl, workThumbnail} from './media.js';

export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function JsonLd({data}) {
  return data ? createElement('script', {type: 'application/ld+json', dangerouslySetInnerHTML: {__html: serializeJsonLd(data)}}) : null;
}

export function siteSchema(settings) {
  const origin = siteUrl();
  return {'@context': 'https://schema.org', '@graph': [
    {'@type': 'Organization', '@id': `${origin}#organization`, name: site.name, url: origin,
      description: settings.aboutDescription,
      sameAs: ['instagram', 'youtube', 'facebook', 'tiktok'].map(key => absoluteMediaUrl(settings[key])).filter(Boolean)},
    {'@type': 'WebSite', '@id': `${origin}#website`, name: site.name, url: origin, inLanguage: 'ar', publisher: {'@id': `${origin}#organization`}},
  ]};
}

export function breadcrumbSchema(items) {
  return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    {name: 'الرئيسية', path: '/'}, ...items,
  ].map((item, index) => ({'@type': 'ListItem', position: index + 1, name: item.name, item: siteUrl(item.path)}))};
}

export function figureSchema(figure) {
  if (!isPublicRecord(figure)||figure.profile?.historicity==='traditional') return null;
  const url = siteUrl(detailPath('yemeni-figures', figure.slug));
  return {'@context': 'https://schema.org', '@type': 'Person', '@id': `${url}#person`, url,
    name: figure.fullName, description: figure.shortBio || figure.knownFor,
    image: figure.imageKind==='context'?undefined:absoluteMediaUrl(figure.imageUrl), knowsAbout: [figure.field, figure.knownFor].filter(Boolean),
    sameAs: ['website', 'facebookUrl', 'instagramUrl', 'xUrl', 'youtubeUrl'].map(key => absoluteMediaUrl(figure[key])).filter(Boolean),
    // The catalog stores years, not ISO dates: do not invent birth/death dates.
  };
}

export function issueSchema(issue) {
  if (!isPublicRecord(issue)) return null;
  return {'@context': 'https://schema.org', '@type': 'PublicationIssue',
    name: issue.title, description: issue.summary, url: siteUrl(detailPath('magazine', issue.slug)),
    issueNumber: issue.number, datePublished: validLastModified(issue.issue_date),
    image: absoluteMediaUrl(issue.cover_url), inLanguage: 'ar',
    isPartOf: {'@type': 'Periodical', name: 'مجلة 967', url: siteUrl('/magazine')},
  };
}

export function workSchema(work) {
  const thumbnail = workThumbnail(work);
  const published = validLastModified(work?.published_at);
  const media = parseMediaUrl(work?.external_url);
  if (!isPublicRecord(work) || !work.title || !work.summary || !thumbnail || !published || !media.embedUrl) return null;
  return {'@context': 'https://schema.org', '@type': 'VideoObject', name: work.title,
    description: work.summary, thumbnailUrl: absoluteMediaUrl(thumbnail), uploadDate: published,
    url: siteUrl(detailPath('works', work.slug)),
    ...(media.kind === 'video' ? {contentUrl: media.externalUrl} : {embedUrl: media.embedUrl}), inLanguage: 'ar',
  };
}

export function indicatorSchema(indicator) {
  const values = indicator?.values || [];
  if (!isPublicRecord(indicator) || !indicator.name || !indicator.definition || indicator.definition.length < 50 || indicator.definition.length > 5000 ||
      !indicator.measurement_method || !indicator.unit || !values.length || indicator.hasSourceConflict ||
      values.some(value => !value.source?.name || !absoluteMediaUrl(value.source?.url))) return null;
  const years = values.map(value => Number(value.year)).filter(Number.isInteger).sort((a, b) => a - b);
  if (!years.length) return null;
  return {'@context': 'https://schema.org', '@type': 'Dataset', name: indicator.name,
    description: indicator.definition, url: siteUrl(detailPath('yemen-in-numbers/indicator', indicator.slug)),
    inLanguage: 'ar', spatialCoverage: {'@type': 'Place', name: 'الجمهورية اليمنية'},
    temporalCoverage: `${years[0]}/${years.at(-1)}`,
    measurementTechnique: indicator.measurement_method,
    variableMeasured: {'@type': 'PropertyValue', name: indicator.name, unitText: indicator.unit},
    citation: [...new Set(values.map(value => absoluteMediaUrl(value.source.url)))],
  };
}

export function institutionSchema(item,kind) {
  if (!isPublicRecord(item) || !item.name || !item.id) return null;
  const medical=kind==='medical',path=detailPath(medical?'medical-centers':'universities',item.id);
  const address=[item.address,item.city||item.district,item.governorate].filter(Boolean);
  const sameAs=[item.website,...(item.socialLinks||[]).map(link=>typeof link==='string'?link:link.url)].map(absoluteMediaUrl).filter(Boolean);
  return {'@context':'https://schema.org','@type':medical?(item.type?.includes('hospital')?'Hospital':'MedicalOrganization'):(item.type==='university'?'CollegeOrUniversity':'EducationalOrganization'),
    name:item.name,alternateName:item.englishName||undefined,url:siteUrl(path),description:item.summary||undefined,image:absoluteMediaUrl(item.logoUrl),telephone:item.phone||undefined,email:item.email||undefined,
    address:address.length?{'@type':'PostalAddress',streetAddress:item.address||undefined,addressLocality:item.city||item.district||undefined,addressRegion:item.governorate||undefined,addressCountry:'YE'}:undefined,
    geo:Number.isFinite(Number(item.latitude))&&Number.isFinite(Number(item.longitude))?{'@type':'GeoCoordinates',latitude:Number(item.latitude),longitude:Number(item.longitude)}:undefined,
    sameAs:sameAs.length?sameAs:undefined,
    ...(medical&&item.emergencyAvailable===true?{availableService:{'@type':'EmergencyService',name:'خدمة طوارئ موثقة في المصدر'}}:{}),
  };
}

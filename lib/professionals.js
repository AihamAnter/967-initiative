import {whatsappUrl} from './contactLinks.js';
import {safeImageUrl} from './media.js';

export const professionalCategories = [
  'الكل',
  'البناء والصيانة',
  'كهرباء وطاقة شمسية',
  'سباكة ومياه',
  'نجارة وأثاث',
  'خياطة وأزياء',
  'صيانة مركبات',
  'تقنية واتصالات',
  'تصميم وإعلام',
  'تعليم وتدريب',
  'صحة ورعاية',
  'خدمات أعمال',
  'حرف يدوية',
  'نقل وتوصيل',
  'خدمات منزلية',
];

export const serviceModes = ['حضوري', 'عن بُعد', 'حضوري وعن بُعد'];

export const demoProfessionals = [
  {
    id: 'solar-technician', fullName: 'سامي الحرازي', professionTitle: 'فني كهرباء وطاقة شمسية',
    category: 'كهرباء وطاقة شمسية', location: 'صنعاء', serviceAreas: ['صنعاء', 'عمران'], serviceMode: 'حضوري',
    yearsExperience: 8, availability: 'متاح للحجوزات الجديدة',
    bio: 'فني متخصص في تركيب وصيانة الأنظمة الكهربائية والمنظومات الشمسية المنزلية والمحلات الصغيرة.',
    services: ['تركيب منظومات شمسية', 'صيانة أعطال الكهرباء', 'فحص البطاريات والإنفرترات'],
    skills: ['تمديدات كهربائية', 'طاقة شمسية', 'تشخيص أعطال'], languages: ['العربية'],
    phone: null, whatsapp: null, email: null, website: null, instagram: null,
    isVerified: false, isDemo: true,
  },
  {
    id: 'tailoring-studio', fullName: 'أروى الوصابي', professionTitle: 'خياطة ومصممة ملابس',
    category: 'خياطة وأزياء', location: 'تعز', serviceAreas: ['تعز'], serviceMode: 'حضوري وعن بُعد',
    yearsExperience: 6, availability: 'متاحة حسب موعد مسبق',
    bio: 'تقدم خدمات التفصيل والتعديل وتصميم قطع عملية بلمسات مستوحاة من النسيج اليمني.',
    services: ['تفصيل ملابس', 'تعديل المقاسات', 'تصميم قطع حسب الطلب'],
    skills: ['قص وتفصيل', 'تطريز', 'اختيار الأقمشة'], languages: ['العربية'],
    phone: null, whatsapp: null, email: null, website: null, instagram: null,
    isVerified: false, isDemo: true,
  },
  {
    id: 'hadramout-carpenter', fullName: 'عادل باوزير', professionTitle: 'نجار أثاث وأبواب',
    category: 'نجارة وأثاث', location: 'حضرموت', serviceAreas: ['المكلا', 'سيئون'], serviceMode: 'حضوري',
    yearsExperience: 12, availability: 'متاح للمشاريع الجديدة',
    bio: 'ينفذ أعمال الأثاث والأبواب الخشبية حسب المقاس، من المعاينة وحتى التركيب والتشطيب.',
    services: ['أثاث حسب الطلب', 'أبواب وخزائن', 'صيانة وترميم الخشب'],
    skills: ['قياس وتنفيذ', 'تشطيب خشب', 'تركيب'], languages: ['العربية'],
    phone: null, whatsapp: null, email: null, website: null, instagram: null,
    isVerified: false, isDemo: true,
  },
  {
    id: 'device-maintenance', fullName: 'منير العريقي', professionTitle: 'فني صيانة أجهزة وشبكات',
    category: 'تقنية واتصالات', location: 'عدن', serviceAreas: ['عدن', 'عن بُعد'], serviceMode: 'حضوري وعن بُعد',
    yearsExperience: 5, availability: 'متاح خلال أيام الأسبوع',
    bio: 'يقدم تشخيصًا وصيانة للأجهزة والشبكات المنزلية ومساعدة تقنية للأفراد والمنشآت الصغيرة.',
    services: ['صيانة حواسيب', 'إعداد شبكات', 'دعم تقني عن بُعد'],
    skills: ['أنظمة تشغيل', 'شبكات', 'نسخ احتياطي'], languages: ['العربية', 'الإنجليزية'],
    phone: null, whatsapp: null, email: null, website: null, instagram: null,
    isVerified: false, isDemo: true,
  },
];

export function mapProfessional(row) {
  const placeholderContact = /@(?:example\.(?:com|org|net)|test\.(?:com|invalid))$/i.test(String(row.email || ''));
  const isDemo = Boolean(row.is_demo);
  const needsReview = placeholderContact || isDemo;
  return {
    id: row.slug,
    databaseId: row.id,
    fullName: row.full_name,
    professionTitle: row.profession_title,
    category: row.category,
    location: row.location,
    serviceAreas: Array.isArray(row.service_areas) ? row.service_areas : [],
    serviceMode: row.service_mode,
    yearsExperience: row.years_experience,
    availability: row.availability,
    bio: row.bio,
    services: Array.isArray(row.services) ? row.services : [],
    skills: Array.isArray(row.skills) ? row.skills : [],
    languages: Array.isArray(row.languages) ? row.languages : [],
    phone: needsReview ? null : row.phone,
    // An example email should not hide the separately supplied WhatsApp number.
    // Demo records still never expose contact details or gain verified status.
    whatsapp: !isDemo && whatsappUrl(row.whatsapp) ? row.whatsapp : null,
    email: placeholderContact ? null : row.email,
    website: needsReview ? null : row.website,
    instagram: needsReview ? null : row.instagram,
    profileImageUrl: isDemo ? null : safeImageUrl(row.profile_image_url),
    imagePosition: ['center','top','bottom','left','right'].includes(row.image_position)?row.image_position:'center',
    isVerified: Boolean(row.is_verified) && !needsReview,
    isDemo,
    needsReview,
  };
}

export function getDemoProfessional(slug) {
  return demoProfessionals.find(person => person.id === slug);
}

export const yemenGovernorates = [
  {id: 'YE12', name: 'أبين'},
  {id: 'YE30', name: 'الضالع'},
  {id: 'YE24', name: 'عدن'},
  {id: 'YE14', name: 'البيضاء'},
  {id: 'YE18', name: 'الحديدة'},
  {id: 'YE16', name: 'الجوف'},
  {id: 'YE28', name: 'المهرة'},
  {id: 'YE27', name: 'المحويت'},
  {id: 'YE29', name: 'عمران'},
  {id: 'YE20', name: 'ذمار'},
  {id: 'YE19', name: 'حضرموت'},
  {id: 'YE17', name: 'حجة'},
  {id: 'YE11', name: 'إب'},
  {id: 'YE25', name: 'لحج'},
  {id: 'YE26', name: 'مأرب'},
  {id: 'YE31', name: 'ريمة'},
  {id: 'YE22', name: 'صعدة'},
  {id: 'YE23', name: 'صنعاء'},
  {id: 'YE13', name: 'أمانة العاصمة'},
  {id: 'YE21', name: 'شبوة'},
  {id: 'YE32', name: 'سقطرى'},
  {id: 'YE15', name: 'تعز'},
];

export const yemeniFigureFields = [
  'الأدب والشعر',
  'الإعلام وحقوق الإنسان',
  'الإعلام والصحافة',
  'المجتمع وحقوق الإنسان',
  'السياسة والحكم',
  'الفن والموسيقى',
  'العلم والتعليم',
  'الرياضة',
  'الاقتصاد وريادة الأعمال',
  'التراث والتاريخ',
];

export const yemeniFigureEras = ['معاصرة', 'تاريخية'];

export function mapYemeniFigure(row) {
  return {
    id: row.id,
    slug: row.slug,
    fullName: row.full_name,
    knownFor: row.known_for || '',
    field: row.field,
    governorateId: row.governorate_id || '',
    governorateName: row.governorate_name || '',
    era: row.era,
    birthYear: row.birth_year,
    deathYear: row.death_year,
    shortBio: row.short_bio || '',
    imageUrl: row.image_url || '',
    website: row.website || '',
    facebookUrl: row.facebook_url || '',
    instagramUrl: row.instagram_url || '',
    xUrl: row.x_url || '',
    youtubeUrl: row.youtube_url || '',
    displayOrder: row.display_order || 0,
  };
}

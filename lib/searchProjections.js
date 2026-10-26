// All fields consumed by buildSearchIndex are retained; images, contact links and
// unrelated editorial metadata no longer travel from Supabase for a search.
export const searchProjections={
 works:'id,slug,title,summary,category,platform,published_at,is_published,debate_id',
 issues:'id,slug,title,summary,number,issue_date,is_published',
 figures:'id,slug,full_name,known_for,field,governorate_id,governorate_name,era,birth_year,death_year,short_bio,timeline,is_published',
 companies:'id,slug,name,legal_name,category,location,entity_type,summary,story,impact,strengths,markets,products,is_demo,is_published',
 professionals:'id,slug,full_name,profession_title,category,location,service_areas,service_mode,availability,bio,services,skills,languages,is_demo,is_published',
 universities:'id,slug,stable_key,name_ar,name_en,institution_type,ownership,summary,governorate,city,district,education_levels,study_modes,is_published,programs:university_programs(name,field,faculty,department,qualification)',
 medicalCenters:'id,slug,stable_key,name_ar,name_en,institution_type,ownership,summary,governorate,city,district,is_published,specialties:medical_center_specialties(name),services:medical_center_services(name,details)',
};

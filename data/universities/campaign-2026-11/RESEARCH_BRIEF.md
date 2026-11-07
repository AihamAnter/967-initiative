# Universities & institutes — research brief (November 2026)

967ye.com «الجامعات والمعاهد» lists Yemeni higher-education institutions (universities, colleges, community colleges, technical/vocational institutes). Many entries lack programmes, English names, founding years, contacts and social links. Goal: complete, sourced pages.

## Output item format (one per input institution, same order)
```json
{
 "slug": "unchanged",
 "name_en": "official English name or empty",
 "founded_year": 1970,
 "summary": "Arabic, 3–5 sentences, 300–900 chars — replace hedging/template text with real facts (history, campuses, faculties, size if sourced)",
 "website": "https://… official", "phone": "public switchboard", "email": "public institutional email",
 "address": "Arabic", "city": "Arabic", "governorate": "Arabic (as used on the site, e.g. أمانة العاصمة، عدن، حضرموت…)",
 "latitude": 15.35, "longitude": 44.2,
 "map_url": "https://www.google.com/maps/... or https://www.openstreetmap.org/... only if you found the real location",
 "logo_url": "https://… direct image URL of the official logo (official site or Wikimedia) or empty",
 "social_links": [{"label": "فيسبوك", "url": "https://www.facebook.com/…"}, {"label": "X", "url": "…"}, {"label": "يوتيوب", "url": "…"}],
 "admission_info": "Arabic 1–4 sentences: admission requirements/dates/how to apply, only if sourced",
 "tuition_info": "Arabic: fees with currency and year, only if published", "tuition_as_of": "2025-09-01 or empty",
 "languages": ["العربية", "الإنجليزية"], "study_modes": ["انتظام", "موازي", "تعليم عن بعد"],
 "education_levels": ["دبلوم", "بكالوريوس", "ماجستير", "دكتوراه", "دراسات عليا"],
 "operating_status": "operating | temporarily_closed | closed | listed_for_admission | unknown",
 "programs": [{"faculty": "كلية …", "department": "قسم … or empty", "name": "Arabic programme name", "field": "Arabic broad field", "qualification": "بكالوريوس | دبلوم | ماجستير | دكتوراه | دبلوم عالي", "language": "العربية | الإنجليزية", "study_mode": "انتظام | موازي | عن بعد", "source_url": "https://…"}],
 "branches": [{"name": "Arabic", "governorate": "…", "city": "…", "address": "…", "phone": "", "source_url": "https://…"}],
 "sources": [{"title": "…", "url": "https://…", "publisher": "…", "source_type": "official_site | government | official_directory | institutional | independent | independent_directory"}]
}
```
- Programmes: list the real programmes/majors offered (all faculties). Universities usually have 15–80; colleges/institutes 3–20. Each with a source URL (official site pages, admission guides, ministry/CAQA lists, reputable education directories).
- Keep existing data; only add or correct with sources. Do not repeat sources already in `source_urls`.
- Social links: official pages only (check the page name matches the institution). Facebook is the main channel for many Yemeni institutions.
- Never invent fees, coordinates, dates or programmes. If not found, leave empty.
- Modern Standard Arabic, Western digits. Validate with node (valid JSON, same slugs/order, URLs https, no Arabic-Indic digits). Write incrementally. Helper scripts only in your own scratchpad subfolder. Do not touch the database or other repo files. Web search is a shared quota — use it sparingly; prefer fetching official sites and known directories.

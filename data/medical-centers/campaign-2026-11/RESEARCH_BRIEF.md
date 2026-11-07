# Medical centres — research brief (November 2026)

967ye.com «المراكز الطبية» lists Yemeni hospitals and health facilities. Most entries come from the Ministry of Public Health's master facility list (2023) and have only a template summary, no contacts, no hours, few specialties. Goal: useful, sourced pages for people looking for care. Coordinates are added separately (do not research them).

## Output item format (one per input centre, same order)
```json
{
 "slug": "unchanged",
 "name_en": "English name if missing",
 "summary": "Arabic, 3–5 sentences, 300–900 chars: what the facility is, where, level of care, notable departments, history (founding, rebuilding, support by WHO/MSF/ICRC/KSrelief etc. when sourced), current status if a recent source says so",
 "address": "Arabic street/area", "phone": "public switchboard", "emergency_phone": "", "email": "", "website": "https://…", "booking_url": "",
 "social_links": [{"label": "فيسبوك", "url": "https://www.facebook.com/…"}],
 "emergency_available": true,
 "operator_name": "Arabic operator if missing (e.g. وزارة الصحة العامة والسكان، أطباء بلا حدود)",
 "specialties": [{"name": "Arabic specialty, e.g. الجراحة العامة، طب الأطفال، النساء والولادة", "source_url": "https://…"}],
 "services": [{"name": "Arabic service, e.g. الطوارئ ٢٤ ساعة → write «الطوارئ على مدار الساعة»، غسيل الكلى، الأشعة المقطعية، المختبر", "details": "", "source_url": "https://…"}],
 "hours": [{"label": "الطوارئ | العيادات الخارجية | السبت–الخميس", "hours_text": "e.g. على مدار الساعة / 8:00–14:00", "source_url": "https://…"}],
 "sources": [{"title": "…", "url": "https://…", "publisher": "…", "source_type": "official_site | government | official_directory | institutional | independent | independent_directory"}]
}
```
- Good sources: the facility's site or Facebook page, Ministry of Health and health-office pages, WHO/UNICEF/MSF/ICRC/KSrelief/UNOPS project pages naming the hospital, Saba and other news agencies, reputable press, Wikipedia.
- Specialties/services/hours only when a source lists them. Keep any existing ones (they are kept automatically; just add new).
- Never invent phones, hours or services. Only public institutional contacts.
- Neutral on the conflict: report damage/closures/reopenings with dates and source, no blame.
- Modern Standard Arabic, Western digits. Validate with node (valid JSON, same slugs/order, https URLs, no Arabic-Indic digits). Write incrementally. Helper scripts only in your own scratchpad subfolder. Do not touch the database or other repo files. Web search is a shared quota — use it sparingly; prefer fetching known sites.

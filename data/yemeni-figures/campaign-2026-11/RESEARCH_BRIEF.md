# Yemeni figures — research brief (November 2026)

967ye.com («شخصيات يمنية») holds a record and a long profile (biography file) for each Yemeni figure. Goal: rich, sourced, neutral biographies.

## Output item format
```json
{
 "record": {
  "slug": "kebab-case english (unchanged when enriching)",
  "full_name": "Arabic, ≤160", "known_for": "Arabic, one line, ≤300", "field": "one of the fields below",
  "era": "معاصرة | تاريخية", "governorate_id": "YE11…YE32 or empty", "birth_year": 1950 or null, "death_year": null,
  "short_bio": "Arabic, 3–5 sentences, 300–900 chars"
 },
 "profile": {
  "version": 1,
  "historicity": "documented | traditional | disputed",
  "reviewedAt": "2026-11-07",
  "sections": [{"id": "early-life", "title": "النشأة والتعليم", "paragraphs": ["…"], "sourceIds": ["src-1"]}],
  "facts": [{"id": "fact-birth", "label": "الميلاد", "value": "…", "sourceIds": ["src-1"]}],
  "timeline": [{"id": "t-1962", "year": 1962, "dateLabel": "", "title": "…", "description": "…", "sourceIds": ["src-1"]}],
  "works": [{"id": "w-1", "title": "…", "kind": "كتاب | ديوان | أغنية | فيلم | منصب | جائزة …", "year": 1975, "description": "…", "url": "", "sourceIds": ["src-1"]}],
  "gallery": [],
  "sources": [{"id": "src-1", "title": "…", "url": "https://…", "publisher": "…", "accessedAt": "2026-11-07", "license": ""}],
  "notes": [],
  "license": null
 }
}
```
- Every `id` is lowercase kebab-case and unique within its list. Every `sourceIds` value must exist in `sources`.
- `sections`: 4–7 sections, 2–4 paragraphs each, total 2,500–6,000 characters. Typical titles: النشأة والتعليم / المسيرة / أبرز الأعمال أو الإسهامات / المواقف والأدوار العامة / الإرث والتأثير / ملاحظات على المصادر.
- `facts`: 4–10 short key facts (الميلاد، الوفاة، مكان النشأة، المجال، أبرز منصب أو عمل…).
- `timeline`: 4–15 dated milestones (years between -3000 and 2100).
- `works`: books, poems/collections, songs/albums, films, positions, awards, sports titles — when they exist (0 is fine).
- `sources`: 2–8 real URLs you actually opened (Arabic/English Wikipedia, Britannica, official sites, reputable press, academic pages).
- `gallery` stays empty: portraits are added later by a verified script.

Fields (use exactly): السياسة والحكم، الفن والموسيقى، الأدب والشعر، العلم والتعليم، الرياضة، التراث والتاريخ، الفنون البصرية والسينما، الإعلام والصحافة، الاقتصاد وريادة الأعمال، المجتمع وحقوق الإنسان، البحث والسياسات العامة، الدين والفكر.
Governorates: YE11 إب، YE12 أبين، YE13 أمانة العاصمة، YE14 البيضاء، YE15 تعز، YE16 الجوف، YE17 حجة، YE18 الحديدة، YE19 حضرموت، YE20 ذمار، YE21 شبوة، YE22 صعدة، YE23 صنعاء، YE24 عدن، YE25 لحج، YE26 مأرب، YE27 المحويت، YE28 المهرة، YE29 عمران، YE30 الضالع، YE31 ريمة، YE32 سقطرى. Use the governorate of birth/origin only when a source says it.

## Rules
- Write ORIGINAL Arabic prose (paraphrase; do not copy Wikipedia sentences). Modern Standard Arabic, encyclopedic, Western digits.
- Never invent facts, dates, titles or quotes. If sources disagree, say so. If birth year is unknown, null.
- Living people: public role only — no private life, health, family details beyond what the person made public, no accusations. Strictly neutral on politics and the war: describe positions held and public actions with dates; no praise or blame.
- birth_year/death_year must be ≥500 or null (the site's limit).
- Validate with node before finishing: valid JSON; ids/sourceIds consistent; length rules; no Arabic-Indic digits. Write the output file incrementally. Use your own scratchpad subfolder for helper scripts (other agents share the scratchpad). Do not touch the database or other repo files.

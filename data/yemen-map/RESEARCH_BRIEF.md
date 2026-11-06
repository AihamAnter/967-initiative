# Yemen map — district profile research brief (November 2026)

Goal: a full Arabic profile for every Yemeni district (مديرية) on the 967ye.com map, so no district page shows only one automatic sentence.

## Input
`data/yemen-map/districts-input-N.json` — each item: `id` (OCHA pcode), `name_ar`, `name_en`, `governorate_ar`, `governorate_en`, `area_km2` (computed from official OCHA boundaries), `population_2025` (Central Statistical Organization estimate published by OCHA/HDX), `neighbours` (districts sharing a border; other governorates in brackets).

## Output
`data/yemen-map/districts-output-N.json` — JSON array, same order, one object per district:

```json
{
 "id": "YE1704",
 "capital": "مركز المديرية (المدينة/البلدة الإدارية) — empty string if not found",
 "description": "3–5 sentences, 350–900 chars",
 "history": "2–5 sentences, ≤1500 chars, or empty",
 "geography": "2–4 sentences, ≤1200 chars",
 "economy": "2–4 sentences, ≤1200 chars",
 "landmarks": "list-like sentence(s) of named places, ≤900 chars, or empty",
 "sources": [{"title": "Arabic or English title", "url": "https://..."}]
}
```

### What to write
- **description**: where the district is (governorate, direction from the governorate capital if known), the neighbouring districts (use the `neighbours` list — it is reliable), its area (`area_km2` كم²) and its population ("يقدّر الجهاز المركزي للإحصاء عدد سكانها بنحو X نسمة عام 2025" using `population_2025`, rounded to the nearest hundred or thousand), and one distinctive fact.
- **history**: known history (ancient kingdoms, Islamic-era states, famous events, historic towns). Never invent. Leave empty if nothing reliable.
- **geography**: terrain (mountains, wadis, coastal plain, desert, highlands), named mountains/wadis, climate type.
- **economy**: livelihoods (agriculture: coffee, qat, grains, fruit, livestock, fishing; trade; ports; oil/gas; crafts), named markets.
- **landmarks**: named places — forts, mosques, old towns, markets, valleys, islands, beaches, archaeological sites.

### Sources and research
- Search the web. Good places: Arabic Wikipedia (مديرية X), English Wikipedia (X District), the National Information Center (yemen-nic.info), the Yemeni tourism promotion board, UNESCO, Yemeni and Arab press, academic papers. Any reasonable source is acceptable, but EVERY profile must list at least one real URL you actually used. Add the HDX population dataset only if you used the population: `{"title":"OCHA/HDX — تقديرات سكان اليمن 2025","url":"https://data.humdata.org/dataset/yemen-population-estimates"}`.
- If a district is obscure, still write description, geography and economy from what the sources say about the district or its immediate area (be honest: "تغلب على المنطقة..."), and leave history/landmarks empty rather than guessing.
- Never invent names, dates, numbers or events. No political blame; neutral wording on the current conflict ("تأثرت المديرية بالحرب منذ 2015" only if a source says so).

### Style
Modern Standard Arabic, clear, encyclopedic, Western digits, numbers with thousands separators (235,600). No Markdown inside strings.

### Validation (run with node before finishing)
Valid JSON; same number of items and same ids in order; description 350–900 chars; every other field within limits; each item has ≥1 source with an https URL; no Arabic-Indic digits.

Do not touch the database or any other file. Final reply: count written, and the ids where you found little (one line).

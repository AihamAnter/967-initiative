# Yemen history — research brief (November 2026)

The "تاريخ اليمن" section of 967ye.com is an Arabic timeline of Yemen's history. Entries are currently very short (≈300 characters) and have no images. Goal: rich, sourced, encyclopedic entries with real photos.

Reference: `data/yemen-history/catalog-index.json` lists the eras, kinds and every existing entry (slug, title, era, kind, year).

## Entry format (output)
```json
{
 "slug": "kebab-case-english (keep unchanged when enriching)",
 "title": "Arabic title, ≤160 chars (keep unchanged when enriching)",
 "kind": "state | event | society | heritage | place | theme",
 "era": "origins | ancient | islam | dynasties | empires | modern",
 "year": -950,            // integer, negative = BC; the main/start year
 "period": "Arabic, e.g. «نحو القرن العاشر ق.م – 275م», ≤180 chars",
 "summary": "Arabic, 2–3 sentences, 150–650 chars",
 "paragraphs": ["4 to 8 Arabic paragraphs, each 250–1200 chars, together 1600–5000 chars"],
 "sources": [{"title": "…", "url": "https://…"}],   // 2–8 real URLs you used
 "related": ["slugs of related entries from catalog-index.json (or new ones you add)"],
 "location": "Arabic place name, ≤120 chars, or empty",
 "governorate": "YE11…YE32 pcode if clearly tied to one governorate, else empty",
 "certainty": "short Arabic note on how sure the dating/facts are, ≤150 chars",
 "images": [{"file": "Exact Wikimedia Commons file name without 'File:' (e.g. Marib Dam (2).jpg)", "caption": "Arabic caption ≤240 chars"}]
}
```
Governorate pcodes: YE11 إب، YE12 أبين، YE13 أمانة العاصمة، YE14 البيضاء، YE15 تعز، YE16 الجوف، YE17 حجة، YE18 الحديدة، YE19 حضرموت، YE20 ذمار، YE21 شبوة، YE22 صعدة، YE23 صنعاء، YE24 عدن، YE25 لحج، YE26 مأرب، YE27 المحويت، YE28 المهرة، YE29 عمران، YE30 الضالع، YE31 ريمة، YE32 سقطرى.

## Content rules
- Paragraph plan (adapt to the topic): context/background → what happened or what it was → key people/places/dates → impact and legacy → how historians know it (inscriptions, chronicles, excavations) and open debates.
- Concrete names, places, dates, inscriptions, dynasties. Never invent; when sources disagree, say so («تختلف المصادر في…»).
- Neutral on modern politics: no blame, no sides; describe events factually with dates.
- Modern Standard Arabic, encyclopedic, Western digits, years written like «سنة 1962» or «نحو 115 ق.م».
- Remove placeholder/editor-note sentences such as «يحتاج إلى إضافة…» or «يعرض هذا المدخل خلفية تمهيدية» — replace them with real content.
- Sources: Arabic/English Wikipedia, Encyclopaedia Britannica, UNESCO, Encyclopaedia Iranica, academic articles, museum pages, Al Jazeera, reliable press. Any reasonable source is acceptable but every entry needs ≥2 real URLs you actually opened.

## Images (important)
- Give 1–4 real Wikimedia Commons file names per entry (photos of the site, artefacts, inscriptions, buildings, people, maps of the period). Find them on Commons category pages or in the Wikipedia article images (the file name after "File:").
- Copy the file name EXACTLY (spaces, case, extension). The editor's script will verify each file exists on Commons and fetch its author and licence automatically, so wrong names are simply dropped.
- Only .jpg .jpeg .png .webp files. No logos, no flags of modern parties, no photos of dead/wounded people.

## Validation (run with node before finishing)
Valid JSON array; required fields present; length rules respected; ≥2 sources with https URLs; no Arabic-Indic digits; slugs unique and kebab-case. Write the output file incrementally. Do not touch the database or any other repo file. Work only in your own scratchpad subfolder for helper scripts (other agents share the scratchpad).

# Yemeni products & companies — research brief (November 2026)

The «منتجات يمنية» directory on 967ye.com lists Yemeni producers (factories, farms, cooperatives, crafts, food, coffee, honey…). Most entries hold only a chamber-of-commerce listing and template text. Goal: real, sourced company pages.

## Output item format (one per input company, same order)
```json
{
 "slug": "unchanged",
 "founded": "year or short text, e.g. «1938» or «ستينيات القرن العشرين», or empty",
 "website": "https://… official site, or empty",
 "email": "public business email or empty",
 "phone": "public business phone or empty (keep the existing one if no better)",
 "google_maps_url": "https://maps.google.com/… or https://www.google.com/maps/place/… only if you found the real place link, else empty",
 "summary": "Arabic, 1–2 sentences, 120–320 chars: what they make and where",
 "story": "Arabic, 3–6 sentences, 400–1400 chars: history, founders (public info), growth, brands, facilities — real facts only",
 "impact": "Arabic, 2–4 sentences, 200–800 chars: jobs, markets served, role in local supply, exports — only what sources support; else a careful general sentence about the sector in its city",
 "strengths": ["3–5 short Arabic phrases"],
 "markets": ["Arabic market names, e.g. «السوق المحلية»، «السعودية»، «القرن الأفريقي»"],
 "products": [{"name": "Arabic", "description": "Arabic 1–2 sentences", "format": "packaging/size if known", "sources": [{"url": "https://…", "title": "…", "type": "official|press|directory|marketplace", "reviewedAt": "2026-11-07"}]}],
 "sources": [{"url": "https://…", "title": "…"}],
 "image": {"file": "exact Wikimedia Commons file name (no 'File:') of a photo relevant to this company's product or city (e.g. Yemeni coffee beans, Sidr honey, Aden port) — or empty", "caption": "Arabic"}
}
```
- Keep every existing product and its sources; you may add products and add descriptions. Do not delete anything.
- If you find nothing beyond the existing listing, still write summary/story/impact from what the listing and the sector context say, clearly phrased («تُدرج المنشأة في دليل الغرف التجارية…»), and leave unknown fields empty.
- Never invent founders, dates, numbers, certifications or exports. Personal phone numbers of individuals are NOT allowed — only business contacts published by the company or the chamber directory.
- Sources: official sites, Facebook pages of the company (as a source URL is fine), press, chamber directories, LinkedIn company pages, marketplaces.
- Modern Standard Arabic, Western digits. Validate with node (valid JSON, same slugs/order, lengths, no Arabic-Indic digits). Write incrementally. Helper scripts only in your own scratchpad subfolder. Do not touch the database or other repo files.

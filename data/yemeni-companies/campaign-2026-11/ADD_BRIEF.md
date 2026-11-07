# Yemeni products & companies — NEW entries brief (November 2026)

Read RESEARCH_BRIEF.md in this folder first (same rules on facts, sources, contacts, Arabic and validation).
New entries must not duplicate any company in index.json (check spelling variants).

## Output item format (new company)
```json
{
 "slug": "kebab-case english, unique",
 "name": "Arabic trade name (clean spelling, ≤180)",
 "legal_name": "official legal name if known, else empty",
 "category": "one of: أغذية ومشروبات، صناعات تحويلية، زراعة وثروة حيوانية، مواد بناء، أدوية وصحة، عناية وعطور، أثاث وديكور، طاقة ومياه، حرف ومنسوجات",
 "entity_type": "شركة | مصنع | منشأة إنتاج | مؤسسة | جمعية تعاونية",
 "location": "Arabic city/governorate",
 "address": "Arabic address if known",
 "founded": "", "website": "", "email": "", "phone": "", "google_maps_url": "",
 "summary": "120–320 chars", "story": "400–1400 chars", "impact": "200–800 chars",
 "strengths": ["3–5"], "markets": ["…"],
 "products": [{"name": "…", "description": "…", "format": "", "sources": [{"url": "https://…", "title": "…", "type": "official|press|directory|marketplace", "reviewedAt": "2026-11-07"}]}],
 "sources": [{"url": "https://…", "title": "…"}],
 "image": {"file": "Commons file name or empty", "caption": "Arabic"}
}
```
- At least 1 product, each product with ≥1 source URL; at least 2 sources per company overall where possible (the chamber listing counts as one).
- Do not include the names of private individuals (owners) — the site does not need them.
- Only producers of Yemeni goods (factories, farms, cooperatives, roasters, packers, crafts workshops, exporters of local products). No importers, retailers, banks, exchange, travel or services.

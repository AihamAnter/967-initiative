# Yemen ranking source snapshots

Source: The World Bank, World Development Indicators (WDI), and the original providers named in each snapshot's source metadata. Retrieved through the official v2 Indicators API; source id 2. Source links, update dates, retrieval timestamps and observation years are preserved. Rankings and Arabic descriptions are calculated/edited by 967 and are not official World Bank rankings.

Data cover 2000–2025 when available, excluding World Bank regional/income aggregates. Null observations are omitted, never converted to zero. Countries/economies/territories follow the source coverage and are not a sovereignty classification. The comparison is within a single observation year.

World Bank dataset terms: https://www.worldbank.org/ext/en/legal/terms-conditions/datasets
WDI catalog: https://datacatalog.worldbank.org/search/dataset/0037712/world-development-indicators
General dataset licensing is CC BY 4.0 unless indicator/provider metadata state otherwise. Original-provider restrictions and licenses remain applicable; no blanket license is claimed for this collection. Consult the linked source before downstream reuse.

Regenerate locally with `node scripts/sync-yemen-rankings.mjs --force`. This command writes local JSON files only and never modifies Supabase. `manifest.json` records available files and Yemen's latest observation year. Adult literacy remains a draft preset because the current 2000–2025 snapshot contains no Yemen observation.

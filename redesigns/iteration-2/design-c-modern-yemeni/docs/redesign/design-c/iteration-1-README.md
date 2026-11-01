# Direction C — من اليمن. نرى أبعد.

A modern Yemeni identity for 967, designed and implemented in an isolated worktree. Open **http://localhost:3103**. All changes are uncommitted; no PR or merge was made.

The concept borrows its proportions from Sana’a’s plaster-lined windows and masonry, rather than decorating the interface with historical symbols. A typographic arch, brick rules, warm plaster surfaces, and coffee-dark Arabic typography make the platform recognizably Yemeni without adding an illustration download. The identity is proud but quiet enough for reference work: a number’s year, source, and qualification remain more important than decoration.

967 serves both casual discovery and purposeful research. The home therefore introduces the platform, offers search, then presents one work, one magazine issue, and one sourced indicator. Four compact destination groups expose the wider product. Existing game discovery, learning subjects, knowledge promotions, personalized resume actions, and initiative/project information remain accessible; large secondary promotions are now an explicit disclosure. The old `/#about`, `/#projects`, and `/#contact` anchors remain.

## Design system

| Role | Decision |
| --- | --- |
| Paper / surface / alternate | `#faf7ef` / `#fffdf8` / `#eee8da` |
| Ink / secondary text | `#29251f` / `#655d51` |
| Brick / strong action / hover | `#963e2d` / `#7f3023` / `#61251c` |
| Border | `#d8cfbd`; stronger control boundary `#b6a98f` |
| Arabic UI | Self-hosted IBM Plex Sans Arabic, 400–700, font-display swap; existing Unicode subsets retained |
| Latin and numbers | IBM Plex Latin subsets with system fallback; LTR isolation for quantitative values, original digits and units retained |
| Body / labels / metadata | 17px / 14px / 13px; body line height 1.85 |
| Display | Home 52–88px; collections 34–56px; detail 32–54px |
| Section / card titles | 24–34px / 22–24px |
| Spacing | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px |
| Corners | 4px controls/editorial surfaces; compatibility token 6px cards |
| Elevation | Flat editorial cards; shadow reserved for floating navigation |
| Motion / focus | 160/220ms tokens; reduced-motion disables animation and smooth scrolling; visible 3px focus ring |
| Interaction | Minimum 44px control targets; native disclosures; mobile background inert and Escape/focus restoration retained |
| Layout | 1200px home/base container; fluid gutters; 375, 768, 1440px reviewed |

Brick text on paper and coffee text on plaster exceed WCAG AA normal-text contrast. Blue/red debate semantics, data-status wording, and specialized school/game palettes retain their existing meaning. Decorative geometry is CSS only and hidden from assistive technology.

## Navigation and page decisions

The shared vocabulary is **المحتوى**, **المعرفة**, **مدرسة 967**, **ألعاب 967**, **الأدلة**, and **المبادرة**. Destination names are literal and consistent across entry points. Search, contribution, saved reading, account, and editor destinations preserve their existing paths and authorization behavior. The footer groups content and knowledge together for density; its directory heading now matches **الأدلة**.

The home is an introduction, a small editorial selection, and a destination directory. Its three cards provide different ways into the platform without repeating entire section landing pages. The signature arch is decorative; no fabricated Musnad inscription is presented as historical evidence.

Numbers retains filters, domain discovery, source/status/year labels, correction and saved actions, comparisons, methodology, and detail evidence. Large values stay associated with their unit and measurement year. The detail presents the latest value, available series, editorial interpretation, table, and sources; it never implies that one observation is a trend. Works retains text/topic/platform filters, URL state and pagination; detail keeps opt-in media, external source, summary, correction, save, and related work. Existing SEO metadata and structured data remain.

## Implementation and resilience

- Root layout imports only fonts, tokens, and shell/base CSS. Every other route family loads its existing compatibility styles from its own layout. `legacy.css` preserves the specialized pages during rollout, while `collections.css` contains the extracted collection/detail rules needed by works and national numbers. `identity-collections.css` is their direction-specific presentation. This is an incremental migration, not a claim that every legacy rule has been removed.
- Home uses a separate read model: at most one published work, one issue, six eligible indicator candidates, and 360 published national observations. Each of its three reads is independently settled. Only the selected indicator is rendered; failed or empty sources have invitations and an explicit partial-availability notice. Visibility and source-active checks remain enforced.
- Each editorial card has a React error boundary. Home issue/product images now validate URLs, handle network failure, and show a placeholder. Work thumbnails retain their fallback. Image optimization checks the actual configured provider path and HTTPS policy; accepting a hostname alone no longer sends unsupported paths into Next’s optimizer.
- The statistics explorer receives card fields and year availability instead of every observation and relation. Full detail values and exports are unchanged. This reduces serialization without changing client-side search, year filtering, or pagination.
- Nested feature `<main>` elements were changed to neutral wrappers; the root remains the single main landmark. No data mutations, auth actions, game rounds, forms, migrations, seeders, commits, pushes, or PRs were performed.

## Production performance

Measured before any code changes and again on the finished production build, on this machine and port 3103. Both used `npx next build`, then `npx next start -p 3103`. See `measure.py`, raw `before-performance.json` / `after-performance.json`, and the build logs.

| Page | Median TTFB, before → after | Initial bytes, before → after | Change |
| --- | ---: | ---: | ---: |
| Home | 1.833s → 0.741s | 1,739.1 → 1,528.4 KiB | -12.1% |
| Numbers | 1.979s → 1.528s | 631.4 → 468.3 KiB | -25.8% |
| Indicator detail | 0.419s → 0.446s | 583.1 → 543.0 KiB | -6.9% |
| Works | 0.252s → 0.299s | 804.1 → 764.0 KiB | -5.0% |
| Work detail | 0.254s → 0.275s | 807.7 → 767.6 KiB | -5.0% |


The table uses KiB (1024 bytes). TTFB is the median of three sequential compressed curl HTML requests per route. Each route’s unique initial HTML-referenced scripts, stylesheets, preloaded fonts, and `<img src>` resources are fetched with compressed curl, up to six asset requests in parallel. Total is median HTML transfer plus those asset bytes. Images use the HTML fallback `src`, not a viewport-selected `srcset`; it is a reproducible conservative resource inventory, **not browser transferred bytes or LCP**. Below-fold and hidden HTML images are counted. Font totals cover the two explicit Arabic preloads, not every browser-requested subset. Lazy chunks, embeds, hydrated API traffic, and navigation requests are excluded. TTFB includes live production-read latency and should not be treated as a field percentile or causal benchmark.

| Page / state | HTML KiB | JS KiB | CSS KiB | Preloaded fonts KiB | Image src KiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home / Before | 51.7 | 251.3 | 62.0 | 85.1 | 1,288.9 |
| Home / After | 41.8 | 251.1 | 12.8 | 85.1 | 1,137.7 |
| Numbers / Before | 189.3 | 266.6 | 62.8 | 85.1 | 27.7 |
| Numbers / After | 66.3 | 266.3 | 23.0 | 85.1 | 27.7 |
| Indicator detail / Before | 27.3 | 384.1 | 59.0 | 85.1 | 27.7 |
| Indicator detail / After | 27.2 | 383.8 | 19.2 | 85.1 | 27.7 |
| Works / Before | 15.9 | 260.1 | 57.2 | 85.1 | 385.7 |
| Works / After | 15.8 | 259.9 | 17.4 | 85.1 | 385.7 |
| Work detail / Before | 17.3 | 262.4 | 57.2 | 85.1 | 385.7 |
| Work detail / After | 17.2 | 262.2 | 17.4 | 85.1 | 385.7 |


## Verification and evidence

- `npm ci` and final `npx next build` succeeded. Existing lint/autoprefixer warnings are retained in `build.txt`.
- `npm test`: **651 tests; 645 passed, 5 failed, 1 skipped**. Baseline: 650 tests; 644 passed, the same 5 failed, 1 skipped. Added one regression test for unsafe/mismatched image optimization paths.
- Unchanged baseline failures: `migration-layout`, `game-map-projection`, `games-home-profile`, `knowledge-hero-consistency`, `yemen-map-renaming`. Full baseline/final outputs are included.
- All five scoped pages captured before and after at **375, 768, and 1440px**, with full-page PNGs in `before/` and `after/`. Indexes: `0` home; `1` numbers; `2` population indicator; `3` works; `4` work detail. The exact routes are in `routes.json`.
- `after-browser.json` records one main landmark, no page error, and no document overflow on all 15 route/width combinations. Visual review corrected mobile home overflow, the header logo contrast, a selected-filter color collision, and the indicator value panel’s metadata contrast.
- `interaction-qa.json` records mobile menu visibility, background inertness, Escape close, focus restoration, image-request failure survival, and additional legacy-route smoke checks. No form was submitted and no game was started. Browser capture uses headless Chromium; T3 preview failed to capture twice and was closed.
- `capture.cjs` and `interaction-qa.cjs` accept an external Playwright install through `PLAYWRIGHT_MODULE`; no Playwright runtime dependency was added to the site. Run from the worktree root, e.g. `PLAYWRIGHT_MODULE=/path/to/playwright node docs/redesign/design-c/capture.cjs after`.
- `git diff --check` passes.

### Intentional presentation-test updates

Security, publication, scoring, navigation integrity, and source-evidence assertions were preserved.

| Test file | Why updated |
| --- | --- |
| `home-games-showcase.test.mjs` | Games remain available inside an optional disclosure, after the compact destination directory; the repeated mini-landings are intentionally removed. |
| `home-knowledge.test.mjs` | The compact knowledge destination list is primary; the richer existing hub is retained in the disclosure. |
| `home-smart-start.test.mjs` | Smart start precedes the new editorial selection; tests now name the new home sections. |
| `mobile-page-density.test.mjs` | School subject paths now use tuple data instead of objects; all four links remain. |
| `knowledge-content-phase2.test.mjs` | Compatibility stylesheet moved from root into route-owned legacy styles. |
| `knowledge-data-phase3.test.mjs` | Same route-ownership change; statistics keeps its own extracted styles. |
| `knowledge-identity.test.mjs` | Same route-ownership change; specialized legacy knowledge identities remain. |
| `phase5-navigation.test.mjs` | Root shell CSS now comes from `identity-base.css`; all mobile behavior assertions remain. |
| `games-standalone-section.test.mjs` | Footer directory heading now uses the same **الأدلة** vocabulary as the header. |
| `redesign-c-media.test.mjs` (new) | Verifies configured image paths, HTTPS, malformed URLs, and unknown hosts. |

## Known limits and rollout

This is a complete scoped direction, with an incremental compatibility bridge for the rest of the platform. Existing route-specific school, games, history and directory visuals remain; they have not been redesigned. Full assistive-technology testing, authenticated journeys, and database fault injection belong on a fixture/staging environment. The browser failure exercise aborts image requests; dataset independence is implemented with `Promise.allSettled` but was not tested by disrupting production connectivity.

The statistics list still reads the complete published catalog server-side to preserve current search/filter/count semantics. Its client payload is much smaller, but genuine indexed server pagination is the next engineering step. Works also retains its current full-list query and filtering; replacing detail scans with a single-slug query and indexed related-content query should follow. No schema or caching changes were made against production. Home’s bounded indicator selection may show an invitation when its candidate window has no valid published series; it never fabricates a value.

Next, migrate the compatibility stylesheet one route family at a time, remove the extracted superseded overrides, define CMS-owned editorial home slots with the same bounds and failure semantics, establish indexed list/search read models, and agree on editorial invalidation before adding public caching. Validate withdrawn content, richer time series, long titles, specialist Arabic fonts, screen readers, 200% zoom, and low bandwidth against fixtures before rollout. Keep the current auth/visibility and server-authoritative participation systems intact.

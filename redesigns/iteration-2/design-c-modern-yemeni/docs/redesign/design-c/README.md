# Designer C — Iteration 2: Yemen, in a new light

**Preview: http://localhost:3103**  
Worktree: `/Users/wadahmax/.t3/worktrees/967-initiative/t3-61beea9a`  
All changes remain uncommitted. No production content, account, or participation data was changed.

Iteration 1 simplified by subtraction; the client wanted the richness retained. This iteration restores the complete home and changes the visual language: electric cobalt, mint light, dimensional geometric arches, generous bento surfaces, full-bleed media, and a translucent sticky shell. Sana’a geometry becomes a contemporary brand graphic, with a small Musnad accent in the learning section; no decorative bitmap or animation library is needed.

## Content parity — 11 / 11

Before implementation, I opened the original home on port 3000 and recorded every heading, card, value, count, and content link. The complete inventory is in [iteration-2/main-inventory.md](iteration-2/main-inventory.md), with machine-readable JSON beside it. Port 3000 was only read; only the server on 3103 was stopped or started.

All principal sections below are visible in the normal page flow. Only the original about/projects content is inside disclosures. The final browser parity report checks copy, every original content-link destination, four featured save buttons, and both original disclosures.

| Original requirement | Iteration-2 location and retained substance | Result |
| --- | --- | --- |
| 1. Hero | Original tagline **من اليمن، لكل اليمنيين**, H1 **اليمن، أقرب إليك.**, full introduction, and labeled search. New CSS/SVG brand graphic sits alongside it. | ✓ |
| 2. Smart start | Immediately below hero: learn, discover, games; descriptions, sign-in hint, and unchanged authenticated personalized component. | ✓ |
| 3. Featured picks | **من 967، إليك.** bento: lead work and image, issue cover/title/number/date, debate cover/title/status, population **42,961,653**, year/source/status. All four have save actions. | ✓ |
| 4. School | Visible cobalt learning surface: **15** paths / **180** stations; four subjects and **36 / 48 / 48 / 48** station counts; all five links. | ✓ |
| 5. Knowledge | Visible **استكشف المعرفة** bento: history, map, figures, numbers, ranking, descriptions, and knowledge-search link. | ✓ |
| 6. Games | Visible **ألعاب 967** and **إلى أي مدى تعرف اليمن؟**; official UTC daily challenge, **9 / 14 / 7** figures, three previews, friend invitation, weekly competition, all eight original links. No game was started. | ✓ |
| 7. Discovery | **فضولك، يحدد البداية.**: watch, magazine, understand, map, products; search link. A thumb-friendly snap rail on smaller screens. | ✓ |
| 8. Numbers | **لنفهم الواقع، نقترب من أرقامه.** with political stability **21.69**, participation/accountability **25.67**, years, sources, estimates, saves, and both catalog/ranking links. No trend is invented from one observation. | ✓ |
| 9. Community | **أشياء تُصنع. ومهارات تُنجز.**: featured Cartobox company, real image, category/location, directory route, and atlas link; professional content remains visibility controlled. | ✓ |
| 10. Contribution | Mint participation surface retains **لديك حكاية، معلومة، أو فكرة؟ نسمعك.** and **تواصل وشارك**, with `#contact`. | ✓ |
| 11. About/projects | Original **مساحة تتسع لنا جميعًا.** / **مسارات نعمل على تطويرها.**, complete expandable copy, tags, vision/fields, three project descriptions and planned statuses; `#about` / `#projects` retained. | ✓ |

See [iteration-2/parity.json](iteration-2/parity.json). Personalized signed-in behavior is retained in the original component and covered by its existing tests; production sign-in was deliberately not exercised.

## Visual system, light and dark

| Token / behavior | Light | Dark |
| --- | --- | --- |
| Canvas | `#f6f7fd` | `#0d1020` |
| Elevated surface | `#ffffff` | `#191e34` |
| Alternate surface | `#edf0fc` | `#20263e` |
| Ink | `#15162b` | `#f1f3ff` |
| Secondary text | `#666982` | `#b1b9d3` |
| Borders | `#dfe3f1` | `#353d59` |
| Brand / readable brand text | `#3f43ed` / `#3034c7` | `#a8adff` / `#b9beff` |
| Fixed action fill | Cobalt `#3f43ed`, white label | Same: maintains contrast |
| Mint brand light | `#b8f7d7`, dark ink | Same, used as an intentional accent |
| Header | Translucent white, 20px backdrop blur | Translucent navy, same blur |
| Radius / elevation | 14px controls, 24–36px surfaces, soft layered shadows | Same geometry, deeper shadow |

Self-hosted IBM Plex Sans Arabic remains the UI face with its existing Unicode subsets and swap behavior. Arabic display type scales from 52px on phone home to 92px on desktop; collection/detail titles scale 38–68px; body 17px and readable line lengths remain. Values retain LTR isolation, units, observation years and evidence. Spacing follows the existing 4px-based scale.

The home mixes one dominant media card with a magazine and a two-card stack, then alternates broad learning/game surfaces with quiet knowledge/data sections. Detail pages keep generous hierarchy and evidence panels; list pages keep real filters/counts and compact cards. All five scoped pages and the shared shell use the new language.

Hover and press affordances use CSS transforms; supported browsers get scroll-driven reveals and cross-document View Transitions. The non-supporting fallback is fully visible static content. Reduced-motion disables motion and smooth scrolling. Dark mode follows `prefers-color-scheme`, not a hydration-dependent theme switch. Native disclosures, visible focus, touch-sized controls, the inert mobile-menu background, and Escape/focus restoration remain. There is one main landmark.

## Speed and failure isolation

Iteration-1 routing, SEO, auth, visibility and data-integrity work remains. Root loads fonts/tokens/base/shell; route families own their CSS. No dependency was added.

Home queries are bounded: one work, one issue, three named indicators and at most 360 national published observations, two company candidates, one professional, and one explicitly selected anonymous public debate-detail read. Optional directory columns retain the existing schema-compatibility reader. Each dataset settles independently; each featured card has a local React error boundary and safe image fallback. The debate uses the anonymous public detail RPC, not a privileged editorial query or an unbounded scalar catalog RPC. The featured debate, three indicators and company candidates are explicit editorial slots; a future CMS selector should preserve these query bounds. Empty/failed datasets preserve section invitations and a partial-availability notice, never a fabricated record.

The statistics client still receives card fields and available years rather than full time series. Detail/export/source data remains complete. Responsive image srcsets are retained, while optimized HTML fallback `src` values are now bounded (828px work, 640px home image, 128px brand) instead of a 3840px fallback. This also makes the original curl resource-inventory method less pessimistic; it is **not a claim that all browsers previously downloaded the fallback size**. No decorative hero image or chart library ships on home. The existing detail chart stays lazy.

## Original baseline → iteration 2

| Page | Initial KiB before → after | Change | Median TTFB before → after |
| --- | ---: | ---: | ---: |
| Home | 1,739.1 → 1,108.0 | -36.3% | 1.833s → 0.507s |
| Numbers | 631.4 → 445.2 | -29.5% | 1.979s → 1.816s |
| Indicator detail | 583.1 → 519.8 | -10.9% | 0.419s → 0.529s |
| Works | 804.1 → 602.0 | -25.1% | 0.252s → 0.396s |
| Work detail | 807.7 → 605.7 | -25.0% | 0.254s → 0.330s |


Bytes are the same compressed curl resource inventory used in iteration 1: median of three HTML responses, plus unique HTML-referenced JS, CSS, two font preloads, and `<img src>` resources. Values are KiB (1024 bytes). Image fallback `src`, rather than viewport-selected `srcset`, is counted; lazy chunks, API requests and embeds are excluded. This is a reproducible resource inventory, not Lighthouse, LCP, or field Core Web Vitals. TTFB includes live production database latency and is reported without claiming that every timing variation is a design effect.

| Page / state | HTML KiB | JS KiB | CSS KiB | Font preloads KiB | Image src KiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home / Original | 51.7 | 251.3 | 62.0 | 85.1 | 1,288.9 |
| Home / Iteration 2 | 53.5 | 251.7 | 16.0 | 85.1 | 701.6 |
| Numbers / Original | 189.3 | 266.6 | 62.8 | 85.1 | 27.7 |
| Numbers / Iteration 2 | 66.4 | 266.9 | 24.5 | 85.1 | 2.2 |
| Indicator detail / Original | 27.3 | 384.1 | 59.0 | 85.1 | 27.7 |
| Indicator detail / Iteration 2 | 27.4 | 384.4 | 20.7 | 85.1 | 2.2 |
| Works / Original | 15.9 | 260.1 | 57.2 | 85.1 | 385.7 |
| Works / Iteration 2 | 16.0 | 260.6 | 18.8 | 85.1 | 221.5 |
| Work detail / Original | 17.3 | 262.4 | 57.2 | 85.1 | 385.7 |
| Work detail / Iteration 2 | 17.4 | 262.8 | 18.8 | 85.1 | 221.5 |


The baseline is the **original main production build**, captured before iteration 1, not the rejected design. Raw baseline and new JSON and the measurement script are included. The smaller transferred inventory on every scoped route is achieved while restoring all home content. Catalog queries still read full published server lists for existing client search semantics; indexed server pagination remains future work.

## Verification

- Final production build: passes; log in `iteration-2/build.txt`.
- `npm test`: **651 tests, 645 passed, five original failures, one skipped**. Full final log in `iteration-2/tests.txt`.
- The five failures remain migration-layout, game-map-projection, games-home-profile, knowledge-hero-consistency, and yemen-map-renaming. One early run also hit an unrelated transient isolated-PostgreSQL audit timestamp/CAS test failure; the repeated complete run returned to the five baseline failures. No database test was changed to hide it.
- Original home presentation tests are restored, since the original sections and placement are restored. Earlier route-CSS ownership assertions and the footer **الأدلة** vocabulary migration remain; media URL regression coverage remains. No security, scoring, publication or source-evidence assertion was removed.
- **30 new full-page screenshots:** five pages × 375/768/1440 × light/dark, in `iteration-2/`. Filename pattern `light-375-0.png`; page indexes 0 home, 1 numbers, 2 indicator, 3 works, 4 work detail. Every screenshot was visually reviewed, with corrections for dark legacy surfaces/controls, company projection compatibility, and lazy images before capture.
- `iteration-2/browser-checks.json` records overflow, landmarks, headings, links and copy. `iteration-2/parity.json` records the 11 groups, every original link, four save actions and expanded about/projects content.
- Screenshot and parity browsers block non-GET requests. No login, save, form submission, content write, game round, migration, commit, push or PR was performed; the initial original-page browser view may emit its normal permitted analytics event.
- Read-only image failure and menu behavior checks from iteration 1 are retained; the authenticated personalized UI is not claimed as production-browser tested.

## Remaining rollout work

The scoped design is implemented; legacy route-specific styles remain a compatibility bridge. Consolidate them route by route rather than globally forcing school/game tools into a reference-page layout. Use staging fixtures for authenticated flows, withdrawn content, forced dataset outages, full assistive-technology checks and long-title stress cases. Agree on CMS home-slot configuration, indexed list/search reads and editorial invalidation before changing public caching. No schema or long-lived public cache was added here.

The original iteration-1 case study is archived as `iteration-1-README.md`; its screenshots and metrics remain available for traceability. Final production preview stays on port **3103**.

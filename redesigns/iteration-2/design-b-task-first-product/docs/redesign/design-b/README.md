# 967 — Design B, iteration 2: "Wayfinder 2026"

> Six verbs, six colour worlds, one complete home. Every screen still answers **what can I do here, and where next?**, now with the depth, motion and dark mode of a 2026 product.

Live build: `http://localhost:3102` (production build, `npx next start -p 3102`).
Scope: design system, shared shell, home, Yemen in numbers (list + indicator), Works (list + detail), in light and dark.

---

## 1. What changed in iteration 2, and why

The client rejected iteration 1 for two reasons. Both are fixed.

| Client feedback | What iteration 2 does |
|---|---|
| **"You cut my home page."** | Every section of the original home is back: all **11 sections, 35 headings, 31 links, every number, both expandable blocks**. This was verified in a real browser against the original on `:3000` (§3). The content is arranged as a bento with richer presentation, not as a list of stacked boxes. |
| **"It looks like 2005."** | A new visual language: a glass sticky header, gradient colour worlds per verb, expressive Arabic display type, layered soft shadows, mesh backgrounds, full-bleed media cards with overlays, scroll-driven reveals, micro-interactions, a polished **dark mode**, snap rails on phones and a floating glass tab bar. The brand moment is a stained-glass **qamariya**: the arched Sana'a window, drawn as inline SVG, whose six panes are the six verbs. |

Everything good from iteration 1 is kept:

- **Speed:** bounded queries, server-side pagination, scoped CSS, two font weights, no double image downloads, lazy charts.
- **Resilience:** bad-image and failed-section isolation.
- **Structure:** the single navigation source, plus the bug fixes and test hygiene.

The six-verb wayfinding is now the hero's **dock**: six gradient tiles directly under the search, and a snap rail on phones. The mobile tab bar is a floating glass capsule.

---

## 2. The concept

**Task-first, made 2026.** 967 serves very different visitors: readers, researchers, learners, players, people looking for services, and contributors. The design greets them all with one search field and six verbs, each in its own colour world:

| Verb | Section | Colour world (vivid → deep) |
|---|---|---|
| اقرأ وشاهد | المحتوى | coral `#ff5a3c` → wine `#b3203f` |
| استكشف اليمن | المعرفة | electric blue `#3a6bff` → indigo `#2a2fb8` |
| تعلّم | مدرسة 967 | emerald `#12b981` → pine `#0a6b5a` |
| العب | ألعاب 967 | violet `#8b5cff` → night `#3b1d8f` |
| اعثر على خدمة | الأدلة | amber `#ffb020` → burnt `#b8430f` |
| شارك | المبادرة | teal `#00a7a0` → 967 teal `#00646c` |

A colour world follows the visitor across every surface:

- the header dot and its panel banner;
- the dock tile;
- the home section that belongs to the verb (emerald school, violet arcade, blue knowledge and numbers);
- the collection page banner (coral on Works, blue on Numbers);
- the footer accent.

You always know which "world" you are in. Colour is never the only signal: a text label sits next to it every time.

---

## 3. Content-parity checklist (home)

Each item from the brief, where it now lives, and how it was verified. A browser script ([`tools/parity.mjs`](tools/parity.mjs)) loaded the original home on `:3000` and this home on `:3102` with Playwright (analytics, account, school and games APIs aborted, so the check was read-only). It compared the rendered `<main>`:

- **Headings:** all **35/35** original headings are present.
- **Links:** **0** original links are missing (31 original, 36 new; the extras are the six dock tiles).
- **Numbers:** **0** original numbers are missing.
- **Save buttons:** 5 → 6.
- **Expandable blocks:** `#about` and `#projects` are both present.

The automated test `tests/design-b.test.mjs` ("content parity") pins the same list in source.

| # | Original section | Where it lives now | Verified |
|---|---|---|---|
| 1 | Hero: tagline "من اليمن، لكل اليمنيين", H1 "اليمن، أقرب إليك.", intro, search | Top of page. The tagline is a glass pill with a six-colour orb. The H1 is display size with a gradient highlight. The intro, the glass search capsule and the suggestion chips sit beside the qamariya brand mark. | ✅ |
| 2 | "من أين تحب أن تبدأ؟" with 3 cards, sign-in hint and the signed-in state | Directly after the six-verb dock. It shows the 3 cards (ابدأ بالتعلم / اكتشف اليمن / جرّب ألعاب 967) as raised cards with gradient icons, plus the sign-in hint. Signed-in members get the original personalised `HomeSmartStart`, loaded only when a session may exist. Returning guests also see "تابع من حيث توقفت" (recent page, saved item, today's challenge). | ✅ (guest verified; member path is the original component, not exercised: no sign-in on production) |
| 3 | "من 967، إليك.": lead work with image, magazine issue with cover, debate with image, population card, each with save | A 12-column bento:<br>• lead work as a large full-bleed overlay card (7 columns × 2 rows);<br>• the issue with a tilted cover;<br>• the population card with a gradient big number and a sparkline;<br>• the debate as a wide cinematic banner.<br>All four keep their save buttons. | ✅ |
| 4 | "مدرسة 967": paths, counts, 5 links | An emerald world block with "15 مسارًا / 180 محطة" as big stats, the 4 track cards (36/48/48/48 stations, with progress bars) and "جميع المسارات" (5 links). | ✅ |
| 5 | "استكشف المعرفة": 5 doors | A bento: تاريخ اليمن is a large indigo feature with era steps; خريطة اليمن، شخصيات يمنية، اليمن بالأرقام and ترتيب اليمن are tiles. "ابحث في المعرفة" is kept. | ✅ |
| 6 | "ألعاب 967": "إلى أي مدى تعرف اليمن؟", daily challenge, 8 links | A dark arcade block with a neon grid, the 9 / 14 / 7 stats, "العب تحدي اليوم", the 3 game previews (a snap rail on phones), "تحدَّ صديقك" and a bottom bar with today's challenge title and the leaderboard. All 8 links are kept. | ✅ |
| 7 | "فضولك، يحدد البداية.": 5 doors | Five tinted doors that fill with their world gradient on hover (a snap rail on phones), plus "ابحث في كل المنصة". | ✅ |
| 8 | "لنفهم الواقع، نقترب من أرقامه.": indicators and links | A deep-blue data band. The political stability and voice and accountability indicators appear as glass number cards with big numbers, **SVG sparklines** (no chart library), year, value-kind and source chips, and save. "استكشف المؤشرات" and "أين يقف اليمن عالميًا؟" are kept. | ✅ |
| 9 | "أشياء تُصنع. ومهارات تُنجز.": featured company (with image) | An amber overlay card for the featured company (the *Cartobox* record), the professional card when that directory is visible, and "وكل مكان، له حكاية." (atlas). The production record has **no image** (`image_url` is empty, and the original showed a placeholder too), so a gradient art fallback is shown. | ✅ (image shown whenever the record has one) |
| 10 | "لديك حكاية، معلومة، أو فكرة؟ نسمعك." | A teal gradient call-to-action band at `#contact`, using the editor-managed title and button label. | ✅ |
| 11 | "مساحة تتسع لنا جميعًا." about and "مسارات نعمل على تطويرها." projects | Two expandable panels (`#about`, `#projects`) with an animated plus icon. They hold all the about text (title, description, tags, vision, fields, "المزيد عن المبادرة") and the 3 projects with their status. | ✅ |

---

## 4. Design system (light and dark)

### Tokens (`app/ui-tokens.css`, prefix `--ui-`)

| Group | Light | Dark |
|---|---|---|
| Paper / surface / sunken | `#f7f4ee` / `#ffffff` / `#ece6db` | `#0b1217` / `#121d24` / `#0e171d` |
| Ink (3 levels) | `#101c24` / `#384954` / `#56656e` | `#eef3f4` / `#c3cfd4` / `#97a7ae` |
| Glass (header, tab bar, filters) | `rgba(255,255,255,.66 / .86)` + blur 16–24px | `rgba(16,26,33,.62 / .86)` + blur |
| Action | 967 teal `#00646c` | aqua `#3fd0c6` |
| Worlds | `--ui-{read,explore,learn,play,find,join}-{a,b,tint,ink}` (table in §2) | tints become translucent; ink becomes the light tone of the same hue |
| Type | IBM Plex Sans Arabic, **2 weights (400/700)**. Display `clamp(44px … 100px)`, 2XL 34–56, XL 26–36, body 17 (line-height 1.85), with tight display leading (1.12) and tracking | same |
| Shape | radius 10 / 16 / 24 / 32 / pill | same |
| Depth | three layered shadows (contact, ambient and key) plus a 1px ring | darker shadows with an inner highlight |
| Motion | 160 / 260 / 520 ms, plus a `--ui-spring` overshoot curve | same; all durations are 0 under reduced motion |
| Brand mesh | three radial gradients (teal, violet, amber) behind the top of every page | same, on dark paper |

**Dark mode** follows `prefers-color-scheme`. It is scoped with `:root:has(.ui-page)`, so it applies only on redesigned pages. Legacy sections (games, school and others) keep their light styling, so a dark shell never sits on a light page.

### Motion (CSS only, no libraries)

- **Scroll-driven reveal:** `animation-timeline: view()` raises each home section into place. It animates transform and opacity only, so it causes no layout shift. It is wrapped in `@supports` and `prefers-reduced-motion: no-preference`, and without support the content is simply visible.
- **View Transitions:** `@view-transition { navigation: auto }` animates cross-document navigations, including GET filter forms, where the browser supports it. Next's client-side navigations are not animated (a React feature flag would be needed).
- **Micro-interactions:**
  - spring lifts on cards, doors, tracks and dock tiles;
  - press-scale on buttons and the tab bar;
  - arrow nudges;
  - an image zoom on hover;
  - a rotating plus icon on the expandable panels;
  - a pulsing "live" dot on the arcade;
  - a floating qamariya.
- **Reduced motion:** every one of these is disabled under `prefers-reduced-motion`.

### Shell

- **Header:** a glass sticky header. The blur lives on `::before`, because a `backdrop-filter` on the header itself would trap the fixed mobile sheet. It holds a segmented verb capsule with world dots, glass panels with a gradient banner per world, an expanding search field and a solid account pill.
- **Mobile:** a floating glass tab bar (الرئيسية · ابحث · الأقسام · محفوظاتي · حسابي) above the safe area, plus a full-height sections sheet with world-coloured groups.
- **Footer:** a deep, gradient-lit brand moment with a huge outlined "967" and world accents on each group.

### Components added or redone in iteration 2

- **Qamariya** (inline SVG, about 4 KB): the brand mark.
- **TaskLauncher:** the six-verb dock of gradient tiles.
- **HomeSections:** smart-start cards, picks (`LeadWork`, `IssuePick`, `DebatePick`, `NumberCard`), `SchoolBlock`, `KnowledgeBlock`, `GamesBlock`, `CuriosityDoors`, `CompanyCard`, `ProfessionalCard`, `AboutProjects`.
- **Sparkline:** an inline SVG with gaps kept for missing years and a screen-reader text range. It is used on the home and in the indicator rows.
- **Cards and Collection:** redone as media cards with inset imagery, gradient collection banners with glass sibling tabs, a glass filter dock and a capsule pager.

---

## 5. Performance: before and after

**Method.** Both are production builds on the same machine and the same production database. The baseline is a clean `git archive` of the original commit `d6ce164`. Both were measured **back-to-back within minutes** with [`tools/measure.mjs`](tools/measure.mjs). Raw data: [`measure-before2.json`](tools/measure-before2.json) and [`measure-final.json`](tools/measure-final.json); [`measure-after3.json`](tools/measure-after3.json) is a second run of the redesign for noise.

- **First byte** and **HTML complete** are medians of 9 `curl --compressed` requests.
- **Transfer and LCP** come from headless Chromium at 375 px (DPR 2) with mobile emulation. Each URL is counted once. Analytics POSTs were aborted, so nothing was written.

| Page | First byte (ms) | HTML complete (ms) | HTML decoded KiB | HTML wire KiB | JS KiB | CSS KiB | Fonts KiB | Images KiB | **Total transfer KiB** | LCP (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| Home `/` | 1938 → **143** | 1949 → **1959** ¹ | 216.9 → 235.4 ² | 51.7 → 61.8 ² | 214.0 → **142.2** | 62.1 → **20.9** | 251.3 → **122.8** | 114.6 → 196.4 ³ | 694.3 → **544.9 (−22%)** | 2108 → **188** |
| Yemen in numbers | 1961 → **134** | 1992 → **1908** | 2561.2 → **198.3** | 189.3 → **58.3** | 229.3 → **138.9** | 62.9 → **24.7** | 251.3 → **122.8** | 4.1 → 4.1 | 738.8 → **349.4 (−53%)** | 1992 → **196** |
| Indicator detail | 406 → 412 ⁴ | 410 → 416 ⁴ | 157.4 → **136.6** | 31.8 → **29.2** | 345.9 → **263.3** | 59.1 → **11.5** | 251.3 → **122.8** | 4.1 → 4.1 | 694.0 → **431.4 (−38%)** | 432 → **420** |
| Works | 257 → 266 ⁴ | 259 → 268 ⁴ | 72.8 → **58.8** | 15.9 → **15.0** | 222.9 → **137.4** | 57.3 → **20.9** | 251.3 → **122.8** | 192.8 → **164.5** | 740.4 → **460.9 (−38%)** | 492 → **308** |
| Work detail | 257 → 258 ⁴ | 260 → 394 ⁵ | 79.8 → **65.2** | 17.3 → 17.3 | 225.1 → **143.6** | 57.3 → **22.7** | 251.3 → **122.8** | 192.8 → 192.8 | 744.2 → **500.9 (−33%)** | 296 → **276** |

**Result.** Total transfer, JS, CSS, fonts and LCP all improve on every page:

- total transfer: **−22% to −53%**;
- JS: **−24% to −38%**;
- CSS: **3–5× smaller**;
- fonts: **halved**;
- LCP: up to **11× faster** on the two data-heavy pages, because their shells stream at about 140 ms.

Notes:

1. **HTML complete** is bound by Supabase latency and varies by ±400 ms between runs: the redesign's second run gave home 2103 ms and numbers 1942 ms, while the baseline gave 1949 and 1992 ms. The home still loads the same data the original loaded, now in parallel streamed sections.
2. **Home HTML is about 10 KiB larger on the wire.** That is the price of restoring the full content (11 sections) in richer markup; iteration 1's cut-down home was 31 KiB. It is still bounded: the payload no longer grows with the catalogue.
3. **Home images are about 80 KiB more.** The picks now show real full-bleed media (the lead work, an issue cover at the right size, and the debate cover) instead of the original small thumbnails. The lead image is quality 45 at the rendered size, and all picks are below the fold and lazy-loaded with fixed aspect ratios (no layout shift).
4. Single-record pages have the same server work as before, so their timings are within noise (±40 ms).
5. Related works are now a bounded query (two requests in parallel) that streams in *after* the player has painted, instead of scanning the whole catalogue. The video and details paint at the same time as before.

---

## 6. Screenshots (light and dark, 375 / 768 / 1440)

Folder: [`iteration-2/`](iteration-2/), 30 full-page captures named `it2-<page>-<width>-<light|dark>.png` for home, numbers, indicator, works and work-detail. They were taken with reduced motion, so the scroll-reveal is at its final state. In full-page phone captures, the floating tab bar appears where the first viewport ended; that is an artefact of the capture, not the layout.

Iteration-1 before and after captures remain in [`screenshots/`](screenshots/).

### Browser review (iteration 2)

All five pages were checked at 375, 768 and 1440 px in light and dark mode:

- no horizontal overflow;
- one `main` and one `h1` per page;
- every input labelled;
- keyboard: the skip link comes first, panels open with Enter and close with Escape with focus restored, and the mobile sheet makes the background inert and restores focus to the tab-bar button.

Issues found by looking at the captures and fixed:

- The number card was ordered after the debate banner, which broke the bento.
- A chip-colour specificity bug made "مجلة 967" and "السكان" chips unreadable.
- The save button overlapped the issue chips on phones.
- The in-player "open on the original platform" button was white on white in dark mode.
- The footer accent bars were full-width on phones.
- The sign-in icon wrapped onto its own line.
- Knowledge doors and the about/projects titles used `<strong>`/`<b>` instead of headings. They are real `h2`/`h3` elements again, as in the original.

---

## 7. Tests

`npm test`: **658 tests, 652 pass, 5 fail, 1 skipped.** The 5 failures are exactly the 5 that already fail on `main`:

- `migration-layout`
- `game-map-projection`
- `games-home-profile`
- `knowledge-hero-consistency`
- `yemen-map-renaming`

The PGlite database suite (`inline-editor-database`) is timing-sensitive when the machine is busy. It failed once during a run while builds were in progress, then passed alone and on re-run. It was not modified.

**Iteration-2 test updates** (the home contract changed again, because the full content is back):

| Test file | Change |
|---|---|
| `design-b` | Section boundaries 2 → 3. **New: a content-parity test** covering all 11 sections' key strings and components. **New: a design-system test** covering light/dark tokens, the six worlds, scroll-driven reveal with reduced-motion gating, view transitions, the glass header on `::before`, no chart library on the home, and Latin digits only. |
| `home-smart-start` | Smart start follows the hero and the dock and keeps its guest cards, sign-in hint and lazy member state. |
| `home-knowledge` | Restored close to its *original* wording: `visibleHomeKnowledge`, `id="explore-knowledge"`, the featured-history rule and the hidden-when-empty behaviour, now on `KnowledgeBlock`. |
| `home-games-showcase` | Restored: games gets a large integrated section with `id="home-games"`, the daily title, stats, duel and weekly items, plus the visibility gate. |
| `mobile-page-density` | School track links, the compact two-column tracks and snap rails on phones. |

Iteration-1 test updates (navigation moved to `lib/navigation.js`, legacy CSS moved out of the root layout, and the migrated numbers page) are unchanged and listed below.

<details><summary>Iteration-1 test changes (still in place)</summary>

| Test file | What changed | Why |
|---|---|---|
| `games-967`, `games-standalone-section`, `school-967`, `school-arud`, `yemen-history`, `yemeni-figures-separation` | Link and label checks moved from `Header.jsx`/`Footer.jsx` to the shared `lib/navigation.js`. Games stays a standalone task, outside knowledge, with exactly one entry. | One navigation vocabulary for header, sheet, dock and footer. |
| `phase5-navigation`, `visual-audit-fixes` | Sheet focus, inert background, scroll lock, Escape restore and visibility filtering are asserted on the new header. The footer is a single DOM structure. | The sheet replaced the per-group disclosures. |
| `knowledge-content-phase2`, `knowledge-identity`, `knowledge-data-phase3` | "Imported by the root layout" became "imported by the legacy stack". The numbers list and indicator are asserted on the new server-side pages, with the same evidence tokens. | The root ships only fonts, tokens and base CSS. |
| `knowledge-hero-consistency`, `yemen-map-renaming` (already failing on main) | Only the assertions this redesign would also break were updated. Their original failing assertions are untouched. | Avoids hiding a new regression behind an old failure. |

</details>

---

## 8. Known gaps

- **Not exercised:** signed-in states (the member smart start, header account and editor link) and a real broken-image record, because production is read-only and sign-in was out of bounds. Both paths are unit-tested or are the original components.
- **Dark mode is not on legacy pages:** sections not yet migrated stay light, by design, until they are migrated.
- **View Transitions** cover full-document navigations only. Next client navigations are not animated (that would need React's experimental `ViewTransition`).
- **Data queries:** the numbers list still loads every indicator on the server to filter and rank, although only 12 rows are sent. SQL-side search and pagination is the next performance step.
- **Featured company image:** it depends on the record having one; the current production record has none.
- **Retired home components:** `HomeGames`, `HomeKnowledge` and `HomeCards` are retired from the home (their content now lives in `HomeSections`) but are kept because their own unit tests still read them. Remove them together during rollout.

## 9. Rollout recommendation

Migrate the remaining sections route by route:

1. Drop the route's `LegacyStyles` import.
2. Wrap the page in `.ui-page`, which turns on the tokens, dark mode and mesh.
3. Use `PageHeader` with the section's colour world, plus `Cards` and `Collection`.

Suggested order:

- **Magazine** (read world);
- **Debates** (read);
- **Directories** (find; the biggest payload win);
- **Figures, History, Map** (explore);
- **Search**;
- **School and Games hubs** (learn and play: their worlds are already defined);
- **Account and auth**;
- **Admin last**.

Then:

- move filtering into Supabase;
- add tag-invalidated caching for public catalogues;
- delete legacy sheets as they empty out.

---

<a id="verification"></a>
### Verification scripts

- `tools/measure.mjs`: performance (curl medians + headless Chromium transfer and LCP).
- `tools/screens.mjs`: full-page captures, `node screens.mjs it2 <dir> http://localhost:3102 375,768,1440 light,dark`.
- Parity check: a Playwright comparison of the rendered `<main>` (headings, links, numbers, save buttons, details) between `:3000` and `:3102`. It was run read-only with the API routes aborted. Output summary is in §3.

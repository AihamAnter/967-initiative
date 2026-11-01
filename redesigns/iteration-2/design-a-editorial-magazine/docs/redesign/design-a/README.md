# 967 — Direction A, Iteration 2: "Editorial, made 2026"

A built, running redesign of the 967 Initiative, not a mock-up.
Preview: **http://localhost:3101** (production build: `npx next build && npx next start -p 3101`).
Screenshots for this iteration are in [`iteration-2/`](iteration-2/): five pages at 375, 768 and 1440 px, in light and dark.

---

## 1. What changed since iteration 1, and why

The client rejected iteration 1 for two reasons: **"you cut my home page"** and **"it looks like 2005"**. Iteration 1 was a calm, newsprint front page that replaced ten home sections with six section "doors".

Iteration 2 keeps the engineering and redoes the visual design and the home content.

| Kept from iteration 1 | Redone in iteration 2 |
|---|---|
| Bounded home queries, card-sized numbers payload, parallel page fetching | **Home content:** all 11 original sections are back, with the same headings, cards, numbers and links (checklist in section 2) |
| Root CSS limited to the shell; route CSS loads per route; strict CSS chunking | **Visual language:** from flat newsprint to a premium 2026 digital magazine (section 3) |
| Two text weights; Markazi Text display face; no extra Plex weights | **Dark mode** through `prefers-color-scheme`, polished on every redesigned page |
| Shared image policy, `SafeImage` (no double downloads, SVG-safe), per-section error isolation | **Motion:** scroll-driven reveals, view transitions, micro-interactions, all CSS and all reduced-motion aware |
| One navigation source (`lib/navigation.js`), the `/read-later` fix, single `<main>` | **Mobile:** a glass tab bar within thumb reach, snap-scrolling rails, a full-height menu sheet |
| Recharts only where a chart is drawn | **Data:** inline SVG sparklines, big tabular figures, and source/year chips everywhere |

**The concept.** 967 becomes a culture-and-knowledge magazine you can explore: an immersive mesh hero with a giant outlined "967" mark, then a bento front page where each story keeps its own colour. Inside it sit a dark arcade, a dark data band, and glass surfaces that float over soft gradients. The editorial intelligence stays: careful curation, and every number shown with its measurement year, its source, and whether it is official or estimated.

---

## 2. Content-parity checklist (Rule 1)

I took the inventory of the current home page (main, port 3000) with read-only GETs. `iteration-2/perf/parity.js` then **verifies it in Chromium** on the production build, at 1440 and at 375 px, as an anonymous visitor. Result: **102 checks, 0 failures** (51 items × 2 widths). The raw output is in [`iteration-2/content-parity-check.txt`](iteration-2/content-parity-check.txt).

| # | Original section and content | Where it lives now | Verified |
|---|---|---|---|
| 1 | Hero: tagline "من اليمن، لكل اليمنيين", H1 "اليمن، أقرب إليك.", intro text, search box | Immersive hero: animated mesh, outlined "967" brand mark, dateline pill, gradient highlight on "أقرب إليك.", and a glass search bar | ✅ all 4 |
| 2 | "من أين تحب أن تبدأ؟": 3 cards (ابدأ بالتعلم / اكتشف اليمن / جرّب ألعاب 967), sign-in hint, signed-in personalised state | Floating glass panel overlapping the hero. Same `HomeSmartStart` component: guests see the 3 cards and the hint; members see resume, saved items and today's game | ✅ all 5 (member state is unchanged code, not exercised: read-only) |
| 3 | "من 967، إليك.": lead work (image), magazine issue (cover), debate (image), population number, each with save | Bento: full-bleed lead media tile, a tilted magazine cover tile, a population tile with its source and value-type chips, and a wide debate tile with image and participants. Four save buttons | ✅ all 6 |
| 4 | "مدرسة 967": paths, counts, 5 links | Warm amber block: "15 مسارًا و180 محطة", a stat trio, "جميع المسارات", and 4 track cards with station meters and counts | ✅ heading, counts, 5 links |
| 5 | "استكشف المعرفة": 5 knowledge doors | Bento: a dark "تاريخ اليمن" feature with era steps, 4 colour-keyed tiles, and "ابحث في المعرفة" (a snap rail on phones) | ✅ heading and 5 doors |
| 6 | "ألعاب 967": "إلى أي مدى تعرف اليمن؟", daily challenge, 8 links | Dark arcade: stats 9 / 14 / 7, "العب تحدي اليوم" (UTC daily URL), "تصفح جميع الألعاب", a 3-game rail (snap on phones), "تحدَّ صديقك" / "اختر اللعبة", "اكتشف الألعاب التسع", and a bar with today's game and "لوحة المتصدرين" | ✅ heading, title, daily link, 8 links |
| 7 | "فضولك، يحدد البداية.": 5 discovery doors | Colour-keyed door cards (a snap rail on phones) plus "ابحث في كل المنصة". The professionals door also renders whenever editors make that section visible | ✅ heading and 5 doors |
| 8 | "لنفهم الواقع، نقترب من أرقامه.": indicators and links | Dark data band: political stability, voice and accountability, plus a third indicator. Each card has a big figure, a sparkline, its source, value type, "تفاصيل المؤشر" and save. Also "استكشف المؤشرات" and "أين يقف اليمن عالميًا؟" | ✅ heading, both named indicators, both links |
| 9 | "أشياء تُصنع. ومهارات تُنجز.": featured product or company (image) | Wide company card with image, category and location chip, a professional card (whenever that section is visible), and the "وكل مكان، له حكاية" atlas card | ✅ heading, company and image, atlas link |
| 10 | "لديك حكاية، معلومة، أو فكرة؟ نسمعك.": contribute CTA | Full-colour gradient band with a giant outlined "967" and the CMS button label (`#contact` anchor kept) | ✅ |
| 11 | "مساحة تتسع لنا جميعًا." about and "مسارات نعمل على تطويرها." projects, expandable | Two accordion cards (`#about`, `#projects`) with the same managed content, tags, vision, fields, the three projects and their status chips | ✅ both, plus the expanded content |

Nothing was dropped. The original order is kept, except that each block now has a distinct visual treatment.

---

## 3. Design system: light and dark

Source of truth: `app/foundation/tokens.css`. The prefixes are `--c` colour, `--t` type, `--s` space, `--r` radius, `--e` elevation and `--m` motion.

### Colour

| Role | Light | Dark | Contrast on page |
|---|---|---|---|
| Page `--c-bg` | `#f5f3ef` (warm porcelain) | `#0b0f10` | n/a |
| Card `--c-surface` / raised `--c-surface-2` | `#ffffff` / `#faf9f6` | `#131a1c` / `#1a2225` | n/a |
| Glass `--c-glass` | white at 72%, `blur(18px)` | ink at 70% | n/a |
| Text `--c-ink` / `--c-ink-2` / `--c-ink-3` | `#101817` / `#3e4947` / `#5a6462` | `#eef2f0` / `#b7c2bf` / `#8f9b98` | 17.4 / 8.9 / 5.9 (light); 16.9 / 10.3 / 6.6 (dark) |
| Brand accent `--c-accent` | `#0a6f74` (967 teal) | `#4fd1c5` | 6.0 / 10.6 |
| Control borders `--c-control` | `#7a7468` | `#8b9693` | ≥ 3:1 (WCAG 1.4.11) |

**Story colours.** Each content type keeps a hue and a soft tint, used for tile gradients, icon chips and kickers. Every hue has a dark-mode variant.

| Content | Hue |
|---|---|
| media | ember |
| magazine | violet |
| debate | indigo |
| numbers | teal |
| school | amber |
| games | plum and neon |
| places | leaf |

**Two always-dark surfaces**, the games arcade and the data band, give the page rhythm in both modes.

**Status is never colour-only.** Every status shows a word, and its marker shape changes with the tone: a circle for neutral, a filled circle for positive, a diamond for caution and a square for danger.

**Dark mode applies only to redesigned pages** (`:root:has(.ed-page)`). Routes not migrated yet never get a dark shell over a light legacy body.

### Type

The display face is Markazi Text 700, a contemporary newspaper Naskh. It is set very large with tight leading:

| Level | Size range |
|---|---|
| hero | 54 → 136 px |
| display | 42 → 80 |
| h1 | 37 → 64 |
| h2 | 30 → 48 |
| h3 | 22 → 30 |

Reading and interface text use IBM Plex Sans Arabic 400 and 600 (body 17 px at 1.85 line height; UI 15 px; meta 13 px). Big figures use Plex 600 with tabular lining numerals and −0.035em tracking.

There are still exactly **two text weights**. Latin letters and digits inside display headlines are routed to the already-loaded Plex 600 Latin file, so a page needs at most 5 font files: 168.6 KiB, against 256 KiB before.

### Space, shape, depth, motion

- **Space:** a 4 px base (4 to 128). The gutter is `clamp(16px, 4vw, 40px)`, the section rhythm `clamp(48px, 6.5vw, 96px)`, and the bento gap `clamp(12px, 1.6vw, 20px)`.
- **Radii:** 10 / 16 / 24 / 32 px plus pills. Cards use 24–32 px.
- **Elevation:** three layered, ink-tinted shadows (`--e-1…3`) plus an inner glow line. Dark mode uses deeper, untinted shadows.
- **Glass:** the sticky header, mobile tab bar, smart-start panel, search bar, fact chips and the "latest value" card. The blur sits on `::before`, so the fixed menu sheet and tab bar keep the viewport as their containing block.
- **Motion (CSS only):**
  - scroll-driven reveals (`animation-timeline: view()`, content simply visible where unsupported)
  - native cross-document view transitions (`@view-transition`)
  - a slow mesh drift and a "live" pulse dot
  - spring hover lifts, image zoom, arrow nudges and press states
  - All motion collapses under `prefers-reduced-motion`.
- **Data visuals:** `components/numbers/Sparkline.jsx` draws an inline SVG trend (area plus line) from the adopted series, at most 16 points. It renders nothing for a single observation. There is no chart library on home or on the lists.

### CSS architecture (unchanged principle)

- Root loads only `fonts.css` and `foundation/{tokens,base,shell}.css`.
- Home, works and numbers add `foundation/editorial.css` plus their own route sheet.
- Routes not migrated yet import `app/legacy-styles.js` in their layouts.
- `experimental.cssChunking: 'strict'` keeps those files per route.

---

## 4. Shell and pages

- **Header.**
  - Translucent glass bar with a pill-shaped navigation group. The active section is filled ink.
  - Dropdowns pop with a spring and show the section description.
  - The "contribute" CTA is an ink pill.
  - Below 1180 px it becomes a full-height sheet: search first, then the sections as rounded cards.
- **Mobile tab bar** (≤ 760 px):
  - Glass, floating, within thumb reach: الرئيسية · الإعلام · المعرفة · البحث · القائمة.
  - Hidden on immersive screens: game play, lesson stages, the PDF reader and admin.
- **Footer.** Deep night colophon with a teal glow, display-face group headings and pill social links.
- **Works list.**
  - Mesh head, a segmented control for the media sections, and filters in a floating card.
  - Rich media cards: full-bleed picture, scrim, coloured tag, display headline, glass chips, save in the corner.
- **Work detail.**
  - Glass back pill and display title.
  - The player sits in a rounded dark frame with a frosted play button.
  - Summary and fact sheet are separate cards.
- **Numbers list.**
  - Teal mesh head with glass fact tiles.
  - Ledger cards with sparklines.
  - The indicator index is a two-column grid of data cards (figure, sparkline, chips, save).
  - Domains are rounded accordions; methodology has an indigo card.
- **Indicator detail.**
  - Title next to a glass "latest value" card holding the big figure and a sparkline.
  - Then the reading note, chart card (Recharts restyled to the tokens, still lazy), fact sheet, editorial reading, and series table card.
  - Definition fold and source cards.

**Accessibility.** One `<main>` per page. Visible focus rings, including on whole-card links via `:has(:focus-visible)`. Real labels, 44 px targets, reduced motion, status words, `aria-current` everywhere, and a focusable table region.

---

## 5. Performance: before and after

**Baseline.** Still the original main code: a clean `git archive HEAD` built in `/tmp`. Both are production builds on the same machine and the same production database.

**Bytes.** Transferred bytes in a cold Chromium context at 1440×900, HTTP cache on, after `networkidle`, median of 3 loads. Analytics POSTs were blocked.

**TTFB.** Alternating the two builds on :3101 over 4 rounds × 5 samples (n = 20 each), median. Database latency drifts by minutes, so the alternation keeps the comparison fair.

Scripts and raw data are in `iteration-2/perf/`.

| Page | TTFB ms | HTML gzip / decoded KiB | JS KiB | CSS KiB | Fonts KiB | Images KiB | **Total KiB** |
|---|---|---|---|---|---|---|---|
| `/` before | 1,907 | 51.7 / 216.9 | 224.5 | 65.4 | 256.0 | 358.3 | **959.2** |
| `/` after | **819** | **48.8 / 186.1** | **212.7** | **19.5** | **168.6** | **229.4** | **682.2 (−29%)** |
| `/yemen-in-numbers` before | 1,850 | 189.3 / 2,561.2 | 242.4 | 67.6 | 256.0 | 2.6 | **760.9** |
| `/yemen-in-numbers` after | **1,111** | **59.8 / 320.1** | **217.5** | **22.5** | **168.6** | 2.6 | **473.6 (−38%)** |
| indicator `yemen-population` before | 441 | 27.3 / 113.5 | 359.4 | 63.1 | 256.0 | 2.6 | **712.4** |
| indicator `yemen-population` after | **422** | **25.9 / 101.7** | **232.6** | **21.0** | **168.6** | 2.6 | **452.5 (−36%)** |
| indicator `political-stability-score` before | 466 | 32.0 / 158.7 | 359.4 | 63.1 | 256.0 | 2.6 | **715.1** |
| indicator `political-stability-score` after | **416** | 32.7 / **149.3** | **354.0** | **21.0** | **168.6** | 2.6 | **580.8 (−19%)** |
| `/works` before | 295 | 15.9 / 72.8 | 234.7 | 60.7 | 256.0 | 294.9 | **864.1** |
| `/works` after | **262** | **14.4 / 60.6** | **211.2** | **14.9** | **168.6** | **128.6** | **539.3 (−38%)** |
| `/works/work-mv6uhecd` before | 296 | 17.3 / 79.8 | 237.7 | 60.7 | 256.0 | 656.1 | **1,230.5** |
| `/works/work-mv6uhecd` after | **260** | **17.0 / 71.3** | **224.9** | **14.9** | **168.6** | **145.8** | **572.9 (−53%)** |

Every page beats the original on TTFB and on total transfer.

One cell is not lower. The multi-year indicator's HTML gzip is 32.7 vs 32.0 KiB (+0.7 KiB, from the new inline sparkline of its 27-year series), while its decoded HTML is smaller and its page total is 19% lower.

**Why the home page stays fast despite all its content coming back:**
- Six bounded, individually settled loaders (works 4, issues 1, companies 6, professionals 6, indicators 4, plus the debate RPC). The indicator candidates come from a two-column `(indicator_id, year)` projection, ranked exactly like main.
- About 100 decorative arrow SVGs were replaced by a text glyph. Each one would otherwise be serialised twice, in the HTML and in the RSC payload.
- All decoration (mesh, dot grids, outlined "967", gradients, glass) is CSS. There are no decorative images and no animation library.
- Every image has a fixed aspect ratio and lazy loading below the fold, and the text is the LCP element, so there is no layout shift.

**Additional fix in this iteration.** Wikimedia `Special:FilePath/*.svg` images were sent to the optimizer, which refuses SVG (HTTP 400). The company card therefore showed only its placeholder. `canOptimizeImage()` now delivers SVG directly.

---

## 6. Tests

`npm test`: **651 tests, 645 pass, 5 fail, 1 skipped**. The 5 failures are the baseline ones (`migration-layout`, `game-map-projection`, `games-home-profile`, `knowledge-hero-consistency`, `yemen-map-renaming`), each on its original assertion. There are no new failures.

`inline-editor-database` (an in-memory PGlite fixture, untouched by this work) failed once in one full run and in one of four isolated runs. It passed in the other three isolated runs and in the final full run. It looks flaky and unrelated, but I haven't confirmed whether it also flakes on main.

Tests updated in iteration 2. They now pin the restored home sections, replacing the iteration-1 "doors" assertions:

| Test file | Change and reason |
|---|---|
| `home-games-showcase` | Rewritten against `GamesArcade` (`components/front/FrontSections.jsx`): the UTC daily link, the three game links, leaderboard, 9/14/7 stats, "تحدَّ صديقك", no Eastern numerals, visibility hiding, responsive/reduced-motion rules, and all 11 home section anchors present. Back to 6 tests. |
| `home-knowledge` | Knowledge-hub tests now check `KnowledgeBento` (history featured, `data-knowledge-id`, `#explore-knowledge`, visibility via `visibleHomeKnowledge`) and its responsive CSS. |
| `home-smart-start` | Restored the **original** assertion `<HomeSmartStart initialDate={utcDay()} knowledgeHref={knowledgeLinks[0]?.href\|\|'/search'}/>`, placed before the picks and the school section. |
| `mobile-page-density` | School track links and compact school grid, plus a games rail that snaps and shows the swipe hint (the original contract restored). |
| `school-967` | Restored the **original** `{visible('school')&&<section` assertion. |
| `games-standalone-section`, `phase5-navigation` | Shell breakpoint 1099 → 1179 px; the home games block checked by its `id="home-games"` section. |

Iteration-1 test changes (navigation vocabulary in `lib/navigation.js`, legacy sheets in `app/legacy-styles.js`, the parallel-pagination test) still apply, and are described in the history below.

---

## 7. Known gaps

- **Not verified in a browser:** the signed-in smart-start state and editor-only header states (read-only constraint). Their code is unchanged from main.
- **View transitions** apply to full page loads and back/forward (`@view-transition`). Next.js client navigations do not use them yet; React's `<ViewTransition>` is still experimental.
- **Scroll reveals** need `animation-timeline` support (Chromium; Safari partially). Elsewhere content is simply visible.
- **The works list** still filters all published works on the client. That's fine for today's catalogue; move it to server pagination as the catalogue grows.
- **The header CTA** shows the CMS label "كن جزءاً من الحكاية". Editors can shorten it to "ساهم معنا".
- **Routes outside scope** keep their legacy interiors under the new shell (always in light mode) until they migrate.

## 8. Recommended rollout

1. Approve the token system and the shell. Both are already live on every route.
2. Migrate routes onto `editorial.css` in this order:
   - magazine (it reuses the media cards)
   - debates (the indigo story colour, with lifecycle as status chips)
   - history, figures and map (the knowledge bento tiles become their heads)
   - ranking (sparklines and data cards)
   - directories (with server pagination)
   - contribute, auth and account
   - school and games (tokens only, keeping their specialised layouts)
3. As each route leaves `legacy-styles.js`, delete the legacy sheets it no longer needs and remove the matching token-bridge aliases.
4. Turn the parity script into a browser test in `tests/browser/`, so home content can never silently drop again.

---

## Appendix: iteration 1 (history)

Iteration 1 ("Editorial Calm") established everything this iteration builds on:
- the shell-only root CSS with per-route styles
- bounded home loaders and card-sized indicator payloads
- parallel `fetchAllRows`
- the shared image policy
- `SafeImage` and `Resilient` failure isolation
- the single navigation source
- the `/read-later` 500 fix and the removal of nested `<main>` elements

Its screenshots remain in `screenshots/` and its measurements in `perf/`. Its home page reduced content to six section doors, which the client rejected. Iteration 2 restores the content in full.

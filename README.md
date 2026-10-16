# 967 Initiative / مبادرة 967

الموقع الرسمي لمبادرة 967: مبادرة إعلامية ومجتمعية يمنية.

### تطوير تجربة المنصة

يمكن تعديل مقدمة الرئيسية وقسم «عن المبادرة» والترويسة والتذييل وروابط التواصل من لوحة التحرير ← الإعدادات. راجع [دليل إعدادات محتوى الموقع](docs/site-settings.md).

الهوية الجديدة ونظام التنقل والبحث العربي الموحد والمشاركة والأدلة والمرصد موثقة في [تقرير إعادة التصميم](docs/redesign-report.md)، مع نتائج الاختبارات والخطوات اللازمة قبل النشر. البحث العام على `/search`، والمساهمات على `/contribute`. شغّل `npm test` لاختبارات البيانات والبحث، و`node scripts/check-routes.mjs` لفحص HTTP بعد تشغيل الموقع محلياً.

### Features

- Arabic first, RTL, responsive editorial design.
- Three main public pages: Home, Works, Weekly Magazine.
- Magazine archive, individual issue links, built-in PDF.js reader with single/spread pages, search, zoom and download.
- Works library searchable by platform, theme and text.
- Contact form saved to database via server-side API.
- Protected `/admin` for approved editors: email/password sign-in, add works, upload PDFs and cover images, publish/unpublish, see messages and delete entries.
- Supabase Row Level Security, constrained storage uploads, draft/published segregation.
- OpenGraph SEO, robots and sitemap.

## 1. Local setup

Requirements: Node.js 20.9+ and npm. Run:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Browse http://localhost:3000. **Without Supabase configured**, the site works in demonstration mode with an explicitly labeled sample magazine PDF and example media cards; message submission and CMS require credentials. This is intentional, to avoid fabricated published content.

## 2. Activate the database and admin

1. Create a Supabase project at https://supabase.com.
2. Copy its Project URL, publishable/anon key, and service role key into `.env.local` as specified by `.env.example`.
3. Run `supabase/schema.sql` in the Supabase SQL Editor **once**. The SQL enables RLS and creates the public `media` storage bucket.
4. In Supabase Authentication → Users, create one email/password user for your editorial account. To avoid unwanted accounts, disable public signups in Authentication settings if not required.
5. Copy that user's **UUID** and run this in the SQL Editor:

```sql
INSERT INTO public.editors(user_id) VALUES ('USER-UUID-HERE');
```

6. Restart the local server, go to `/admin`, sign in with the same email and password.
7. Add a real magazine issue, upload PDF and cover, and set `نشر العدد فوراً`. Once real issues exist, public archive switches from demo to published issues.
8. Add work entries with actual working external video links and topic/platform information. Once real works exist, demo media cards are replaced.

**Security:** Never put `.env.local` in Git. The service role key can bypass database RLS and must remain server-only. Only named users in `editors` can edit content. The public storage bucket is appropriate for **published, non-confidential** PDF files/images; uploaded draft files are still publicly accessible if their URL is known. Don't upload confidential drafts there.

## 3. Contact form

The contact form writes to the `messages` table server-side; editors can view messages inside `/admin`. In production, create a Cloudflare Turnstile widget for your domain, set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`; Turnstile is used server-side when configured. Without Turnstile the contact endpoint has validation and a honeypot but **not strong bot/rate-limit protection**. For high-volume deployment, also add server-side rate limiting at the hosting edge. Set a suitable privacy/data-retention policy before launch.

## 4. Customize

- Name, initiative text, platform links, optional email: `lib/config.js`.
- Colors, font, responsive styles: `app/globals.css`.
- Main page content: `app/page.jsx`.
- Cover illustration, replace with final branding: `public/images/demo-cover.svg`.
- Demo PDF is deliberately labeled as an example: `public/demo/967-demo.pdf`.
- Domain: `NEXT_PUBLIC_SITE_URL` in hosting environment.

Empty platform links intentionally do not show social links; fill verified platform URLs before launching. Current Instagram link: https://www.instagram.com/yemen967_/.

## 5. GitHub + deployment

Create a new empty repository named `967-initiative` under `AihamAnter` (do not initialize README if you're pushing the entire folder), then run:

```bash
git init
git add .
git commit -m "Initial 967 initiative website"
git branch -M main
git remote add origin https://github.com/AihamAnter/967-initiative.git
git push -u origin main
```

Deploy to Vercel: import this repository, set the production env variables, and add your domain. GitHub is a code host; a separate deployment platform is needed to host a Next.js site with APIs.

## Editorial responsibility

All program descriptions are drafts for the initiative's own review. The media cards and PDF currently labelled **DEMO** are not claims that activities have taken place. Confirm public mission wording, logo, privacy/contact policy and platform accounts before publishing.

## Notes

- Run `npm run build` after installing dependencies. A GitHub Actions workflow also checks builds on push. The provided archive contains source only; dependencies are not bundled.
- The editor dashboard supports creating, editing, publishing/unpublishing and deleting works and issues.
- A PDF with text as selectable text is needed for reliable in-reader keyword search; scanned/image-only PDFs generally won't be searchable.
- Web fonts are loaded from Google Fonts; fallback system fonts are available when offline.

### Work detail / embedded video viewer

Each published work now opens at `/works/[slug]`. The library cards are accessible links, and public embeds for YouTube (including Shorts), Instagram posts/Reels, TikTok, Vimeo, supported Facebook video links, and direct MP4 files are attempted via allowlisted providers. Videos load only when the visitor opts to play, and there is always a link to the source. When a platform blocks embedding or a URL is not recognised, the external source link remains available. No DB migration required.

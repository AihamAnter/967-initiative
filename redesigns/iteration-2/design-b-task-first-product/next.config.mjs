import path from 'node:path';
import {fileURLToPath} from 'node:url';
import htmlBots from 'next/dist/shared/lib/router/utils/html-bots.js';
import {imageRemotePatterns} from './lib/imagePolicy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Shared with render-time checks (lib/imagePolicy.js) so both use one host/path policy.
const remotePatterns = imageRemotePatterns(process.env.NEXT_PUBLIC_SUPABASE_URL);

const nextConfig = {
  distDir: process.env.NEXT_TEAM_PREVIEW === '1' ? '.audit-tools/team-preview' : process.env.NEXT_PHASE4_PREVIEW === '1' ? '.audit-tools/phase4-preview' : process.env.NEXT_PRELAUNCH_DEBATES === '1' ? '.audit-tools/prelaunch-debates' : process.env.NEXT_TASK_PREVIEW === '1' ? '.audit-tools/task-preview' : process.env.NEXT_VALIDATION_BUILD === '1' ? '.next-validation' : '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  // Extend the installed Next.js defaults, since assigning this option replaces
  // them. Search/answer crawlers receive complete metadata in the HTML head.
  htmlLimitedBots: new RegExp(`${htmlBots.HTML_LIMITED_BOT_UA_RE.source}|OAI-SearchBot|PerplexityBot|ChatGPT-User|Perplexity-User`, 'i'),
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    '/yemen-ranking': ['./data/rankings/*.json'],
    '/api/rankings': ['./data/rankings/*.json'],
    '/api/admin/rankings': ['./data/rankings/*.json'],
  },
  images: {remotePatterns},
  async redirects() {
    return [{source:'/favicon.ico',destination:'/images/967%20logo%20no%20background.png',permanent:true}];
  },
  async headers() {
    return [{source: '/:path*', headers: [
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      {key: 'X-Frame-Options', value: 'DENY'},
      {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
      {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'},
      {key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'"},
      ...(process.env.NODE_ENV === 'production' ? [{key: 'Strict-Transport-Security', value: 'max-age=31536000'}] : []),
      ...(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' ? [{key: 'X-Robots-Tag', value: 'noindex, nofollow'}] : []),
    ]}, ...['/admin/:path*', '/api/:path*', '/demo/:path*','/account/:path*','/login','/register','/forgot-password','/update-password','/auth/:path*'].map(source => ({source, headers: [
      {key: 'X-Robots-Tag', value: 'noindex, nofollow'},
    ]}))];
  },
};
export default nextConfig;

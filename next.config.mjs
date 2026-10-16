import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const remotePatterns = [];
remotePatterns.push(
  {protocol:'https',hostname:'i.ytimg.com',pathname:'/vi/**'},
  {protocol: 'https', hostname: 'commons.wikimedia.org', pathname: '/wiki/Special:FilePath/**'},
  {protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/wikipedia/commons/**'},
);
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  remotePatterns.push({
    protocol: supabaseUrl.protocol.replace(':', ''),
    hostname: supabaseUrl.hostname,
    pathname: '/storage/v1/object/public/**',
  });
}

const nextConfig = {
  distDir: process.env.NEXT_VALIDATION_BUILD === '1' ? '.next-validation' : '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  images: {remotePatterns},
};
export default nextConfig;

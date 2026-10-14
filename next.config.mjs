import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const remotePatterns = [];
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  remotePatterns.push({
    protocol: supabaseUrl.protocol.replace(':', ''),
    hostname: supabaseUrl.hostname,
    pathname: '/storage/v1/object/public/**',
  });
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  images: {remotePatterns},
};
export default nextConfig;

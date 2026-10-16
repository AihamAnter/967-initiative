import {robotsPolicy} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default function robots() {
  return robotsPolicy();
}

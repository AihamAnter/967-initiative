import PublicPageBoundary from '@/components/design/PublicPageBoundary';
import '@/app/foundation/editorial.css';
import './numbers.css';

// The list and indicator pages are redesigned (Editorial Calm). The domain and
// timeline pages keep the legacy styles through their own layouts.
export default function StatisticsLayout({children}) { return <PublicPageBoundary section="statistics">{children}</PublicPageBoundary>; }

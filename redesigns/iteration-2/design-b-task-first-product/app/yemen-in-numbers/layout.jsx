import PublicPageBoundary from '@/components/design/PublicPageBoundary';

// Design B: the list and indicator detail own their styles. Domain and timeline
// pages add the legacy stack in their own layouts until they are migrated.
export default function StatisticsLayout({children}) { return <PublicPageBoundary section="statistics">{children}</PublicPageBoundary>; }

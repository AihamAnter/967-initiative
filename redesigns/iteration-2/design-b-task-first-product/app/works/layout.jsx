import PublicPageBoundary from '@/components/design/PublicPageBoundary';

// Design B: media routes own their styles (CSS Modules); no legacy interior layer.
export default function WorksLayout({children}) { return <PublicPageBoundary section="works">{children}</PublicPageBoundary>; }

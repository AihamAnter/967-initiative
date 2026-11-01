import PublicPageBoundary from '@/components/design/PublicPageBoundary';
import '@/app/foundation/editorial.css';
import './media.css';

// Redesigned (Editorial Calm): no legacy stylesheet bundle on this route.
export default function WorksLayout({children}) { return <PublicPageBoundary section="works">{children}</PublicPageBoundary>; }

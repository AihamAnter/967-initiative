import '@/components/legacy/LegacyStyles';
import '@/app/interior-design.css';

// Domain pages are not yet migrated to Design B; keep their legacy styles.
export default function StatDomainLayout({children}){return <div className="interior-page" data-area="statistics">{children}</div>;}

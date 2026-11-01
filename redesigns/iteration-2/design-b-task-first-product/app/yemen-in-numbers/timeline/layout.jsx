import '@/components/legacy/LegacyStyles';
import '@/app/interior-design.css';

// The timeline comparison is not yet migrated to Design B; keep its legacy styles.
export default function TimelineLayout({children}){return <div className="interior-page" data-area="statistics">{children}</div>;}

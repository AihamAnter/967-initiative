import PublicPageBoundary from './PublicPageBoundary';
import '@/app/interior-design.css';
const sections={media:'works',magazine:'magazine',debates:'debates',statistics:'statistics',ranking:'ranking',atlas:'atlas',products:'products',professionals:'professionals'};
export default function InteriorLayout({area, children}) {
  return <PublicPageBoundary section={sections[area]}><div className="interior-page" data-area={area}>{children}</div></PublicPageBoundary>;
}

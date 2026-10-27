import PageIntro from '@/components/PageIntro';
import '@/app/interior-design.css';

// Reuse the blue knowledge-page visual system from the statistics/rankings pages.
// Scope the interior theme to the hero, not the atlas or other page content.
export default function KnowledgePageIntro({title,category,description,children}){
 return <div className="interior-page" data-area="statistics" data-knowledge-intro>
  <PageIntro tone="blue" title={title} category={category} description={description}>{children}</PageIntro>
 </div>;
}

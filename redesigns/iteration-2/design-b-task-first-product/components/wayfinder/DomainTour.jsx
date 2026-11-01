'use client';
import {useEffect} from 'react';
import ExplorationProgress, {useExplorationTrail} from '@/components/ExplorationProgress';

// The "explore three domains" tour, now fed by the server-side domain filter:
// visiting a filtered result page (with matches) counts the domain as explored.
export default function DomainTour({domains, selected, hasResults}) {
  const [explored, explore, restart, saved] = useExplorationTrail('967-data-tour-v1', domains);
  const goal = Math.min(3, domains.length);
  useEffect(() => {
    const domain = domains.find(item => item.id === selected);
    if (domain && hasResults) explore(domain.id, domain.name);
  }, [domains, selected, hasResults, explore]);
  if (goal < 2) return null;
  return <ExplorationProgress items={explored} goal={goal} tone="blue" title="صورة أوسع، مجالاً بعد مجال." description="اختر مجالاً من قائمة التصفية، وتعرّف على مؤشرات من جوانب مختلفة للحياة في اليمن." completeLabel="أكملت جولتك بين مجالات البيانات!" onRestart={restart} persistent={saved}/>;
}

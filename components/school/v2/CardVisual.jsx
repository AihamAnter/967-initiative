// العنصر المرئي للبطاقة. المرحلة 1: إطار موحد بأيقونة النوع ووصفه النصي؛ تحل محله مكتبة العناصر في المرحلة 3.
import {BarChart3, Map, Clock3, Layers, Image as ImageIcon, SplitSquareHorizontal, Store, Sigma, Music, Type, LineChart} from 'lucide-react';
import styles from './CardLessonPlayer.module.css';

const icons = {chart: LineChart, stat: BarChart3, map: Map, timeline: Clock3, layers: Layers, image: ImageIcon, compare: SplitSquareHorizontal, scene: Store, formula: Sigma, verse: Music, glyphs: Type};

export default function CardVisual({visual}) {
  if (!visual) return null;
  const Icon = icons[visual.kind] || ImageIcon;
  return <figure className={styles.visual} data-kind={visual.kind}>
    <Icon size={40} strokeWidth={1.6} aria-hidden="true"/>
    <figcaption>{visual.alt}</figcaption>
  </figure>;
}

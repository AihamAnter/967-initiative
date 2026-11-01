import Link from 'next/link';
import {BookOpen, Compass, Gamepad2, GraduationCap, HandHeart, MapPinned} from 'lucide-react';
import {navTasks} from '@/lib/navigation';
import styles from './TaskLauncher.module.css';

const icons = {read: BookOpen, explore: Compass, learn: GraduationCap, play: Gamepad2, find: MapPinned, join: HandHeart};

// The home's signature: six verbs, one tap each, each in its own colour world.
// It sits right under the hero search as a "dock" (a snap rail on phones).
export default function TaskLauncher({isVisible, contentLinks = []}) {
  const tasks = navTasks({isVisible, contentLinks});
  if (!tasks.length) return null;
  return <nav className={styles.launcher} aria-labelledby="tasks-title">
    <h2 id="tasks-title" className={styles.heading}>ماذا تريد أن تفعل؟</h2>
    <ul className={styles.grid}>
      {tasks.map((task, index) => {
        const Icon = icons[task.id];
        return <li key={task.id} className={styles.tile} data-tone={task.tone}>
          <Link href={task.href} className={styles.link} title={task.hint}>
            <span className={styles.icon} aria-hidden="true"><Icon size={22} strokeWidth={1.8}/></span>
            <span className={styles.index} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className={styles.verb}>{task.verb}</span>
            <span className={styles.section}>{task.section}</span>
          </Link>
        </li>;
      })}
    </ul>
  </nav>;
}

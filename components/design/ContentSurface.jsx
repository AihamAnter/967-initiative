import {BookOpen, ChartNoAxesCombined, Film, MessagesSquare, Package, UserRound} from 'lucide-react';

const contentKinds = {
  video: {label: 'عمل إعلامي', icon: Film},
  issue: {label: 'مجلة 967', icon: BookOpen},
  debate: {label: 'مناظرة', icon: MessagesSquare},
  indicator: {label: 'اليمن بالأرقام', icon: ChartNoAxesCombined},
  profile: {label: 'ملف مهني', icon: UserRound},
  product: {label: 'منتجات يمنية', icon: Package},
};

// Presentation only: routing, editorial data and interactive controls stay
// with the existing content components. Safe in server and client components.
export default function ContentSurface({kind, className = '', children, ...props}) {
  const resolvedKind = Object.hasOwn(contentKinds, kind) ? kind : 'video';
  return <article {...props} className={`content-surface ${className}`.trim()} data-content-kind={resolvedKind}>{children}</article>;
}

export function ContentBadge({kind, children, className = ''}) {
  const resolvedKind = Object.hasOwn(contentKinds, kind) ? kind : 'video';
  const {label, icon: Icon} = contentKinds[resolvedKind];
  return <span className={`content-badge ${className}`.trim()} data-content-kind={resolvedKind}><Icon size={16} aria-hidden="true"/>{children || label}</span>;
}

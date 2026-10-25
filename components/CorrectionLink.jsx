import Link from '@/components/SiteLink';
import {PenLine} from 'lucide-react';
import {buildCorrectionHref} from '@/lib/contributions';

export default function CorrectionLink({title,path,id,className='text-link',children='اقترح تصحيحاً لهذه الصفحة'}) {
  return <Link href={buildCorrectionHref({title,path,id})} className={className}><PenLine size={16} aria-hidden="true"/>{children}</Link>;
}

import {notFound} from 'next/navigation';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';

export default async function PublicPageBoundary({section,children}){
 const settings=await getSiteSettings();
 if(!sectionIsVisible(section,settings.pageVisibility))notFound();
 return children;
}

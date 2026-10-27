import {permanentRedirect} from 'next/navigation';
import {safeNavigationSource} from '@/lib/navigationContext';

// Retain old biography permalinks and bookmarked profile links.
export default async function LegacyFigurePage({params,searchParams}){
 const {slug}=await params;
 const query=await searchParams;
 const from=safeNavigationSource(query?.from);
 permanentRedirect('/yemeni-figures/'+encodeURIComponent(slug)+(from?'?from='+encodeURIComponent(from):''));
}

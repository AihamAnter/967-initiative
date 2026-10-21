import DebateSuggestion from '@/components/debates/DebateSuggestion';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata({title:'اقترح مناظرة',path:'/debates/suggest',noindex:true});
export default function Page(){return <DebateSuggestion/>;}

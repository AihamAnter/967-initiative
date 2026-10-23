import DebateExplorer from '@/components/debates/DebateExplorer';
import {getDebateCatalog} from '@/lib/debateServer';
import {pageMetadata} from '@/lib/seo';
import {DEBATE_DESCRIPTION} from '@/lib/debates';
export const metadata=pageMetadata({title:'مناظرات 967 — نختلف لنفهم',description:DEBATE_DESCRIPTION,path:'/debates',image:'/images/debates-logo.png'});
export default async function Page({searchParams}){const {debates,available}=await getDebateCatalog();return <DebateExplorer debates={debates} available={available} initial={await searchParams}/>;}

import {notFound} from 'next/navigation';
import ManagedContentPage,{contentPageMetadata} from '@/components/ManagedContentPage';
import {builtInPages} from '@/lib/contentPages';

async function pageSlug(params){const {slug}=await params;if(Object.hasOwn(builtInPages,slug))notFound();return slug;}
export async function generateMetadata({params}){return contentPageMetadata(await pageSlug(params));}
export default async function Page({params,searchParams}){return <ManagedContentPage slug={await pageSlug(params)} searchParams={searchParams}/>;}

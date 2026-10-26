import {notFound} from 'next/navigation';
import InstitutionDetail from '@/components/InstitutionDetail';
import {getUniversities,getUniversity} from '@/lib/data';
import {relatedInstitutions} from '@/lib/institutionDirectories';
import {detailPath,pageMetadata} from '@/lib/seo';
import {breadcrumbSchema,institutionSchema,JsonLd} from '@/lib/seo-schema';

export const dynamic='force-dynamic';
export async function generateMetadata({params}){const {slug}=await params,item=await getUniversity(slug);if(!item)notFound();return pageMetadata({title:`${item.name} | دليل الجامعات والمعاهد`,description:item.summary,path:detailPath('universities',item.id),image:item.logoUrl});}
export default async function UniversityPage({params}){const {slug}=await params,item=await getUniversity(slug);if(!item)notFound();const all=await getUniversities();return <><JsonLd data={breadcrumbSchema([{name:'دليل الجامعات والمعاهد',path:'/universities'},{name:item.name,path:detailPath('universities',item.id)}])}/><JsonLd data={institutionSchema(item,'university')}/><InstitutionDetail kind="university" item={item} related={relatedInstitutions(item,all,'university')}/></>;}

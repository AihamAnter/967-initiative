import {getSiteSettings,getYemeniFigures} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {toFigureDirectoryCard} from '@/lib/yemeniFigures';
export const dynamic='force-dynamic';
export async function GET(){
 const headers={'Cache-Control':'no-store'};
 if(!sectionIsVisible('figures',(await getSiteSettings()).pageVisibility))return Response.json({error:'القسم غير متاح حاليًا.'},{status:404,headers});
 try{return Response.json({figures:(await getYemeniFigures()).map(toFigureDirectoryCard)},{headers});}
 catch{return Response.json({error:'تعذر تحميل دليل الشخصيات. حاول مجددًا.'},{status:503,headers});}
}

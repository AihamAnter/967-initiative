import {publicDb} from '@/lib/supabase';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {readPublicMapProfiles} from '@/lib/mapProfileRepository';
export const dynamic='force-dynamic';
export async function GET(){
 const headers={'Cache-Control':'no-store'};
 if(!sectionIsVisible('atlas',(await getSiteSettings()).pageVisibility))return Response.json({error:'القسم غير متاح حاليًا.'},{status:404,headers});
 try{return Response.json({profiles:await readPublicMapProfiles(publicDb())},{headers});}
 catch{return Response.json({error:'تعذر تحميل معلومات الأماكن الموسعة. حاول مجددًا.'},{status:503,headers});}
}

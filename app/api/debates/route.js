import {handleDebateRequest} from '@/lib/debateApi';
import {taskRequestDb} from '@/lib/taskServer';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request){
 if(!sectionIsVisible('debates',(await getSiteSettings()).pageVisibility))return Response.json({error:'القسم غير متاح حاليًا.'},{status:404,headers:{'Cache-Control':'no-store'}});
 return handleDebateRequest(request,taskRequestDb);
}
export const GET=handle;
export const POST=handle;

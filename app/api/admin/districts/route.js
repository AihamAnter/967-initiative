import {serverDb} from '@/lib/supabase-server';
import {authorizeEditorRequest} from '@/lib/adminAuthorization';
import {readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
import {readDistrictEditor,saveDistrictEditor} from '@/lib/mapProfileRepository';
export const dynamic='force-dynamic';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function handle(request,save=false){
 try{
  const db=serverDb();const actor=await authorizeEditorRequest(request,db);
  const id=new URL(request.url).searchParams.get('id');if(!/^YE\d{4}$/.test(id||''))throw new RequestValidationError('اختر مديرية صحيحة.');
  if(!save)return json(await readDistrictEditor(db,id));
  const body=await readJsonObject(request,65000);if(!Object.hasOwn(body,'revision'))throw new RequestValidationError('نسخة ملف المديرية مطلوبة.');
  return json({ok:true,...await saveDistrictEditor(db,id,body.profile,body.revision,actor.user.id)});
 }catch(error){return json({error:error instanceof RequestValidationError?error.message:'تعذر تنفيذ العملية. أعد تحميل المحفوظ.'},error instanceof RequestValidationError?error.status:503);}
}
export const GET=request=>handle(request);
export const PUT=request=>handle(request,true);

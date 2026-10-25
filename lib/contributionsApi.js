import {authorizeEditorRequest} from './adminAuthorization.js';
import {contributionFilters} from './editorialContributions.js';
import {RequestValidationError} from './requestSecurity.js';
export async function handleContributionsRequest(request,createDb){
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'}});
 try{
  const db=createDb(request);await authorizeEditorRequest(request,db);
  let filters;try{filters=contributionFilters(new URL(request.url).searchParams);}catch(error){throw new RequestValidationError(error.message);}
  const {data,error}=await db.rpc('editorial_report',{p_filters:filters});
  if(error?.code==='42501')throw new RequestValidationError('لا تملك صلاحية مشاهدة سجل الفريق.',403);
  if(error)throw new RequestValidationError(['42883','PGRST202','42P01'].includes(error.code)?'سجل المساهمات غير مفعّل في قاعدة البيانات بعد. يلزم تطبيق الترحيلات المعتمدة.':'تعذر تحميل سجل المساهمات. حاول مجددًا.',503);
  return json(data);
 }catch(error){return json({error:error instanceof RequestValidationError?error.message:'تعذر تحميل المساهمات.'},error instanceof RequestValidationError?error.status:503);}
}

// The full editor and inline forms deliberately use the same authenticated mutation.
export async function inlineContentRequest(db,path,options={}){
  const {data,error}=await db.auth.getSession();
  if(error||!data?.session?.access_token)throw Error('انتهت جلسة التحرير. سجّل الدخول مجدداً.');
  const response=await fetch(path,{method:options.method||'GET',cache:'no-store',signal:options.signal||AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+data.session.access_token,...(options.body?{'Content-Type':'application/json'}:{})},...(options.body?{body:JSON.stringify(options.body)}:{})});
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result){const failure=Error(result?.error||'تعذر تأكيد العملية. أعد تحميل المحفوظ قبل المحاولة.');failure.status=response.status;throw failure;}
  return result;
}
export function contentPatch(original,draft){return Object.fromEntries(Object.entries(draft).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(original?.[key])));}
export async function saveInlineContent(db,kind,id,revision,data){
  if(!Object.keys(data).length)return {ok:true};
  return inlineContentRequest(db,'/api/admin/inline',{method:'POST',body:{action:'content_save',kind,id,revision,data}});
}

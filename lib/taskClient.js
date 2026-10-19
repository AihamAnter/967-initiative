export async function taskApi(db,{method='GET',params='',body,signal}={}){
 const {data,error}=await db.auth.getSession();
 if(error||!data.session)throw new Error('انتهت الجلسة. سجّل الدخول من لوحة الإدارة.');
 const response=await fetch('/api/admin/tasks'+(params?'?'+params:''),{method,cache:'no-store',signal,headers:{Authorization:'Bearer '+data.session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const result=await response.json();
 if(!response.ok){const failure=new Error(result.error||'تعذر تنفيذ العملية.');failure.status=response.status;throw failure;}
 return result;
}

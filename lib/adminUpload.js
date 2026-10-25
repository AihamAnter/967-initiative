// Storage permissions remain enforced by the signed-in user's JWT.
export async function uploadAdminMedia(db,file,path,contentType) {
  if(!['image/png','image/jpeg','image/webp','application/pdf'].includes(contentType))throw Error('نوع الملف غير مدعوم. اختر صورة PNG أو JPEG أو WebP أو ملف PDF معتمداً.');
  const {data,error}=await db.auth.getSession();if(error||!data.session)throw Error('انتهت جلسة التحرير.');
  const publicUrl=db.storage.from('media').getPublicUrl(path).data.publicUrl;
  const url=new URL(publicUrl);url.pathname=url.pathname.replace('/object/public/','/object/');
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest(),report=(percent,error=false)=>window.dispatchEvent(new CustomEvent('967:admin-upload',{detail:{name:file.name,percent,error}}));
    xhr.open('POST',url.href);xhr.timeout=180000;xhr.setRequestHeader('Authorization','Bearer '+data.session.access_token);xhr.setRequestHeader('apikey',process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);xhr.setRequestHeader('Content-Type',contentType);xhr.setRequestHeader('x-upsert','false');
    xhr.upload.onprogress=event=>{if(event.lengthComputable)report(Math.min(99,Math.round(event.loaded/event.total*100)));};
    const failed=()=>{report(0,true);reject(Error('تعذر رفع الملف. لم تُحفظ تغييرات المحتوى؛ تحقق من الاتصال وأعد المحاولة.'));};
    xhr.onerror=failed;xhr.ontimeout=failed;xhr.onabort=failed;xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300){report(100);resolve(publicUrl);}else failed();};report(0);xhr.send(file);
  });
}

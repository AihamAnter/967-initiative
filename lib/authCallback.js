// getSession waits for the browser client's URL detection. Only exchange a
// remaining code: Supabase may already have consumed it during initialization.
export async function completeAuthSession(auth,href,currentHref=()=>href){
 const initial=new URL(href),fragment=new URLSearchParams(initial.hash.slice(1));
 if(initial.searchParams.has('error')||fragment.has('error'))throw new Error('رابط الحساب غير صالح أو منتهي. اطلب رابطًا جديدًا.');
 let result=await auth.getSession();
 if(result.error)throw result.error;
 const code=initial.searchParams.get('code');
 if(code&&new URL(currentHref()).searchParams.get('code')===code){
  result=await auth.exchangeCodeForSession(code);
  if(result.error)throw result.error;
 }
 const session=result.data?.session;
 if(!session?.user||!session.access_token)throw new Error('افتح رابط التأكيد أو استعادة كلمة المرور المرسل إلى بريدك أولًا.');
 return session;
}

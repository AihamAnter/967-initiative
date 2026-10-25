// A loading hint only. Session identity and editorial roles are still verified
// by Supabase and the server before any protected data or controls are shown.
export function authStorageKey(url){try{return 'sb-'+new URL(url).hostname.split('.')[0]+'-auth-token';}catch{return null;}}
export function browserSessionMayExist(url,storage,href=''){
 const key=authStorageKey(url);if(!key)return false;
 try{const location=new URL(href||'https://local.invalid');if(location.searchParams.has('code')||new URLSearchParams(location.hash.slice(1)).has('access_token'))return true;return Boolean(storage.getItem(key));}catch{return true;}
}

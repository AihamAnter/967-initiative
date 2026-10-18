export function readListState(search, defaults) {
  const params = new URLSearchParams(search);
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const value = params.get(key);
    if (typeof fallback === 'number') {
      const number = Number(value);
      return [key, Number.isSafeInteger(number) && number > 0 ? number : fallback];
    }
    return [key, value === null ? fallback : value.slice(0, 150)];
  }));
}

export function listStateSearch(search, state, defaults) {
  const params = new URLSearchParams(search);
  Object.entries(defaults).forEach(([key, fallback]) => {
    if (state[key] === fallback || state[key] === '') params.delete(key);
    else params.set(key, String(state[key]));
  });
  const query = params.toString();
  return query ? '?' + query : '';
}
export const collectionDefaults={
  works:{q:'',topic:'الكل',platform:'الكل',page:1},
  professionals:{q:'',page:1,category:'الكل',location:'كل المحافظات',mode:'كل طرق الخدمة'},
  products:{q:'',page:1,category:'الكل',location:'كل المحافظات'},
};


export function listReturnPath(value,pathname,defaults,hash=''){
  const fallback=pathname+hash;
  if(typeof value!=='string'||value.length>2000)return fallback;
  try{
    const url=new URL(value,'https://local.invalid');
    if(url.origin!=='https://local.invalid'||url.pathname!==pathname)return fallback;
    return pathname+listStateSearch('',readListState(url.search,defaults),defaults)+hash;
  }catch{return fallback;}
}

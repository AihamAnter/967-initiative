// Independent sources have independent deadlines. No cross-request stale cache.
export async function collectPublicSources(loaders,{timeoutMs=6500,onUnavailable=()=>{}}={}){
 const data={},unavailable=[];
 await Promise.all(Object.entries(loaders).map(async([name,load])=>{
  let timer;
  try{
   data[name]=await Promise.race([Promise.resolve().then(()=>load()),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Source deadline')),timeoutMs);})]);
  }catch{unavailable.push(name);onUnavailable(name);}
  finally{clearTimeout(timer);}
 }));
 return {data,unavailable};
}

// Optional columns differ between older installations. Cache only that schema
// hint briefly; content and publication decisions are never cached here.
export function createProjectionReader(clock=Date.now){
 const absent=new Map();
 const optional={yemeni_companies:['is_demo'],professionals:['is_demo'],yemeni_figures:['timeline']};
 return async function readProjection(table,projection,read){
  if(projection==='*')return read(projection);
  const hint=absent.get(table),fields=projection.split(',');
  const activeHint=hint&&clock()-hint.at<60000;
  const selected=activeHint?fields.filter(field=>field!==hint.field).join(','):projection;
  try{return await read(selected);}catch(error){
   const missing=(optional[table]||[]).find(field=>fields.includes(field)&&new RegExp('\\b'+field+'\\b').test(error.message||''));
   if(selected===projection&&missing&&error.code==='42703'){
    absent.set(table,{at:clock(),field:missing});return read(fields.filter(field=>field!==missing).join(','));
   }
   throw error;
  }
 };
}

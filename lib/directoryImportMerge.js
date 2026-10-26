const empty=value=>value===null||value===undefined||value===''||(Array.isArray(value)&&value.length===0);
const comparable=value=>JSON.stringify(value??null);

export const directoryRelationKeys={
 programs:row=>[row.name,row.qualification,row.study_mode].map(value=>String(value||'').trim().toLowerCase()).join('|'),
 specialties:row=>String(row.name||'').trim().toLowerCase(),
 services:row=>String(row.name||'').trim().toLowerCase(),
 hours:row=>String(row.label||'').trim().toLowerCase(),
 branches:row=>[row.name,row.city].map(value=>String(value||'').trim().toLowerCase()).join('|'),
 sources:row=>String(row.url||row.document_url||'').trim().toLowerCase(),
};

function mergeArray(current,incoming){
 const seen=new Set();
 return [...(current||[]),...(incoming||[])].filter(value=>{const key=typeof value==='object'?value.url||JSON.stringify(value):String(value);if(seen.has(key))return false;seen.add(key);return true;});
}

export function mergeDirectoryRecord(current,incoming,{overwrite=false,preservePublication=true}={}){
 const merged={...current},added=[],replaced=[],conflicts=[];
 for(const [field,value] of Object.entries(incoming)){
  if(['id','revision','created_at','updated_at','deleted_at'].includes(field)||value===undefined)continue;
  if(field==='is_published'&&preservePublication&&current.id){merged[field]=current[field];continue;}
  const before=current[field];
  if(Array.isArray(value)){
   const next=overwrite?value:mergeArray(before,value);
   if(comparable(next)!==comparable(before)){merged[field]=next;(empty(before)?added:replaced).push(field);}
  }else if(empty(before)&&!empty(value)){merged[field]=value;added.push(field);}
  else if(!empty(value)&&comparable(before)!==comparable(value)){
   if(overwrite){merged[field]=value;replaced.push(field);}
   else conflicts.push({field,current:before,incoming:value,resolution:'kept_current'});
  }
 }
 return {record:merged,added,replaced,conflicts};
}

export function mergeDirectoryRelations(current,incoming,relation,{overwrite=false}={}){
 const identity=directoryRelationKeys[relation];
 if(!identity)throw Error(`Unknown directory relation: ${relation}`);
 const rows=(current||[]).map(row=>({...row})),positions=new Map(rows.map((row,index)=>[identity(row),index]));
 let added=0,updated=0;const conflicts=[];
 for(const candidate of incoming||[]){
  const key=identity(candidate);
  if(!key)continue;
  if(!positions.has(key)){positions.set(key,rows.length);rows.push({...candidate});added++;continue;}
  const index=positions.get(key),result=mergeDirectoryRecord(rows[index],candidate,{overwrite,preservePublication:false});
  rows[index]=result.record;
  if(result.added.length||result.replaced.length)updated++;
  conflicts.push(...result.conflicts.map(item=>({...item,relation,key})));
 }
 return {rows,added,updated,conflicts};
}

export function directoryBundleDiff(current,incoming,relations,{overwrite=false}={}){
 const relationSet=new Set(relations),currentRecord=Object.fromEntries(Object.entries(current).filter(([field])=>!relationSet.has(field))),incomingRecord=Object.fromEntries(Object.entries(incoming).filter(([field])=>!relationSet.has(field)));
 const base=mergeDirectoryRecord(currentRecord,incomingRecord,{overwrite,preservePublication:true});
 const mergedRelations={},relationChanges={};
 const conflicts=[...base.conflicts];
 for(const relation of relations){
  const result=mergeDirectoryRelations(current[relation],incoming[relation],relation,{overwrite});
  mergedRelations[relation]=result.rows;
  relationChanges[relation]={added:result.added,updated:result.updated};
  conflicts.push(...result.conflicts);
 }
 return {
  record:base.record,relations:mergedRelations,
  changes:{fieldsAdded:base.added,fieldsReplaced:base.replaced,relations:relationChanges},
  conflicts,
  changed:base.added.length>0||base.replaced.length>0||Object.values(relationChanges).some(row=>row.added||row.updated),
 };
}

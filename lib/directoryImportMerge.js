const empty=value=>value===null||value===undefined||value===''||(Array.isArray(value)&&value.length===0);
const comparable=value=>JSON.stringify(value??null);
const text=value=>String(value??'').trim();
const DATE_METADATA=/^(Source document|Published|Accessed|Status as of|Information verified|Verified|Supports|Conflict):\s*(.*)$/i;

function sourceUrlKey(value){
 const raw=text(value);
 if(!raw)return '';
 try{
  const url=new URL(raw);url.hash='';url.protocol=url.protocol.toLowerCase();url.hostname=url.hostname.toLowerCase();
  for(const key of [...url.searchParams.keys()])if(/^utm_/i.test(key))url.searchParams.delete(key);
  return url.href.replace(/\/$/,'').toLowerCase();
 }catch{return raw.replace(/\/$/,'').toLowerCase();}
}

function legacySourceMetadata(note){
 const output={note:'',document_url:'',source_published_at:'',accessed_at:'',status_as_of:'',information_verified_at:'',supports:[],conflict_note:''};
 const notes=[];
 for(const part of text(note).split(/\s+[—–]\s+(?=(?:Source document|Published|Accessed|Status as of|Information verified|Verified|Supports|Conflict):)/i)){
  const match=part.match(DATE_METADATA);
  if(!match){if(part)notes.push(part);continue;}
  const label=match[1].toLowerCase(),value=text(match[2]);
  if(label==='source document')output.document_url=value;
  else if(label==='published')output.source_published_at=value;
  else if(label==='accessed')output.accessed_at=value;
  else if(label==='status as of')output.status_as_of=value;
  else if(label==='verified'||label==='information verified')output.information_verified_at=value;
  else if(label==='supports')output.supports=value.split(',').map(text).filter(Boolean);
  else if(label==='conflict')output.conflict_note=value;
 }
 output.note=notes.join(' — ');return output;
}

export function normalizeDirectorySource(source={}){
 const legacy=legacySourceMetadata(source.note),accessed=text(source.accessed_at||source.checked_at||legacy.accessed_at);
 const checked=/^\d{4}-\d{2}-\d{2}$/.test(text(source.checked_at))?text(source.checked_at):/^\d{4}-\d{2}-\d{2}$/.test(accessed)?accessed:null;
 return {
  title:text(source.title),url:text(source.url||source.document_url),publisher:text(source.publisher),source_type:text(source.source_type)||'official_directory',
  checked_at:checked,document_url:text(source.document_url||legacy.document_url)||null,source_published_at:text(source.source_published_at||legacy.source_published_at)||null,
  accessed_at:accessed||null,status_as_of:text(source.status_as_of||legacy.status_as_of)||null,information_verified_at:text(source.information_verified_at||source.verified_at||legacy.information_verified_at)||null,
  supports:[...new Set([...(Array.isArray(source.supports)?source.supports:[]),...legacy.supports].map(text).filter(Boolean))],conflict_note:text(source.conflict_note||legacy.conflict_note)||null,note:text(legacy.note),
 };
}

export const directoryRelationKeys={
 programs:row=>[row.name,row.qualification,row.study_mode].map(value=>String(value||'').trim().toLowerCase()).join('|'),
 specialties:row=>String(row.name||'').trim().toLowerCase(),
 services:row=>String(row.name||'').trim().toLowerCase(),
 hours:row=>String(row.label||'').trim().toLowerCase(),
 branches:row=>[row.name,row.city].map(value=>String(value||'').trim().toLowerCase()).join('|'),
 sources:row=>sourceUrlKey(row.url||row.document_url),
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
  if(['stable_key','slug'].includes(field)&&current.id&&comparable(current[field])!==comparable(value)){
   conflicts.push({field,current:current[field],incoming:value,resolution:'kept_stable_identity'});continue;
  }
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
 const normalize=relation==='sources'?normalizeDirectorySource:row=>({...row});
 const rows=(current||[]).map(normalize),positions=new Map(rows.map((row,index)=>[identity(row),index]));
 let added=0,updated=0;const conflicts=[];
 for(const rawCandidate of incoming||[]){
  const candidate=normalize(rawCandidate);
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

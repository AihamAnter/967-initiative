import {authorizeEditorRequest} from '@/lib/adminAuthorization';
import {taskRequestDb} from '@/lib/taskServer';
import {readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
import {validateEditorDraft} from '@/lib/editorDrafts';
export const dynamic='force-dynamic';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
export async function GET(request) {
  try{const db=taskRequestDb(request),actor=await authorizeEditorRequest(request,db),params=new URL(request.url).searchParams;
    const key=params.get('key');if(!key||!/^[-a-zA-Z0-9_:]{1,160}$/.test(key))throw new RequestValidationError('معرّف المسودة غير صالح.');
    const {data,error}=await db.from('editor_drafts').select('kind,draft_key,value,updated_at,revision').eq('owner_id',actor.user.id).eq('draft_key',key).maybeSingle();if(error)throw error;return json({draft:data});
  }catch(error){return failure(error);}
}
export async function POST(request) {
  try{const db=taskRequestDb(request);await authorizeEditorRequest(request,db);const input=await readJsonObject(request,240000),draft=validateEditorDraft(input);
    const {data,error}=await db.rpc('editor_save_draft',{p_kind:draft.kind,p_key:draft.key,p_value:draft.value,p_revision:input.revision??null});if(error)throw error;return json({draft:data});
  }catch(error){return failure(error);}
}
export async function DELETE(request) {
  try{const db=taskRequestDb(request);await authorizeEditorRequest(request,db);const input=await readJsonObject(request,1000);
    if(typeof input.key!=='string'||!/^[-a-zA-Z0-9_:]{1,160}$/.test(input.key)||!Number.isSafeInteger(input.revision)||input.revision<1)throw new RequestValidationError('معرّف المسودة أو نسختها غير صالح.');
    const {error}=await db.rpc('editor_delete_draft',{p_key:input.key,p_revision:input.revision});if(error)throw error;return json({ok:true});
  }catch(error){return failure(error);}
}
function failure(error){return json({error:error instanceof RequestValidationError?error.message:error.code==='40001'?'تغيرت المسودة في جلسة أخرى. أعد تحميلها قبل الحفظ.':'تعذر حفظ المسودة الخاصة. تحقق من الاتصال وتفعيل تحديث لوحة التحرير.'},error instanceof RequestValidationError?error.status:error.code==='40001'?409:503);}

'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {inlineContentRequest} from '@/lib/inlineContentClient';
import {serializeEditorValue} from '@/lib/editorDrafts';
import {useEditorProtection} from './EditorProtection';
import useUnsavedChanges from '@/components/debates/useUnsavedChanges';

export default function useAdminEditor({db,kind,id,value,onRestore,active=true}) {
  const key=kind+':'+(id||'new'),serialized=serializeEditorValue(value);
  const [baseline,setBaseline]=useState(serialized),[draft,setDraft]=useState(null),[draftBusy,setDraftBusy]=useState(false),[draftMessage,setDraftMessage]=useState('');
  const [hasFiles,setHasFiles]=useState(false),[account,setAccount]=useState(null),ref=useRef({value,onRestore}),keyRef=useRef(key),protection=useEditorProtection();
  ref.current={value,onRestore};
  useEffect(()=>{if(!db?.auth)return;let live=true;const update=session=>{if(live)setAccount(session?.user?.id||null);};db.auth.getSession().then(({data})=>update(data.session)).catch(()=>update(null));const subscription=db.auth.onAuthStateChange?.((_event,session)=>update(session));return()=>{live=false;subscription?.data.subscription.unsubscribe();};},[db]);
  useEffect(()=>{if(keyRef.current!==key){keyRef.current=key;setBaseline(serializeEditorValue(ref.current.value));setHasFiles(false);}let live=true;setDraft(null);setDraftMessage('');
    if(!account)return;
    inlineContentRequest(db,'/api/admin/drafts?key='+encodeURIComponent(key)).then(result=>{if(live)setDraft(result.draft);}).catch(()=>{});
    return()=>{live=false;};
  },[key,db,account]);
  const dirty=serialized!==baseline||hasFiles,savedAsDraft=Boolean(draft&&serializeEditorValue(draft.value.data)===serialized),unprotected=active&&dirty&&(!savedAsDraft||hasFiles);
  const markClean=useCallback(next=>{setBaseline(serializeEditorValue(next));setHasFiles(false);},[]);
  const saveDraft=useCallback(async()=>{
    if(hasFiles){const message='ارفع الملفات المختارة بحفظ المحتوى أولاً، أو ألغ اختيارها. المسودة الخاصة تحفظ النصوص والروابط ولا ترفع الملفات تلقائياً.';setDraftMessage(message);throw Error(message);}
    setDraftBusy(true);setDraftMessage('');try{const result=await inlineContentRequest(db,'/api/admin/drafts',{method:'POST',body:{kind,key,revision:draft?.revision??null,value:{data:ref.current.value}}});setDraft(result.draft);setDraftMessage('حُفظت مسودة خاصة بحسابك. لم تتغير النسخة المنشورة.');return true;}catch(error){setDraftMessage(error.message);throw error;}finally{setDraftBusy(false);}
  },[db,draft?.revision,hasFiles,key,kind]);
  useEffect(()=>protection?.register(key,{dirty:unprotected,saveDraft,discard:()=>{ref.current.onRestore?.(JSON.parse(baseline));setHasFiles(false);document.querySelector('form[data-editor-key="'+CSS.escape(key)+'"]')?.reset();}}),[protection,key,unprotected,saveDraft,baseline]);
  useUnsavedChanges(!protection&&unprotected);
  const restoreDraft=()=>{if(!draft)return;if(unprotected&&!window.confirm('استبدال التعديلات الحالية بالمسودة الخاصة المحفوظة؟'))return;ref.current.onRestore?.(structuredClone(draft.value.data));setDraftMessage('استُعيدت المسودة الخاصة. راجعها ثم انشر التعديلات عندما تجهز.');};
  const clearDraft=async()=>{if(!draft)return;try{await inlineContentRequest(db,'/api/admin/drafts',{method:'DELETE',body:{key,revision:draft.revision}});setDraft(null);setDraftMessage('');}catch{setDraftMessage('حُفظ المحتوى. بقيت مسودة خاصة لم تُحذف؛ أعد تحميلها لمراجعة أحدث نسخة.');}};
  return {key,hasRecord:Boolean(id),dirty,unprotected,markClean,saveDraft,restoreDraft,clearDraft,draft,draftBusy,draftMessage,hasFiles,setHasFiles,savedAsDraft,leave:action=>protection?protection.requestLeave(action):(!unprotected||window.confirm('تجاهل التعديلات غير المحفوظة؟'))&&action(),confirm:()=>!unprotected||window.confirm('لديك تعديلات غير محفوظة. تجاهلها وفتح عنصر آخر؟')};
}

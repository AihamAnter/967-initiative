'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import TaskDialog from '@/components/tasks/TaskDialog';

const Context=createContext(null);
export const useEditorProtection=()=>useContext(Context);
export default function EditorProtection({children}) {
  const entries=useRef(new Map()),pending=useRef(null);
  const [dialog,setDialog]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const register=useCallback((key,value)=>{entries.current.set(key,value);return()=>entries.current.delete(key);},[]);
  const requestLeave=useCallback(action=>{
    if(![...entries.current.values()].some(entry=>entry.dirty)){action();return;}
    pending.current=action;setError('');setDialog(true);
  },[]);
  useEffect(()=>{
    const unload=event=>{if([...entries.current.values()].some(entry=>entry.dirty)){event.preventDefault();event.returnValue='';}};
    const navigate=event=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const link=event.target.closest?.('a[href]');if(!link||link.target==='_blank'||link.hasAttribute('download'))return;
      const url=new URL(link.href,location.href);if(url.pathname===location.pathname&&url.search===location.search&&url.origin===location.origin)return;
      if(![...entries.current.values()].some(entry=>entry.dirty))return;
      event.preventDefault();event.stopPropagation();requestLeave(()=>location.assign(url.href));
    };
    window.addEventListener('beforeunload',unload);document.addEventListener('click',navigate,true);
    return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);};
  },[requestLeave]);
  const proceed=(discard=false)=>{if(discard)for(const entry of entries.current.values())if(entry.dirty)entry.discard?.();const action=pending.current;pending.current=null;setDialog(false);action?.();};
  async function saveAndLeave(){setBusy(true);setError('');try{for(const entry of entries.current.values())if(entry.dirty){if(!entry.saveDraft)throw Error('احفظ النموذج الحالي قبل المغادرة.');await entry.saveDraft();}proceed();}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  const context=useMemo(()=>({register,requestLeave}),[register,requestLeave]);
  return <Context.Provider value={context}>{children}{dialog&&<TaskDialog title="لديك تعديلات غير محفوظة" busy={busy} onClose={()=>setDialog(false)}><p>احفظ مسودة خاصة لتكمل لاحقاً دون تغيير المحتوى المنشور، أو تجاهل التعديلات.</p>{error&&<p className="feedback error" role="alert">{error}</p>}<div className="editor-dialog-actions"><button className="btn btn-primary" disabled={busy} onClick={saveAndLeave}>{busy?'جارٍ حفظ المسودة…':'حفظ مسودة ومتابعة'}</button><button className="btn btn-outline" disabled={busy} onClick={()=>proceed(true)}>تجاهل ومتابعة</button><button className="btn btn-outline" disabled={busy} onClick={()=>setDialog(false)}>البقاء في النموذج</button></div></TaskDialog>}</Context.Provider>;
}

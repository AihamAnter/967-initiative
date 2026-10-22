'use client';
import {MoreHorizontal} from 'lucide-react';
import {useInlineEditor} from './InlineEditorProvider';

export default function InlineActions({target,label='أدوات التحرير'}){
 const editor=useInlineEditor();
 if(!editor.enabled||!target)return null;
 return <button type="button" className="inline-item-trigger" aria-label={label} title={label} onClick={()=>editor.open({type:['comments','questions','reports'].includes(target.kind)?'moderate':'actions',target})}><MoreHorizontal size={20}/><span className="sr-only">{label}</span></button>;
}

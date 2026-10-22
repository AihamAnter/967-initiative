'use client';
import {useEffect,useMemo} from 'react';
import {useInlineEditor} from './InlineEditorProvider';
import InlineActions from './InlineActions';
import {createInlineTarget} from '@/lib/inlineEditorTargets';

export default function InlineTarget({kind,id,slug,title,href,isDemo=false}){
  const {setPageTarget}=useInlineEditor();
  const target=useMemo(()=>createInlineTarget({kind,id,slug,title,href,isDemo}),[kind,id,slug,title,href,isDemo]);
  useEffect(()=>{setPageTarget(isDemo?null:target);return()=>setPageTarget(null);},[target,isDemo,setPageTarget]);
  return target&&!isDemo?<InlineActions target={target}/>:null;
}

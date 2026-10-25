'use client';
import {useEffect,useRef,useState} from 'react';
export default function AdminImageInput({name,currentUrl='',position='center',onSelection,accept='image/png,image/jpeg,image/webp'}) {
  const [file,setFile]=useState(null),[preview,setPreview]=useState(''),[upload,setUpload]=useState(null),input=useRef(null);
  useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
  useEffect(()=>{const progress=event=>setUpload(event.detail);window.addEventListener('967:admin-upload',progress);return()=>window.removeEventListener('967:admin-upload',progress);},[]);
  useEffect(()=>{const form=input.current?.form;if(!form)return;const reset=()=>{setFile(null);setUpload(null);};form.addEventListener('reset',reset);return()=>form.removeEventListener('reset',reset);},[]);
  return <span className="admin-image-input"><input ref={input} type="file" name={name} accept={accept} onChange={e=>{const next=e.target.files?.[0]||null;setFile(next);onSelection?.(Boolean(next));}}/>{(preview||currentUrl)&&<ImagePreview url={preview||currentUrl} alt={file?'معاينة الصورة الجديدة':'الصورة المحفوظة'} position={position}/ >}{file&&<><small>صورة جديدة: {file.name} · {(file.size/1024/1024).toFixed(2)} MB</small><button type="button" className="btn btn-outline" onClick={e=>{e.preventDefault();input.current.value='';setFile(null);input.current.dispatchEvent(new Event('change',{bubbles:true}));}}>إلغاء اختيار الصورة الجديدة</button></>}{upload&&<span className="admin-upload-state" role="status">{upload.error?'تعذر رفع الملف':upload.percent===100?'اكتمل رفع الملف':'جارٍ رفع '+upload.name}<progress max="100" value={upload.percent}/></span>}</span>;
}
export function ImagePreview({url,alt='',position='center'}){if(!url)return null;/* Blob URLs and editor-provided URLs must remain local and unoptimized. */
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="admin-image-preview" src={url} alt={alt} style={{objectPosition:position}}/>;
}

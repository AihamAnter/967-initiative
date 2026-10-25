'use client';
import {useState} from 'react';
import {Eye,Save,Upload} from 'lucide-react';
import TaskDialog from '@/components/tasks/TaskDialog';
import ContentText from '@/components/ContentText';
import {safeExternalUrl} from '@/lib/media';
import {ImagePreview} from './AdminImageInput';

export default function EditorActions({editor,busy=false,value,onCancel,published=false,children,allowNew=true,saveLabel}) {
  const [preview,setPreview]=useState(false),[selectedImage,setSelectedImage]=useState(null);
  const title=value?.title||value?.name||value?.full_name||'معاينة المحتوى',description=value?.summary||value?.short_bio||value?.bio||value?.short_description||value?.description;
  const image=selectedImage||value?.cover_url||value?.thumbnail_url||value?.image_url||value?.profile_image_url;
  return <><div className="editor-actions"><div className="editor-actions-buttons">
    <button type="submit" name="publicationIntent" value={published?'publish':'draft'} className="btn btn-primary" disabled={busy||editor.draftBusy}><Upload size={17}/>{busy?'جارٍ الحفظ…':saveLabel||(published?'نشر التعديلات':'حفظ في المنصة كمسودة')}</button>
    {!published&&value&&Object.hasOwn(value,'is_published')&&<button type="submit" name="publicationIntent" value="publish" className="btn btn-outline" disabled={busy||editor.draftBusy}>نشر المحتوى</button>}
    <button type="button" className="btn btn-outline" disabled={busy||editor.draftBusy} onClick={()=>editor.saveDraft().catch(()=>{})}><Save size={17}/>{editor.draftBusy?'جارٍ حفظ المسودة…':'حفظ مسودة خاصة'}</button>
    <button type="button" className="btn btn-outline" disabled={busy} onClick={event=>{setSelectedImage(event.currentTarget.closest('form')?.querySelector('.admin-image-input img[src^="blob:"]')?.src||null);setPreview(true);}}><Eye size={17}/>معاينة</button>
    {allowNew&&<button type="submit" name="afterSave" value="new" className="btn btn-outline" disabled={busy||editor.draftBusy}>حفظ وإضافة جديد</button>}
    {onCancel&&<button type="button" className="btn btn-outline" disabled={busy} onClick={onCancel}>إلغاء</button>}{children}
    </div><span className="editor-save-state" role="status">{editor.dirty?editor.savedAsDraft&&!editor.hasFiles?'مسودة خاصة محفوظة · لم تُنشر بعد':'تعديلات غير محفوظة':editor.hasRecord?'المحتوى محفوظ':'نموذج جديد'}</span>
    {editor.draftMessage&&<p role="status" className="editor-draft-message">{editor.draftMessage}</p>}
    {editor.draft&&<div className="editor-draft-restore"><span>مسودة خاصة · {new Date(editor.draft.updated_at).toLocaleString('ar-u-nu-latn')}</span><button type="button" disabled={busy||editor.draftBusy} onClick={editor.restoreDraft}>استعادة المسودة</button></div>}
  </div>{preview&&<TaskDialog title="معاينة المحتوى قبل النشر" onClose={()=>setPreview(false)} wide><p className="editor-preview-note">هذه معاينة للتعديلات الحالية؛ لم تُنشر على الموقع.</p><article className="editor-content-preview">{(selectedImage?.startsWith('blob:')||safeExternalUrl(image))&&<ImagePreview url={image} position={value.image_position||'center'}/>}<span className="eyebrow">{value?.category||value?.field||value?.unit}</span><h2>{title}</h2>{description&&<ContentText text={description}/>}<p className="small-muted">{[value?.location,value?.profession_title,value?.known_for].filter(Boolean).join(' · ')}</p>{value?.story&&<ContentText text={value.story}/>}<PreviewRows rows={value?.products} title="المنتجات"/><PreviewRows rows={value?.sections||value?.profile?.sections} title="أقسام المحتوى"/><PreviewRows rows={value?.faqs} title="الأسئلة والإجابات"/>{value?.services&&<p>{Array.isArray(value.services)?value.services.join('، '):value.services}</p>}</article></TaskDialog>}</>;
}
function PreviewRows({rows,title}){if(!Array.isArray(rows)||!rows.length)return null;return <section><h3>{title}</h3>{rows.map((row,index)=><div key={row.id||row.clientKey||index}><h4>{row.title||row.name||row.question}</h4><ContentText text={row.description||row.text||row.body||row.answer||''}/></div>)}</section>;}

'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpLeft, Bookmark, BookmarkCheck} from 'lucide-react';
import useReadingList, {toggleReadingItem} from './useReadingList';
import {readingContentItem} from '@/lib/readingList';

export default function SaveForLater({item}) {
  const {items,ready} = useReadingList();
  const [message,setMessage] = useState('');
  const [error,setError] = useState(false);
  const target = readingContentItem(item);
  const saved = target && items.some(entry => entry.href === target.href);
  const Icon = saved ? BookmarkCheck : Bookmark;
  function toggle() {
    try { const added = toggleReadingItem(target);setError(false);setMessage(added?'أُضيف إلى قائمة القراءة لاحقاً.':'أُزيل من قائمة القراءة لاحقاً.'); }
    catch (caught) {setError(true);setMessage(caught?.message?.includes('100')?caught.message:'تعذر الحفظ في المتصفح. تحقق من السماح بتخزين بيانات الموقع وحاول مجدداً.');}
  }
  if(!target)return null;
  return <div className="reading-save"><div className="reading-save-controls"><button type="button" className="reading-save-button" disabled={!ready} aria-pressed={saved} aria-label={saved?`إزالة ${item.title} من قائمة القراءة لاحقاً`:`حفظ ${item.title} للقراءة لاحقاً`} onClick={toggle}><Icon size={17} aria-hidden="true"/>{saved?'محفوظ للقراءة لاحقاً':'احفظ للقراءة لاحقاً'}</button>{saved&&<Link className="reading-list-link" href="/read-later" aria-label="فتح قائمة القراءة لاحقاً">عرض قائمتي <ArrowUpLeft size={14} aria-hidden="true"/></Link>}</div><span className={error?'reading-save-message':'sr-only'} role="status" aria-atomic="true">{message}</span></div>;
}

'use client';
import {useEffect,useState} from 'react';
import {Search} from 'lucide-react';
import {adminList} from '@/lib/adminLists';

export function useAdminList(rows,key) {
  const [filters,setFilters]=useState({q:'',publication:'all',category:'all',sort:'updated',page:1});
  const [ready,setReady]=useState(false);
  useEffect(()=>{try{const saved=JSON.parse(sessionStorage.getItem('967:admin-list:'+key));if(saved&&typeof saved==='object')setFilters(current=>({...current,...saved}));}catch{}setReady(true);},[key]);
  useEffect(()=>{if(ready)try{sessionStorage.setItem('967:admin-list:'+key,JSON.stringify(filters));}catch{}},[ready,key,filters]);
  return {...adminList(rows,filters),filters,update:patch=>setFilters(current=>({...current,page:1,...patch}))};
}
export default function AdminListTools({list,categories=[],label='البحث في المحتوى'}) {
  return <div className="admin-list-tools">
    <label className="admin-list-search"><Search size={17} aria-hidden="true"/><span className="sr-only">{label}</span><input type="search" placeholder={label} value={list.filters.q} onChange={e=>list.update({q:e.target.value})}/></label>
    <label><span>حالة النشر</span><select value={list.filters.publication} onChange={e=>list.update({publication:e.target.value})}><option value="all">كل الحالات</option><option value="published">منشور</option><option value="draft">مسودة</option></select></label>
    {categories.length>0&&<label><span>التصنيف</span><select value={list.filters.category} onChange={e=>list.update({category:e.target.value})}><option value="all">كل التصنيفات</option>{categories.map(category=><option key={category}>{category}</option>)}</select></label>}
    <label><span>الترتيب</span><select value={list.filters.sort} onChange={e=>list.update({sort:e.target.value})}><option value="updated">آخر تعديل</option><option value="created">الأحدث إضافة</option><option value="title">الاسم</option></select></label>
    <div className="admin-list-pagination"><span role="status">{list.total} نتيجة · صفحة {list.page} من {list.pages}</span><button type="button" disabled={list.page<=1} onClick={()=>list.update({page:list.page-1})}>السابق</button><button type="button" disabled={list.page>=list.pages} onClick={()=>list.update({page:list.page+1})}>التالي</button></div>
    {!list.total&&<p className="admin-list-empty">لا توجد نتائج مطابقة. جرّب كلمة أخرى أو غيّر الفلاتر.</p>}
  </div>;
}

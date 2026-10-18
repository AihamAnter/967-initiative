import {ArrowLeft, Search, SlidersHorizontal} from 'lucide-react';

export default function AdvancedSearchForm({query, type, mode, scope, exclude}) {
  return <form action="/search" role="search" className="advanced-search-form">
    <div className="global-search"><Search size={21} aria-hidden="true"/><label className="sr-only" htmlFor="platform-search">ابحث في منصة 967</label><input id="platform-search" name="q" type="search" defaultValue={query} placeholder="مثال: نجار صنعاء أو سكان اليمن" maxLength={150}/><button type="submit" aria-label="ابحث في المنصة"><span>ابحث</span><ArrowLeft size={18}/></button></div>
    <input type="hidden" name="type" value={type}/>
    <details className="advanced-search-options" open={mode !== 'all' || scope !== 'all' || Boolean(exclude)}>
      <summary><SlidersHorizontal size={17}/> خيارات البحث</summary>
      <div className="advanced-search-fields">
        <label>مطابقة الكلمات<select name="mode" defaultValue={mode}><option value="all">كل الكلمات، بأي ترتيب</option><option value="any">أي كلمة من الكلمات</option><option value="phrase">العبارة بالترتيب نفسه</option></select></label>
        <label>أين نبحث؟<select name="scope" defaultValue={scope}><option value="all">الاسم والوصف والتفاصيل</option><option value="title">الاسم أو العنوان فقط</option></select></label>
        <label>استبعاد كلمات<input name="exclude" defaultValue={exclude} maxLength={150} placeholder="مثال: تجريبي"/></label>
      </div>
      <p>اكتب كلمتين ولو كانتا متباعدتين. استخدم «&quot;الطاقة الشمسية&quot;» لعبارة دقيقة، و«-كلمة» لاستبعادها.</p>
      <button className="btn btn-outline" type="submit">تطبيق الخيارات <ArrowLeft size={16}/></button>
    </details>
  </form>;
}

'use client';

import {AlertTriangle, RefreshCw} from 'lucide-react';

export default function YemenNumbersError({reset}) {
  return <div className="ui-page"><div className="ui-wrap" role="alert" style={{display:'grid',justifyItems:'start',gap:12,maxWidth:640}}><AlertTriangle size={30} aria-hidden="true"/><h1>تعذر تحميل البيانات</h1><p>حدث خلل مؤقت أثناء قراءة المؤشرات. لم تُعرض أي قيمة غير موثقة بدلاً منها.</p><button className="ui-btn" onClick={reset}><RefreshCw size={17} aria-hidden="true"/> المحاولة مجدداً</button></div></div>;
}

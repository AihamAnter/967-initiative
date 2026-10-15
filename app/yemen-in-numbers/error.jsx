'use client';

import {AlertTriangle, RefreshCw} from 'lucide-react';

export default function YemenNumbersError({reset}) {
  return <section className="section"><div className="container stat-empty"><AlertTriangle size={30}/><h1>تعذر تحميل البيانات</h1><p>حدث خلل مؤقت أثناء قراءة المؤشرات. لم تُعرض أي قيمة غير موثقة بدلاً منها.</p><button className="btn btn-red" onClick={reset}><RefreshCw size={17}/> المحاولة مجدداً</button></div></section>;
}

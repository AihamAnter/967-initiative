export const MODERATION_ACTION_LABELS={approved:'اعتماد',rejected:'رفض',hidden:'إخفاء',selected:'اختيار للمناظرة',answered:'تمت الإجابة عنه',resolved:'معالجة البلاغ',dismissed:'رفض البلاغ',pending:'إعادة إلى المراجعة',new:'إعادة إلى المراجعة',open:'إعادة فتح البلاغ'};

export function moderationActionLabel(kind,current,next,fallback){
 if(current==='hidden')return 'استعادة المشاركة';
 if(kind==='questions'&&current==='selected'&&next==='approved')return 'إلغاء اختيار السؤال';
 if(kind==='questions'&&current==='answered'&&next==='selected')return 'إعادة إلى الأسئلة المختارة';
 if(kind==='questions'&&current==='answered'&&next==='approved')return 'إعادة إلى الأسئلة المعتمدة';
 return MODERATION_ACTION_LABELS[next]||fallback||next;
}

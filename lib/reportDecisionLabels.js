// Existing database states stay unchanged; neither decision enforces a penalty.
export const REPORT_STATUS_LABELS=Object.freeze({
 open:'بانتظار المراجعة',
 reviewed:'اكتملت المراجعة',
 dismissed:'أُغلق دون إجراء'
});
export const REPORT_DECISION_LABELS=Object.freeze({
 reviewed:'تسجيل اكتمال المراجعة',
 dismissed:'إغلاق دون إجراء'
});
export function reportDecisionPrompt(status,reference=''){
 const subject=reference?' ('+reference+')':'';
 if(status==='reviewed')return 'هل تريد تسجيل اكتمال مراجعة البلاغ'+subject+'؟\n\nيُوثّق هذا انتهاء مراجعة البلاغ، لكنه لا يحظر مستخدمًا أو ينفذ عقوبة أو إجراءً تلقائيًا.';
 if(status==='dismissed')return 'هل تريد إغلاق البلاغ'+subject+' دون اتخاذ إجراء؟\n\nيُسجّل هذا القرار أن البلاغ لا يستدعي إجراءً حاليًا، ولا ينفذ أي حظر تلقائي.';
 return '';
}

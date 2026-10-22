// These are persisted states returned by the existing API, not client guesses.
export function participationNotice(action,result,fallback){
 if(!['comment','question','comment_edit'].includes(action))return {message:fallback,error:false};
 const status=result?.status,question=action==='question',noun=question?'سؤالك':'تعليقك';
 if(['approved','selected','answered'].includes(status))return {message:action==='comment_edit'?'حُفظ التعديل، والتعليق منشور في ساحة النقاش.':`نُشر ${noun} في ساحة النقاش.`,error:false};
 if(['pending','new'].includes(status))return {message:`حُفظ ${noun}، لكنه ما زال بانتظار المراجعة ولم يُنشر للعامة. يمكنك متابعة حالته في «مشاركاتي».`,error:false};
 if(['hidden','rejected'].includes(status))return {message:'حُفظ التعديل، وتبقى المشاركة غير ظاهرة للعامة وفق قرار الإشراف.',error:false};
 if(status==='deleted')return {message:'هذه المشاركة محذوفة ولا تظهر للعامة.',error:false};
 return {message:'حُفظت المشاركة، لكن تعذر التحقق من حالة ظهورها. راجع «مشاركاتي» قبل إعادة الإرسال.',error:false};
}

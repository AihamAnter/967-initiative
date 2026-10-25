// Translate public Auth error codes without exposing raw server messages.
export function accountAuthErrorMessage(error,action='login'){
 const code=error?.code,status=Number(error?.status);
 if(code==='invalid_credentials'||error?.name==='AuthInvalidCredentialsError')return 'البريد الإلكتروني أو كلمة المرور غير صحيحة. تحقق منهما أو استخدم «نسيت كلمة المرور».';
 if(code==='email_not_confirmed')return 'لم يُؤكَّد بريد هذا الحساب بعد. افتح رسالة التأكيد أو اطلب إعادة إرسالها أدناه.';
 if(code==='user_banned')return 'هذا الحساب موقوف. تواصل مع الإدارة.';
 if(code==='email_provider_disabled')return 'تسجيل الدخول بالبريد غير مفعّل حالياً. تواصل مع الإدارة.';
 if(code==='signup_disabled')return 'إنشاء الحسابات غير متاح حالياً. تواصل مع الإدارة.';
 if(code==='user_already_exists'||code==='email_exists')return 'تعذر إنشاء الحساب بهذه البيانات. يمكنك تسجيل الدخول أو استعادة كلمة المرور إذا سبق لك التسجيل.';
 if(code==='weak_password')return 'كلمة المرور لا تحقق متطلبات الأمان. استخدم كلمة أطول تتضمن حروفًا وأرقامًا ورموزًا.';
 if(code==='same_password')return 'اختر كلمة مرور تختلف عن كلمة المرور الحالية.';
 if(['otp_expired','flow_state_expired','flow_state_not_found','bad_code_verifier','validation_failed'].includes(code))return 'رابط الحساب غير صالح أو منتهي. اطلب رابطًا جديدًا وافتحه في المتصفح نفسه.';
 if(status===429||['over_request_rate_limit','over_email_send_rate_limit'].includes(code))return 'طلبات كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مجدداً.';
 if(status>=500)return 'خدمة الحسابات غير متاحة مؤقتاً. حاول مجدداً بعد قليل.';
 if(['AuthRetryableFetchError','TypeError','AbortError','TimeoutError'].includes(error?.name)||code==='request_timeout')return 'تعذر الاتصال بخدمة الحسابات. تحقق من اتصالك بالإنترنت ثم حاول مجدداً.';
 return action==='login'?'تعذر تسجيل الدخول. حاول مجدداً أو استخدم «نسيت كلمة المرور».':action==='update'?'تعذر تحديث كلمة المرور. أعد طلب رابط الاستعادة.':'تعذر إرسال الطلب. تحقق من البيانات وحاول مجدداً.';
}

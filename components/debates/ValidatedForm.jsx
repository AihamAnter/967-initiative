'use client';
import {Children,createContext,forwardRef,isValidElement,useContext,useId,useRef,useState} from 'react';

const ValidationContext=createContext(null);

function messageFor(control,validate){
 control.setCustomValidity('');
 const value=control.value;
 if(control.required&&typeof value==='string'&&!value.trim())control.setCustomValidity('هذا الحقل إلزامي.');
 else if(value&&['text','email','url','password','textarea'].includes(control.type)&&control.minLength>0&&(control.type==='password'?value.length:value.trim().length)<control.minLength)control.setCustomValidity(`أدخل ${control.minLength} أحرف على الأقل.`);
 else if(value&&control.type==='url'){
  try{const url=new URL(value);if(url.protocol!=='https:'||!url.hostname||url.username||url.password)control.setCustomValidity('أدخل رابط HTTPS صالحاً، مثل https://example.com.');}
  catch{control.setCustomValidity('أدخل رابطاً صحيحاً، مثل https://example.com.');}
 }
 if(!control.validationMessage&&control.name==='confirmation'&&value!==control.form?.elements.namedItem('password')?.value)control.setCustomValidity('كلمتا المرور غير متطابقتين.');
 if(!control.validationMessage&&validate){const message=validate(value,control);if(message)control.setCustomValidity(message);}
 const v=control.validity;
 if(v.valid)return '';
 if(v.customError)return control.validationMessage;
 if(v.valueMissing)return control.type==='checkbox'?'يجب تأكيد هذا الخيار للمتابعة.':control.type==='radio'?'اختر أحد الخيارات.':'هذا الحقل إلزامي.';
 if(v.typeMismatch)return control.type==='email'?'أدخل بريداً إلكترونياً صحيحاً.':'أدخل قيمة صحيحة.';
 if(v.patternMismatch)return 'استخدم الحروف والأرقام والتنسيق المطلوب الموضح للحقل.';
 if(v.tooShort)return `أدخل ${control.minLength} أحرف على الأقل.`;
 if(v.tooLong)return `الحد الأقصى ${control.maxLength} حرفاً.`;
 if(v.rangeUnderflow)return `أدخل قيمة لا تقل عن ${control.min}.`;
 if(v.rangeOverflow)return `أدخل قيمة لا تزيد عن ${control.max}.`;
 if(v.badInput||v.stepMismatch)return 'أدخل رقماً صحيحاً ضمن النطاق المسموح.';
 return 'تحقق من القيمة المدخلة.';
}

export default function ValidatedForm({children,onSubmit,...props}){
 const validators=useRef(new Map()),[failed,setFailed]=useState(false),formRef=useRef(null);
 function submit(event){
  let valid=true;
  for(const [control,validate] of validators.current)if(control.isConnected&&control.form===event.currentTarget&&control.willValidate){if(!validate())valid=false;}
  // Keep native constraints effective for any unwrapped control too.
  if(!event.currentTarget.checkValidity())valid=false;
  setFailed(!valid);
  if(!valid){event.preventDefault();const first=event.currentTarget.querySelector('input:invalid,textarea:invalid,select:invalid,input[aria-invalid="true"],textarea[aria-invalid="true"],select[aria-invalid="true"]');for(let parent=first?.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;first?.focus();return;}
  onSubmit?.(event);
 }
 return <ValidationContext.Provider value={validators}><form {...props} ref={formRef} noValidate onSubmit={submit} onReset={event=>{const form=event.currentTarget;setFailed(false);queueMicrotask(()=>{for(const [control,validate] of validators.current)if(control.isConnected&&control.form===form)validate(true);});}}>
  <p className="debate-required-note">الحقول المعلّمة بـ <span aria-hidden="true">*</span> إلزامية.</p>
  {failed&&<p className="debate-validation-summary" role="alert">راجع الحقول المعلّمة بالأحمر وأكمل البيانات المطلوبة.</p>}
  {children}
 </form></ValidationContext.Provider>;
}

function hasRequired(children){return Children.toArray(children).some(child=>isValidElement(child)&&(child.props.required||hasRequired(child.props.children)));}
export function FormLabel({children,required:explicitRequired,...props}){
 return <label {...props} className={['debate-field-label',props.className].filter(Boolean).join(' ')}>{children}{(explicitRequired||hasRequired(children))&&<span className="debate-required-mark" aria-hidden="true">*</span>}</label>;
}

function makeControl(tag){
 const Control=forwardRef(function ValidatedControl({validate,onChange,onInput,onBlur,onInvalid,...props},forwardedRef){
  const validators=useContext(ValidationContext),ref=useRef(null),errorId=useId(),[error,setError]=useState(''),touched=useRef(false),edited=useRef(false);
  // Native validity checks alone must not reveal errors on untouched forms.
  // Explicit submission opts in each field through its registered update.
  const update=(clear=false)=>{const node=ref.current;if(!node)return true;if(clear){node.setCustomValidity('');touched.current=false;edited.current=false;setError('');return true;}touched.current=true;const message=messageFor(node,validate);setError(message);return !message;};
  const Tag=tag;
  return <><Tag {...props} ref={node=>{const registry=validators?.current;if(ref.current)registry?.delete(ref.current);ref.current=node;if(node)registry?.set(node,update);if(typeof forwardedRef==='function')forwardedRef(node);else if(forwardedRef)forwardedRef.current=node;}} aria-invalid={error?'true':undefined} aria-describedby={[props['aria-describedby'],error?errorId:null].filter(Boolean).join(' ')||undefined}
   onChange={event=>{edited.current=true;onChange?.(event);if(touched.current)update();if(event.currentTarget.type==='radio'&&validators)for(const [control,revalidate] of validators.current)if(control.type==='radio'&&control.name===event.currentTarget.name&&control.form===event.currentTarget.form)revalidate();}}
   onInput={event=>{edited.current=true;onInput?.(event);if(touched.current)update();}}
   onBlur={event=>{onBlur?.(event);if(event.currentTarget.willValidate&&(edited.current||touched.current))update();}}
   onInvalid={event=>{event.preventDefault();onInvalid?.(event);if(edited.current||touched.current)update();}}/>
   {error&&<span id={errorId} className="debate-field-error" aria-hidden="true">{error}</span>}
  </>;
 });
 return Control;
}
export const FormInput=makeControl('input');
export const FormTextarea=makeControl('textarea');
export const FormSelect=makeControl('select');

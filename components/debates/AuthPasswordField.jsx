'use client';
import {useId,useState} from 'react';
import {FormInput,FormLabel} from './ValidatedForm';

export default function AuthPasswordField({name='password',label='كلمة المرور',newPassword=false,confirmation=false,disabled=false}){
 const id=useId(),[visible,setVisible]=useState(false),[caps,setCaps]=useState(false);
 return <div className="auth-password-control"><FormLabel htmlFor={id} required>{label}</FormLabel><span className="auth-password-field"><FormInput id={id} name={name} type={visible?'text':'password'} minLength={newPassword?8:undefined} maxLength={128} required autoComplete={newPassword?'new-password':'current-password'} disabled={disabled} aria-describedby={newPassword&&!confirmation?id+'-hint':undefined} onKeyUp={event=>setCaps(event.getModifierState('CapsLock'))} onBlur={()=>setCaps(false)}/><button type="button" className="auth-password-toggle" disabled={disabled} aria-controls={id} aria-label={(visible?'إخفاء ':'إظهار ')+label} aria-pressed={visible} onClick={()=>setVisible(value=>!value)}>{visible?'إخفاء':'إظهار'}</button></span>{newPassword&&!confirmation&&<small id={id+'-hint'} className="auth-password-hint">8 أحرف على الأقل. استخدم كلمة مرور خاصة بهذا الحساب.</small>}{caps&&<small className="auth-password-hint" role="status">زر الأحرف الكبيرة Caps Lock مفعّل.</small>}</div>;
}

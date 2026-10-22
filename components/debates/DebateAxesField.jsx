'use client';
import {FormLabel,FormTextarea} from './ValidatedForm';
import {validateDebateAxes} from '@/lib/debateEditor';

export default function DebateAxesField({value=[],onChange}){
 return <FormLabel>محاور النقاش (كل محور في سطر)<FormTextarea value={value.join('\n')} onChange={event=>onChange(event.target.value.split(/\r?\n/))} validate={validateDebateAxes} rows={4} maxLength={10019}/><small>يمكن إضافة المحاور أو تعديلها أو حذفها بعد النشر. تحتفظ الأسئلة السابقة باسم المحور الذي اختاره صاحب السؤال.</small></FormLabel>;
}

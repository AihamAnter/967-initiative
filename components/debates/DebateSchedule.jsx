import {CalendarClock} from 'lucide-react';
import {formatDebateSchedule,recordingPreviewState} from '@/lib/debates';

export default function DebateSchedule({debate}){
 const state=recordingPreviewState(debate);
 if(debate.debate_type!=='prerecorded'||state==='available')return null;
 const inactive={cancelled:['أُلغيت هذه المناظرة','لا يوجد موعد نشر قائم لهذه المناظرة.'],postponed:['المناظرة مؤجلة','موعد النشر الجديد سيُعلن لاحقاً.'],withdrawn:['التسجيل غير متاح حالياً','سيُعلن عن إتاحته مجدداً عند اعتماد ذلك.'],archived:['مناظرة مؤرشفة','التسجيل غير متاح حالياً.']};
 const schedule=inactive[state]?null:formatDebateSchedule(debate.scheduled_at);
 return <div className={'debate-release-card'+(inactive[state]?' debate-release-inactive':'')} data-schedule-state={state}>
  <span className="debate-release-icon" aria-hidden="true"><CalendarClock size={28}/></span><div><h2>{inactive[state]?.[0]||'موعد نشر المناظرة'}</h2>{inactive[state]?<p>{inactive[state][1]}</p>:schedule?<><time dateTime={schedule.iso}><strong>{schedule.date}</strong><span>{schedule.time} <small>— بتوقيت اليمن</small></span></time><p className="debate-release-note">موعد مخطط؛ يتاح التسجيل عند نشره من إدارة الموقع.</p></>:<p className="debate-release-unset">موعد النشر سيُعلن لاحقاً</p>}</div>
 </div>;
}

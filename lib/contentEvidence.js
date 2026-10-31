// A record's access/review date does not prove current service availability.
// Keep historical facts and current operational claims separate.
export function validEvidenceDate(value,asOf=new Date()){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T12:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value
  &&value<=asOf.toISOString().slice(0,10);
}
export function medicalOperatingEvidence(item,asOf=new Date()){
 const status=item?.operatingStatus||item?.operating_status||'unknown';
 const asOfDate=item?.operatingStatusAsOf||item?.operating_status_as_of;
 if(status==='unknown')return {kind:'unknown',message:'حالة تشغيل هذه المنشأة غير مؤكدة. تحقق من الجهة الصحية قبل الزيارة.'};
 if(!validEvidenceDate(asOfDate,asOf))return {kind:'undated',message:'لم يُذكر تاريخ صالح لحالة التشغيل المدرجة؛ لا يمكن اعتبارها حالة المنشأة الآن.'};
 const months=(asOf.getUTCFullYear()-Number(asOfDate.slice(0,4)))*12+asOf.getUTCMonth()+1-Number(asOfDate.slice(5,7));
 return {
  kind:months>=12?'historical':'dated',asOf:asOfDate,
  message:months>=12
   ?'وصف التشغيل مأخوذ من بيانات بتاريخ '+asOfDate+'، وليس تأكيدًا لعمل المنشأة حاليًا. تحقق من توفر الخدمة قبل الزيارة.'
   :'حالة التشغيل وفق بيانات '+asOfDate+' فقط؛ يُنصح بتأكيد توفر الخدمة مباشرة.'
 };
}
export function indicatorMeasurementEvidence(year,asOf=new Date()){
 const current=asOf.getUTCFullYear();
 if(!Number.isInteger(Number(year))||Number(year)<1900)return {kind:'missing',message:'سنة القياس غير محددة؛ لا يجوز اعتبار القيمة حديثة.'};
 const value=Number(year),age=current-value;
 if(age<0)return {kind:'future',message:'سنة القياس '+value+' لاحقة للسنة الحالية '+current+'؛ يلزم تدقيق بيانات المؤشر.'};
 if(age>=6)return {kind:'historical',message:'هذه آخر قيمة متاحة لسنة '+value+'، أي قبل '+age+' سنوات من '+current+'. لا تعبّر بالضرورة عن الوضع الحالي في اليمن.'};
 if(age>=3)return {kind:'older',message:'آخر سنة قياس متاحة هي '+value+'؛ القيمة لا تعني أنها تصف الوضع الحالي في '+current+'.'};
 return {kind:'recent',message:'القيمة تخص سنة القياس '+value+'، ولا تمثل قياسًا فوريًا للوضع الحالي.'};
}
export function hasFigureImageProvenance(figure,portrait=null){
 const credit=String(figure?.imageCredit||portrait?.credit||'').trim();
 const source=String(figure?.imageSourceUrl||portrait?.sourceUrl||'').trim();
 if(!figure?.imageUrl||!credit)return false;
 try{const url=new URL(source);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password;}
 catch{return false;}
}

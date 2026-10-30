// School 967: deterministic teaching models, not political rankings or forecasts.
export const CIVIC_LABS={
 institutions:{title:'توزيع الصلاحيات',x:{label:'نسبة صلاحيات التنفيذ',min:10,max:70,step:5,initial:35},y:{label:'نسبة صلاحيات التشريع',min:10,max:70,step:5,initial:35},note:'المؤشر يصف التوزيع العددي الافتراضي فقط؛ لا يقيس جودة الحكم أو الحقوق أو استقلال القضاء.'},
 elections:{title:'تحويل الأصوات إلى مقاعد',x:{label:'أصوات القائمة أ (%)',min:10,max:75,step:5,initial:40},y:{label:'أصوات القائمة ب (%)',min:10,max:75,step:5,initial:35},note:'دائرة وطنية واحدة، 10 مقاعد، ثلاث قوائم، دون عتبة انتخابية. هذا مثال لطريقة أكبر المتوسطات (دونت) وليس توقعًا لانتخابات.'},
 market:{title:'سوق العرض والطلب',x:{label:'تغير الطلب (وحدة)',min:-40,max:40,step:5,initial:0},y:{label:'تغير العرض (وحدة)',min:-40,max:40,step:5,initial:0},note:'نفترض منحنيي طلب وعرض خطيين ثابتَي الميل؛ الأسواق الواقعية تتأثر بعوامل إضافية.'},
 monetary:{title:'تكلفة قرض افتراضي',x:{label:'الفائدة السنوية (%)',min:0,max:20,step:1,initial:5},y:{label:'مدة القرض (سنة)',min:1,max:15,step:1,initial:5},note:'قرض ثابت مقداره 10,000 وحدة نقدية، بأقساط شهرية متساوية ودون رسوم أو ضرائب. لا يمثل توقعًا للتضخم.'},
 budget:{title:'توزيع موازنة عامة',x:{label:'التعليم من الموازنة (%)',min:5,max:60,step:5,initial:25},y:{label:'الصحة من الموازنة (%)',min:5,max:60,step:5,initial:25},note:'100 وحدة موازنة افتراضية. المتبقي يمول بقية القطاعات والالتزامات، وليس دخلًا فائضًا. لا توجد نسب مثالية عامة لجميع البلدان.'}
};
export function allocateDhondt(votes,seats=10){
 if(!Array.isArray(votes)||votes.length!==3||votes.some(v=>!Number.isFinite(v)||v<0)||!Number.isInteger(seats)||seats<1||seats>30)throw Error('Invalid election parameters');
 const allocated=[0,0,0];
 for(let n=0;n<seats;n++){
  let winner=0;
  for(let i=1;i<3;i++)if(votes[i]/(allocated[i]+1)>votes[winner]/(allocated[winner]+1))winner=i;
  allocated[winner]++;
 }
 return allocated;
}
export function calculateCivicLab(model,{x,y}){
 const config=CIVIC_LABS[model];
 if(!config||!Number.isFinite(x)||!Number.isFinite(y)||x<config.x.min||x>config.x.max||y<config.y.min||y>config.y.max)throw Error('Invalid lab parameters');
 if(['institutions','elections','budget'].includes(model)&&x+y>100)throw Error('Allocation exceeds 100%');
 switch(model){
  case 'institutions':{
   const judicial=100-x-y;
   return {primary:x,metric:'حصة التنفيذ',unit:'%',rows:[['التنفيذ',x+'%'],['التشريع',y+'%'],['القضاء',judicial+'%']],conclusion:'تغيير حصة سلطة يغير حصص السلطات الأخرى في هذه التجربة. لا يمكن استنتاج درجة الاستقلال من النسب وحدها.'};
  }
  case 'elections':{
   const votes=[x,y,100-x-y],seats=allocateDhondt(votes);
   return {primary:seats[0],metric:'مقاعد القائمة أ',unit:' مقاعد',rows:votes.map((v,i)=>['القائمة '+['أ','ب','ج'][i],v+'% من الأصوات ← '+seats[i]+' مقاعد']),conclusion:'حصة المقاعد تختلف عن حصة الأصوات بسبب طريقة القسمة والتقريب؛ هذه ليست محاكاة لسلوك الناخبين.'};
  }
  case 'market':{
   const price=(100+x-y)/6,quantity=120+x-4*price;
   return {primary:price,metric:'سعر التوازن',unit:' وحدة نقدية',rows:[['السعر',price.toFixed(2)],['الكمية',quantity.toFixed(2)]],conclusion:'زيادة الطلب مع ثبات العرض ترفع سعر التوازن في هذا النموذج؛ وزيادة العرض مع ثبات الطلب تخفضه.'};
  }
  case 'monetary':{
   const r=x/1200,n=y*12,monthly=r===0?10000/n:10000*r/(1-Math.pow(1+r,-n)),total=monthly*n;
   return {primary:monthly,metric:'القسط الشهري',unit:' وحدة نقدية',rows:[['القسط الشهري',monthly.toFixed(2)],['مجموع السداد',total.toFixed(2)],['الفوائد الكلية',(total-10000).toFixed(2)]],conclusion:'ارتفاع الفائدة يزيد القسط عند تثبيت المدة؛ إطالة المدة تخفض القسط غالبًا لكنها تزيد مجموع الفوائد عند الفائدة الموجبة.'};
  }
  case 'budget':
   return {primary:x,metric:'حصة التعليم',unit:'%',rows:[['التعليم',x+'%'],['الصحة',y+'%'],['بقية القطاعات',100-x-y+'%']],conclusion:'زيادة بند مع بقاء إجمالي الموازنة ثابتًا تقلص ما يتاح لبنود أخرى. الأثر الحقيقي يعتمد على الاحتياجات وجودة الإنفاق.'};
  default:throw Error('Unknown civic model');
 }
}

import {defaultPolicyPages} from './defaultPolicyPages.js';
import {defaultSiteSettings,resolveSiteSettings,SITE_CONTENT_KEY,ABOUT_TAGS_KEY} from './siteSettings.js';
import {RequestValidationError} from './requestSecurity.js';

// This key contains PUBLIC content only. There are no private drafts in site_settings.
export const CONTENT_PAGES_KEY='public_content_pages_v1';
export const CONTENT_PAGE_KEYS=[SITE_CONTENT_KEY,ABOUT_TAGS_KEY,CONTENT_PAGES_KEY];
export const pageKinds={article:'صفحة نصية',faq:'مركز مساعدة وأسئلة',about:'من نحن والطاقم',requests:'طلبات وبلاغات'};
export const builtInPages={privacy:'article',terms:'article',about:'about',help:'faq','privacy-requests':'requests'};
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(value);
export const contentPagePath=page=>Object.hasOwn(builtInPages,page.slug)?'/'+page.slug:'/pages/'+encodeURIComponent(page.slug);

export function safeContentHref(value){
 if(typeof value!=='string'||value.length>2048||/[\u0000-\u0020\u007f\\]/.test(value))return null;
 try{const url=new URL(value,'https://local.invalid');if(url.username||url.password)return null;
  if(value.startsWith('/'))return url.origin==='https://local.invalid'?url.pathname+url.search+url.hash:null;
  return /^https?:\/\//i.test(value)&&['https:','http:'].includes(url.protocol)?url.href:null;
 }catch{return null;}
}

export function createDefaultContentPages(settings=defaultSiteSettings){
 const page=(slug,kind,title,description,summary,order,extra={})=>({id:slug,slug,kind,title,description,summary,order,showInFooter:true,isPublished:true,sections:[],faqs:[],team:[],updatedAt:'2026-10-18T00:00:00.000Z',...extra});
 return [
  page('about','about','من نحن','تعرّف على مبادرة 967 ورسالتها ومجالات عملها والطاقم المشارك فيها.',settings.aboutDescription,10,{
   sections:[{id:'about-vision',title:'رؤيتنا ورسالتنا',text:settings.aboutVision},{id:'about-fields',title:'مجالات عملنا',text:settings.aboutFields}],
   team:[
    {id:'team-example-1',name:'عضو تجريبي أول',role:'إدارة المبادرة والتنسيق',bio:'بيانات توضيحية مؤقتة؛ تُستبدل باسم العضو الحقيقي ومهامه عند اعتمادها.',isExample:true},
    {id:'team-example-2',name:'عضو تجريبي ثانٍ',role:'التحرير وإنتاج المحتوى',bio:'مثال مؤقت لعرض مسؤوليات إعداد المحتوى ومراجعته وتوثيق مصادره.',isExample:true},
    {id:'team-example-3',name:'عضو تجريبي ثالث',role:'التطوير وتجربة المستخدم',bio:'مثال مؤقت لعرض مسؤوليات تطوير المنصة وتحسين سهولة استخدامها.',isExample:true},
   ]}),
  page('help','faq','مركز المساعدة والأسئلة الشائعة','إجابات سريعة عن البحث والمجلة والمؤشرات والأدلة والمشاركة.','ابدأ بالإجابات التالية، وإذا لم تجد ما تحتاجه فتواصل معنا.',20,{
   faqs:[
    {id:'faq-search',question:'كيف أبحث بكلمتين غير متجاورتين؟',answer:'اكتب الكلمتين في البحث، مثل «نجار صنعاء». يبحث الموقع عن كل الكلمات بأي ترتيب. ومن خيارات البحث يمكنك اختيار أي كلمة، أو العنوان فقط، أو استبعاد كلمات. استخدم علامات الاقتباس لعبارة دقيقة.'},
    {id:'faq-account',question:'هل أحتاج إلى حساب للتصفح أو المشاركة؟',answer:'لا تحتاج إلى حساب لقراءة المحتوى أو البحث أو إرسال مساهمة. تحتاج إلى حساب مؤكد البريد للمشاركة في المناظرات بالتعليقات والأسئلة والتصويت. للمحررين والإدارة صلاحيات منفصلة لإدارة المحتوى.'},
    {id:'faq-contribute',question:'كيف أرسل تصحيحًا أو أقترح موضوعًا؟',answer:'افتح [تواصل وشارك](/contribute)، واختر نوع المساهمة وأضف رابط الصفحة والمصدر عند توفره. يراجع فريق التحرير الرسائل قبل اعتماد أي تعديل.'},
    {id:'faq-draft',question:'هل تضيع رسالتي عند تغيير نوع المشاركة؟',answer:'يحفظ النموذج مسودة مؤقتة في التبويبة نفسها، ويمكن استعادتها خلال 30 دقيقة من آخر حفظ. امسح المسودة عند استخدام جهاز مشترك. ظهور رسالة النجاح هو تأكيد استلام الرسالة للمراجعة.'},
    {id:'faq-data',question:'كيف أقرأ المؤشرات وأتحقق من مصادرها؟',answer:'راجع سنة القياس والوحدة وحالة القيمة ورابط المصدر في صفحة المؤشر. لا تعني القيمة المفقودة صفرًا، ولا تكفي سنة واحدة لاستنتاج اتجاه زمني.'},
    {id:'faq-magazine',question:'كيف أقرأ المجلة أو أنزّل العدد؟',answer:'افتح العدد من [المجلة](/magazine)، ثم استخدم أدوات القارئ والتنزيل المتاحة. الملفات الموسومة بالتجريبية مخصصة لمعاينة القارئ ولا تمثل عددًا رسميًا.'},
    {id:'faq-directory',question:'هل تضمن المبادرة خدمات المهنيين أو منتجات الشركات؟',answer:'الأدلة للتعريف والوصول إلى الجهات. تحقق مباشرة من الهوية والأسعار والتوفر وشروط التعامل قبل التعاقد أو الدفع.'},
    {id:'faq-privacy',question:'كيف أطلب تعديل بياناتي أو أبلغ عن محتوى؟',answer:'استخدم [طلبات الخصوصية والبلاغات](/privacy-requests)، وحدد نوع الطلب ورابط الصفحة أو وصف المشكلة. لا ترسل كلمات مرور أو وثائق حساسة دون طلب واضح.'},
   ]}),
  page('privacy-requests','requests','طلبات الخصوصية والبلاغات','أرسل طلبًا يتعلق ببياناتك أو بلاغًا عن محتوى أو مشكلة في الموقع.','حدد نوع الطلب وأضف المعلومات الضرورية لمراجعته. تصل الرسالة إلى فريق المبادرة ولا تُنشر للعامة.',30,{
   sections:[{id:'requests-information',title:'ما المعلومات المفيدة لطلبك؟',text:'أضف رابط الصفحة أو وصف البيانات التي تخصك، واشرح التصحيح أو الإجراء المطلوب. للبلاغات التقنية، اذكر الخطوات التي أدت إلى المشكلة ونوع الجهاز أو المتصفح إن أمكن.'},{id:'requests-review',title:'ماذا يحدث بعد الإرسال؟',text:'يراجع الفريق الطلب ويستخدم بريدك لمتابعته. قد نطلب ما يلزم للتحقق من صلتك بالبيانات قبل تنفيذ إجراء عليها. استلام الطلب لا يعني تنفيذ الحذف أو إزالة المحتوى تلقائيًا. لا ترسل كلمات مرور أو وثائق حساسة من تلقاء نفسك.'}]}),
  ...structuredClone(defaultPolicyPages).map(page=>({...page,isPublished:true})),
 ];
}

export function validateContentPage(input){
 const fail=message=>{throw new RequestValidationError(message);};
 if(!input||typeof input!=='object'||Array.isArray(input))fail('بيانات الصفحة غير صالحة.');
 const text=(value,max,label,required=false)=>{if(typeof value!=='string')fail(`تحقق من ${label}.`);const result=value.trim();if((required&&!result)||result.length>max)fail(`تحقق من طول ${label}.`);return result;};
 if(!validId(input.id))fail('معرّف الصفحة غير صالح.');
 const slug=text(input.slug,80,'رابط الصفحة',true);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))fail('استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطة بين الكلمات في الرابط.');
 if(!Object.hasOwn(pageKinds,input.kind)||(Object.hasOwn(builtInPages,slug)&&builtInPages[slug]!==input.kind))fail('نوع الصفحة لا يتوافق مع رابطها.');
 if(!Number.isInteger(input.order)||input.order<0||input.order>10000||typeof input.showInFooter!=='boolean')fail('تحقق من ترتيب الصفحة وخيار ظهورها في الفوتر.');
 if(input.isPublished!==undefined&&typeof input.isPublished!=='boolean')fail('حالة ظهور الصفحة غير صالحة.');
 const rows=(key,max,build)=>{if(!Array.isArray(input[key])||input[key].length>max)fail(`عدد عناصر ${key} غير صالح.`);const ids=new Set();return input[key].map(row=>{if(!row||typeof row!=='object'||Array.isArray(row)||!validId(row.id)||ids.has(row.id))fail('معرّفات العناصر مفقودة أو مكررة.');ids.add(row.id);return {id:row.id,...build(row)};});};
 const sections=rows('sections',40,row=>({title:text(row.title,180,'عنوان القسم',true),text:text(row.text,6000,'نص القسم',true)}));
 const faqs=rows('faqs',40,row=>({question:text(row.question,250,'السؤال',true),answer:text(row.answer,4000,'الإجابة',true)}));
 const team=rows('team',40,row=>{if(typeof row.isExample!=='boolean')fail('حالة بيانات الطاقم غير صالحة.');return {name:text(row.name,120,'اسم العضو',true),role:text(row.role,180,'مهمة العضو',true),bio:text(row.bio,1200,'نبذة العضو'),isExample:row.isExample};});
 if(input.updatedAt!==undefined&&(typeof input.updatedAt!=='string'||input.updatedAt.length>50||!Number.isFinite(Date.parse(input.updatedAt))))fail('تاريخ الصفحة غير صالح.');
 const value={id:input.id,slug,kind:input.kind,title:text(input.title,160,'عنوان الصفحة',true),description:text(input.description,600,'وصف الصفحة',true),summary:text(input.summary,1800,'ملخص الصفحة'),order:input.order,showInFooter:input.showInFooter,isPublished:input.isPublished!==false,sections,faqs,team,...(input.updatedAt?{updatedAt:input.updatedAt}:{})};
 if(JSON.stringify(value).length>40000)fail('محتوى الصفحة طويل جدًا؛ اختصره أو وزّعه على صفحات.');
 return value;
}

export function validateContentCatalog(pages){
 if(!Array.isArray(pages)||pages.length>30)throw new RequestValidationError('يمكن إدارة حتى 30 صفحة.');
 const ids=new Set(),slugs=new Set();
 const value=pages.map(input=>{const page=validateContentPage(input);if(ids.has(page.id)||slugs.has(page.slug))throw new RequestValidationError('رابط الصفحة أو معرّفها مستخدم بالفعل.',409);ids.add(page.id);slugs.add(page.slug);return page;});
 if(JSON.stringify(value).length>300000)throw new RequestValidationError('وصل محتوى الصفحات إلى الحجم المسموح.');
 return value.sort((a,b)=>a.order-b.order||a.title.localeCompare(b.title,'ar'));
}

export function resolveContentCatalog(rows=[]){
 const saved=rows.find(row=>row.key===CONTENT_PAGES_KEY);
 if(!saved)return validateContentCatalog(createDefaultContentPages(resolveSiteSettings(rows)));
 if(!saved.value||saved.value.version!==1||!Array.isArray(saved.value.pages))throw new RequestValidationError('تعذر قراءة محتوى الصفحات المحفوظ. لا تحفظ فوقه قبل مراجعته.',503);
 return validateContentCatalog(saved.value.pages); // Empty is authoritative: never resurrect deleted pages.
}

export function mutateContentCatalog(pages,action,input,role,now=new Date().toISOString()){
 if(!['admin','management'].includes(role))throw new RequestValidationError('غير مسموح بتعديل الصفحات.',403);
 let next=[...pages];
 if(action==='delete'){
  if(role!=='management')throw new RequestValidationError('حذف الصفحات متاح لحساب الإدارة فقط.',403);
  if(!validId(input?.id)||!next.some(page=>page.id===input.id))throw new RequestValidationError('الصفحة غير موجودة.',404);
  next=next.filter(page=>page.id!==input.id);
 }else if(action==='create'||action==='update'){
  const page={...validateContentPage(input),updatedAt:now};
  const index=next.findIndex(item=>item.id===page.id);
  if(action==='create'&&index!==-1)throw new RequestValidationError('الصفحة موجودة بالفعل.',409);
  if(action==='update'&&index===-1)throw new RequestValidationError('الصفحة غير موجودة.',404);
  if(action==='update'&&Object.hasOwn(builtInPages,next[index].slug)&&page.slug!==next[index].slug)throw new RequestValidationError('رابط الصفحة الأساسية ثابت؛ يمكنك تعديل محتواها أو حذفها.');
  if(index===-1)next.push(page);else next[index]=page;
 }else throw new RequestValidationError('عملية غير صالحة.');
 return validateContentCatalog(next);
}

export function contentPagesForSearch(pages){
 return pages.filter(page=>page.isPublished!==false).map(page=>({title:page.title,description:page.description,href:contentPagePath(page),keywords:[page.summary,...page.sections.flatMap(item=>[item.title,item.text]),...(page.kind==='faq'?page.faqs.flatMap(item=>[item.question,item.answer]):[]),...(page.kind==='about'?page.team.flatMap(item=>[item.name,item.role,item.bio]):[])].join(' ')}));
}

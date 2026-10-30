// School 967: 19 deterministic, educational scientific simulations.
// Results are approximations intended to teach direction and scale of effects.
// Do not use them for navigation, hazard prediction, medical or operational decisions.
const spec=(title,x,y,caveat,source)=>({title,x,y,caveat,source});
const v=(label,min,max,step,initial,unit='')=>({label,min,max,step,initial,unit});
const NASA='https://science.nasa.gov/solar-system/solar-system-facts/';
const NOAA='https://www.noaa.gov/jetstream/clouds/how-clouds-form';
const USGS='https://www.usgs.gov/programs/earthquake-hazards/science-earthquakes';
const UNIVERSE='https://science.nasa.gov/universe/';
export const SCIENCE_LABS=Object.freeze({
 'solar-sun':spec('طبقات الشمس ومصدر طاقتها',v('الطبقة: 0 اللب، 1 الإشعاعية، 2 الحمل، 3 سطح الضوء، 4 الكروموسفير، 5 الإكليل',0,5,1,1),null,
  'حرارات تقريبية متنوعة كثيرًا داخل كل طبقة. الإكليل أشد حرارة من الفوتوسفير، ولا يعني ذلك أن سطح الشمس كله بتلك الحرارة. لا تنظر للشمس مباشرة.', 'https://science.nasa.gov/sun/'),
 'solar-mission':spec('نافذة الانتقال الفضائي المثالي',v('اختر وجهة المهمة',0,7,1,3),v('نوع المعلومة: 0 انتقال مثالي، 1 سنة الكوكب',0,1,1,0),
  'انتقال هوهمان بين مدارين دائريين حول الشمس نموذج مثالي لا يحسب النوافذ أو المناورات أو الوقود أو الجاذبية متعددة الأجرام.',NASA),
 'cosmos-blackhole':spec('أفق حدث ثقب أسود وانحراف الضوء',v('كتلة الثقب الأسود',3,100,1,10,'كتلة شمسية'),v('أقرب مرور شعاع الضوء',10,100,5,30,'نصف قطر شفارتزشيلد'),
  'تقدير انحراف الضوء صالح فقط عندما يكون مرور الضوء بعيدًا نسبيًا عن الأفق (المجال الضعيف). ليس تتبع أشعة في النسبية العامة.', 'https://science.nasa.gov/universe/black-holes/'),
 'solar-scale':spec('مقارنة أحجام الكواكب ومسافاتها',v('ترتيب الكوكب من الشمس',0,7,1,2),v('نوع المقياس: 0 للقطر، 1 للمسافة',0,1,1,0),'القطر والمسافة معروضان كل على مقياس مستقل؛ الأبعاد والأرقام متوسطة تقريبية.',NASA),
 'solar-orbit':spec('المدار الإهليلجي وقانون كبلر',v('نصف المحور الأكبر',0.4,30,0.2,1,'AU'),v('الاختلاف المركزي',0,0.7,0.05,0.05),'العلاقة تفترض جسمًا صغيرًا يدور حول كتلة شمسية واحدة؛ الرسم ليس حساب انتقال مركبة.',NASA),
 'solar-seasons':spec('ميل المحور وطول النهار',v('ميل المحور',0,35,1,23,'°'),v('يوم السنة',1,365,1,172),'طول النهار التقديري محسوب عند خط عرض 35° شمالًا في مدار مبسط.',NASA),
 'solar-moon':spec('الأطوار واصطفاف الكسوف',v('زاوية طور القمر',0,360,15,180,'°'),v('ميل مدار القمر عن مستوى الكسوف',0,7,0.5,5,'°'),'الاصطفاف الهندسي توضيحي فقط؛ لا يمثل موعد كسوف أو خسوف حقيقي.',NASA),
 'solar-gravity':spec('الكتلة وقوة الوزن',v('كتلة الجسم',10,150,5,60,'كجم'),v('اختيار الجرم',0,8,1,2),'المعادلة W=mg تفترض تسارع جاذبية سطحيًا متوسطًا؛ للعمالقة الغازية لا توجد أرضية صلبة مماثلة للأرض.',NASA),
 'weather-atmosphere':spec('ارتفاع الهواء والضغط القياسي',v('الارتفاع عن سطح البحر',0,20,0.5,5,'كم'),v('درجة حرارة المرجع السطحي',-10,35,1,15,'°م'),'نموذج جوي قياسي مبسط، وليس قياسات طقس أو تنبؤًا حيًا.',NOAA),
 'weather-heat':spec('الإشعاع الشمسي والألبيدو',v('الإشعاع الوارد',0,1200,50,800,'واط/م²'),v('الألبيدو',0,0.9,0.05,0.25),'الممتص من الإشعاع لا يحدد حرارة السطح وحده؛ تحتاج الحرارة ميزانية طاقة كاملة.',NOAA),
 'weather-map':spec('خريطة ضغط جوية صناعية',v('ضغط مركز المنظومة',975,1045,5,995,'hPa'),v('ضغط المنطقة المحيطة',985,1045,5,1020,'hPa'),'لا تحسب سرعة الرياح أو تتنبأ بمسار جبهة؛ هذه ضغوط افتراضية فقط.',NOAA),
 'weather-moisture':spec('الرطوبة ونقطة الندى',v('حرارة الهواء',0,40,1,25,'°م'),v('الرطوبة النسبية',1,100,1,50,'%'),'حساب تقريبي لنقطة الندى (Magnus). التشبع شرط محتمل للتكاثف ولا يضمن سحبًا أو مطرًا.',NOAA),
 'weather-storm':spec('مؤشرات بيئة عاصفة مدارية',v('حرارة سطح البحر',20,34,0.5,28,'°م'),v('القص الرأسي للرياح',0,30,1,8,'م/ث'),'تصنيف نوعي تعليمي وليس احتمال تكوّن إعصار أو إنذارًا؛ عوامل جوية كثيرة أخرى لازمة.',NOAA),
 'earth-interior':spec('مقطع أعماق الأرض',v('عمق النقطة تحت السطح',0,6371,50,2900,'كم'),null,'الحدود تقريبية؛ تختلف سماكة القشرة وبنية الأرض حسب الموقع.',USGS),
 'earth-plates':spec('حركة الصفائح وحدودها',v('نوع الحدود: 0 تباعد، 1 تقارب، 2 تحويل',0,2,1,0),v('السرعة النسبية',1,10,1,5,'سم/سنة'),'إزاحة افتراضية إذا بقيت السرعة ثابتة مليون سنة؛ ليست توقعًا لزلزال أو ارتفاع جبل.',USGS),
 'earth-seismic':spec('وصول الموجات الزلزالية',v('المسافة إلى المحطة',0,1200,50,600,'كم'),v('سرعة موجة P الافتراضية',5,8,0.5,6,'كم/ث'),'تفترض سرعة ثابتة وS≈P/1.73؛ سرعات الموجات الواقعية تتغير مع العمق والصخور.',USGS),
 'earth-volcano':spec('الصهارة: التركيب والغاز',v('محتوى السيليكا التقريبي',45,75,1,55,'%'),v('مؤشر نسبي للغازات',0,100,5,40,'%'),'مؤشرات نوعية وليست لزوجة أو احتمالية انفجار محسوبة؛ حرارة الصهارة وبلوراتها عوامل أخرى.',USGS),
 'earth-rocks':spec('المسارات الممكنة لدورة الصخور',v('نوع الصخر: 0 ناري، 1 رسوبي، 2 متحول',0,2,1,0),v('عملية: 0 تجوية/ترسيب، 1 حرارة/ضغط، 2 انصهار/تبريد',0,2,1,0),'التحول مشروط بتتابع عمليات عديدة ووقت طويل؛ الأسهم مسارات محتملة لا إلزامية.',USGS),
 'cosmos-scale':spec('سُلّم المسافات في الكون',v('اختر مقياس جرم أو بنية كونية',0,5,1,1),null,'مسافات تقريبية للمقارنة. أطوال المجرات ليست أزمنة سفر الضوء إلينا؛ تمدد الكون يغير تفسير المسافات البعيدة.',UNIVERSE),
 'cosmos-stars':spec('كتلة النجم وحرارته',v('الكتلة الابتدائية التقريبية',0.5,30,0.5,1,'كتلة شمسية'),v('حرارة السطح المفترضة',3000,25000,500,5800,'كلفن'),'الكتلة والحرارة متغيران تعليميان منفصلان هنا؛ العمر تقريب على التسلسل الرئيسي ولا يتنبأ بالمصير بدقة.',UNIVERSE),
 'cosmos-transit':spec('منحنى عبور كوكب خارجي',v('نصف قطر الكوكب',1,15,1,5,'نصف قطر أرضي'),v('نصف قطر النجم',0.4,2,0.1,1,'نصف قطر شمسي'),'انخفاض السطوع مفترض بلا ضجيج رصدي ولا تعتيم حافة النجم، ويتطلب العبور اصطفافًا مناسبًا.', 'https://science.nasa.gov/exoplanets/whats-a-transit/'),
 'cosmos-expansion':spec('قانون هابل-لومتر المبسط',v('المسافة',10,300,10,100,'ميغابارسيك'),v('ثابت هابل المفترض',60,80,1,70,'كم/ث/Mpc'),'تقريب عند انزياحات حمراء صغيرة فقط؛ لا يستخدم للتنبؤ أو لحساب المسافات الكونية القصوى.',UNIVERSE)
});
export const SCIENCE_MODEL_IDS=Object.freeze(Object.keys(SCIENCE_LABS));
export const SOLAR_PLANETS=Object.freeze([
 {name:'عطارد',diameter:4879,au:0.387,g:3.7},
 {name:'الزهرة',diameter:12104,au:0.723,g:8.87},
 {name:'الأرض',diameter:12742,au:1,g:9.81},
 {name:'المريخ',diameter:6779,au:1.524,g:3.71},
 {name:'المشتري',diameter:139820,au:5.204,g:24.79},
 {name:'زحل',diameter:116460,au:9.58,g:10.44},
 {name:'أورانوس',diameter:50724,au:19.2,g:8.69},
 {name:'نبتون',diameter:49244,au:30.07,g:11.15}
]);
const M=(label,num,unit='',digits=2)=>({label,num,value:Number(num.toFixed(digits)),unit});
const describe=(metrics,text,ratio,scene)=>({metrics,text,ratio:Math.max(0,Math.min(1,ratio)),scene,primary:metrics[0].num});
const round=(n,d=2)=>Number(n.toFixed(d));
export function calculateScienceLab(model,input={}){
 const config=SCIENCE_LABS[model];
 if(!config)throw Error('نموذج علمي غير معروف.');
 const x=Number(input.x??config.x.initial),y=Number(input.y??config.y?.initial??0);
 const valid=(n,c)=>Number.isFinite(n)&&n>=c.min&&n<=c.max+1e-9;
 if(!valid(x,config.x)||(config.y&&!valid(y,config.y)))throw Error('مدخلات خارج نطاق النموذج.');
 switch(model){
 case 'solar-sun':{
  const layers=['اللب','منطقة الانتقال الإشعاعي','منطقة الحمل','الفوتوسفير','الكروموسفير','الإكليل'],
   temperatures=[15000000,2000000,100000,5800,10000,1000000],
   ix=Math.round(x),temp=temperatures[ix];
  return describe([M('درجة حرارة مرجعية تقريبية',temp,'كلفن',0),M('ترتيب الطبقة من الداخل',ix+1,'',0)],
   layers[ix]+'. تنطلق الطاقة من اندماج الهيدروجين في اللب، وتنتقل عبر الشمس إلى الطبقات المرئية.',
   (ix+1)/6,'sun');
 }
 case 'solar-mission':{
  const planet=SOLAR_PLANETS[Math.round(x)],a=planet.au;
  const transfer=365.25*0.5*Math.sqrt(Math.pow((1+a)/2,3)),year=365.25*Math.sqrt(a*a*a);
  return describe([M(Math.round(y)===0?'مدة انتقال هوهمان مثالية':'مدة السنة المدارية',Math.round(y)===0?transfer:year,'يوم أرضي',1),
   M('البعد المداري المتوسط',a,'AU',3)],'الوجهة '+planet.name+'. الزمن المثالي ليس زمن مهمة فعلية ولا يحدد موعد إطلاق.',
   Math.min(1,a/30),'mission');
 }
 case 'cosmos-blackhole':{
  const rs=2.953*x,deflection=2/y*180/Math.PI;
  return describe([M('نصف قطر أفق الحدث التقريبي',rs,'كم',1),M('نصف قطر مدار الفوتونات',1.5*rs,'كم',1),
   M('انحراف تقريبي في المجال الضعيف',deflection,'درجة',2)],
   'الانحراف تقدير بعيد نسبيًا عن الثقب الأسود، وليس خريطة دقيقة لأشعة قرب أفق الحدث.',
   Math.min(1,rs/300),'blackhole');
 }
 case 'solar-scale':{
  const planet=SOLAR_PLANETS[Math.round(x)],distance=Math.round(y)===1;
  const primary=distance?planet.au:planet.diameter/12742;
  return describe([M(distance?'المسافة المتوسطة عن الشمس':'القطر مقارنة بالأرض',primary,distance?'AU':'مرة',3),
   M('القطر التقريبي',planet.diameter,'كم',0),M('المسافة الفلكية',planet.au,'AU',3)],
   planet.name+' — '+(distance?'القيم مسافات متوسطة، لا مواضع لحظية.':'الأقطار النسبية لا تُرسم بمقياس المسافات.'),distance?planet.au/31:Math.sqrt(planet.diameter/139820),'planet');
 }
 case 'solar-orbit':{
  const period=Math.sqrt(x*x*x),peri=x*(1-y),apo=x*(1+y);
  return describe([M('الفترة المدارية التقريبية',period,'سنة أرضية',2),M('الحضيض',peri,'AU'),M('الأوج',apo,'AU')], 'مدار إهليلجي: الشمس في إحدى البؤرتين، والفترة وفق قانون كبلر.',Math.min(1,period/165),'orbit');
 }
 case 'solar-seasons':{
  const decl=x*Math.sin(2*Math.PI*(y-80)/365);
  const latitude=35*Math.PI/180,d=decl*Math.PI/180;
  const omega=Math.acos(Math.max(-1,Math.min(1,-Math.tan(latitude)*Math.tan(d))));
  const day=24*omega/Math.PI;
  return describe([M('طول النهار عند 35° شمالًا',day,'ساعة'),M('ميل الشمس التقريبي',decl,'درجة')], 'تتعاكس الفصول في نصفي الأرض، وليس السبب الرئيسي تغيّر البعد عن الشمس.',day/24,'seasons');
 }
 case 'solar-moon':{
  const phase=((x%360)+360)%360,illum=(1-Math.cos(phase*Math.PI/180))*50;
  const newMoon=Math.min(phase,360-phase)<=15,full=Math.abs(phase-180)<=15;
  const aligned=y<=1.5&&(newMoon||full);
  return describe([M('الجزء المضاء المرئي',illum,'%'),M('بعد الميل عن المستوى',y,'°')],aligned?
   'اصطفاف هندسي مساعد لاحتمال الكسوف/الخسوف، وليس موعدًا حقيقيًا.':
   (newMoon?'نحو المحاق: نرى جزءًا مضاء ضئيلًا من القمر، لكن المحاق لا يضمن الكسوف.':full?'نحو البدر: نرى معظم نصف القمر المضاء، لكن البدر لا يضمن الخسوف.':'طور بين المحاق والبدر؛ الأطوار العادية لا تسببها ظلال الأرض.'),illum/100,'moon');
 }
 case 'solar-gravity':{
  const selected=Math.round(y),g=selected===8?1.62:SOLAR_PLANETS[selected].g;
  return describe([M('قوة الوزن',x*g,'نيوتن'),M('الكتلة ثابتة',x,'كجم',0),M('الجاذبية',g,'م/ث²')],
   'تظل الكتلة نفسها؛ يتغير الوزن بحسب جاذبية الجرم. '+(selected===8?'القمر':SOLAR_PLANETS[selected].name),
   Math.min(1,g/25),'gravity');
 }
 case 'weather-atmosphere':{
  const z=Math.min(11,x),p11=1013.25*Math.pow(1-0.0065*11000/288.15,5.255);
  const pressure=x<=11?1013.25*Math.pow(1-0.0065*x*1000/288.15,5.255):p11*Math.exp(-(x-11)/6.34);
  const T=y-6.5*z;
  return describe([M('الضغط التقريبي',pressure,'hPa',1),M('الحرارة النموذجية',T,'°م',1)],
  'الضغط ينخفض مع الارتفاع. تغير طبقات الغلاف فوق التروبوسفير لا يتبع هذا التدرج دائمًا.',pressure/1013.25,'atmosphere');
 }
 case 'weather-heat':{
  const absorb=x*(1-y),refl=x*y;
  return describe([M('الإشعاع الممتص',absorb,'واط/م²',0),M('الإشعاع المنعكس',refl,'واط/م²',0),M('الألبيدو',100*y,'%')],
   'تغير الألبيدو يغيّر نسبة الطاقة الممتصة ولا يعطي درجة حرارة سطح مؤكدة.',absorb/1200,'heat');
 }
 case 'weather-map':{
  const delta=y-x,low=delta>0;
  return describe([M('فرق الضغط (المحيط − المركز)',delta,'hPa',0),M('ضغط المركز',x,'hPa',0),M('ضغط المحيط',y,'hPa',0)],
   low?'المركز منخفض نسبيًا. اتجاه الرياح الفعلي يعتمد على كوريوليس والاحتكاك.':
   delta<0?'المركز مرتفع نسبيًا. الرسم ليس خريطة حقيقية.':'لا يوجد تدرج بين المركز والمحيط في هذا المثال.',
   (delta+60)/120,'pressure');
 }
 case 'weather-moisture':{
  const a=17.625,b=243.04,alpha=Math.log(y/100)+(a*x)/(b+x),dew=b*alpha/(a-alpha);
  return describe([M('نقطة الندى التقريبية',dew,'°م',1),M('حرارة الهواء',x,'°م'),M('الرطوبة النسبية',y,'%')],
   y>=100?'الهواء مشبع في الحساب؛ يتطلب التكاثف عادة نوى مناسبة.':
   'الهواء دون التشبع؛ اقتراب نقطة الندى من الحرارة يعني زيادة الرطوبة النسبية.',y/100,'moisture');
 }
 case 'weather-storm':{
  const favorable=x>=26.5&&y<=10;const index=Math.max(0,Math.min(100,50+(x-26.5)*4-y*2));
  return describe([M('مؤشر تعليمي للملاءمة',index,'نقطة',0),M('حرارة البحر',x,'°م'),M('القص الرأسي',y,'م/ث')],
   favorable?'العاملان ملائمان نسبيًا، لكنهما لا يكفيان لتكوّن عاصفة مدارية.':
   'أحد العاملين قد يعيق التطور في هذا النموذج؛ بقية الغلاف الجوي غير ممثلة.',index/100,'storm');
 }
 case 'earth-interior':{
  const layer=x<35?'القشرة':x<2900?'الوشاح':x<5150?'اللب الخارجي السائل':'اللب الداخلي الصلب';
  const code=x<35?0:x<2900?1:x<5150?2:3;
  return describe([M('العمق المختار',x,'كم',0),M('رقم الطبقة في المقطع',code+1,'',0)],
    'الطبقة التقريبية: '+layer+'. القشرة ليست بالسماكة نفسها في كل المناطق.',x/6371,'interior');
 }
 case 'earth-plates':{
  const kind=['تباعد','تقارب','تحويل'][Math.round(x)],distance=y*10;
  return describe([M('إزاحة نسبية خلال مليون سنة',distance,'كم',0),M('السرعة المفترضة',y,'سم/سنة',0)],
   kind==='تباعد'?'تباعد الصفائح قد يولد قشرة محيطية جديدة.':
   kind==='تقارب'?'التقارب قد يسبب اندساسًا أو رفع جبال حسب أنواع الصفائح.':
   'الانزلاق التحويلي أفقي وقد يرتبط بزلازل؛ لا يحدد النموذج مواعيدها.',
   distance/100,'plates');
 }
 case 'earth-seismic':{
  const pTime=x/y,sSpeed=y/1.73,sTime=x/sSpeed;
  return describe([M('وصول موجة P',pTime,'ثانية'),M('وصول موجة S',sTime,'ثانية'),M('فرق الوصول',sTime-pTime,'ثانية')],
   'موجة P أسرع في هذا المثال، وموجة S لا تعبر السوائل؛ السرعات الافتراضية ليست جدولًا زلزاليًا فعليًا.',Math.min(1,(sTime-pTime)/130),'seismic');
 }
 case 'earth-volcano':{
  const viscosity=Math.max(0,Math.min(100,((x-45)/30)*100)),index=round(0.6*viscosity+0.4*y,0);
  return describe([M('مؤشر نوعي لزوجة',viscosity,'من 100',0),M('مؤشر بصري مركب',index,'من 100',0)],
   'الأرقام مؤشر رسم تعليمي وليست قيمة لزوجة أو احتمال انفجار مقاس؛ للحرارة والغازات عوامل إضافية.',index/100,'volcano');
 }
 case 'earth-rocks':{
  const rock=['صخر ناري','صخر رسوبي','صخر متحول'][Math.round(x)],
   process=['التجوية ثم النقل والترسيب والتحجر','الحرارة والضغط دون انصهار','الانصهار ثم التبريد'][Math.round(y)],
   target=['رسوبي محتمل','متحول محتمل','ناري محتمل'][Math.round(y)];
  return describe([M('نوع الصخر المختار',x+1,'',0),M('نوع العملية المختارة',y+1,'',0)],
   rock+' ← '+process+' ← '+target+'. كل سهم قد يتطلب مراحل وشروطًا إضافية.',(y+1)/3,'rocks');
 }
 case 'cosmos-scale':{
  const points=[
   {name:'القمر — المسافة إلى الأرض',ly:1.28/(365.25*86400)},
   {name:'الشمس — المسافة إلى الأرض',ly:499/(365.25*86400)},
   {name:'بروكسيما قنطورس — البعد',ly:4.24},
   {name:'قرص درب التبانة — القطر',ly:100000},
   {name:'مجرة المرأة المسلسلة — البعد',ly:2500000},
   {name:'نصف قطر الكون المرصود الحالي',ly:46000000000}
  ];
  const selected=points[Math.round(x)];
  return describe([M('الطول بالسنة الضوئية',selected.ly,'سنة ضوئية',6),
   M('الطول بالكيلومتر',selected.ly*9.4607e12,'كم',0)],
   selected.name+'. هذه أطوال للمقارنة؛ قطر مجرة أو نصف قطر الكون ليس زمن ضوء وصل إلينا مباشرة.',
   Math.log10(selected.ly*31557600+1)/Math.log10(46000000000*31557600+1),'cosmic-scale');
 }
 case 'cosmos-stars':{
  const lifetime=Math.max(0.006,10*Math.pow(x,-2.5)),category=x<8?'مسار نجم أقل كتلة: قزم أبيض محتمل':'نجم ضخم: انهيار لب محتمل';
  const hue=y<3700?'أحمر':y<5200?'برتقالي':y<7500?'أبيض مصفر':'أبيض مزرق';
  return describe([M('عمر رئيسي تقريبي',lifetime,'مليار سنة',3),M('حرارة السطح المفترضة',y,'كلفن',0),M('الكتلة',x,'كتلة شمسية')],
   category+'؛ اللون الحراري التقريبي: '+hue+'. ليست هذه وصفة مؤكدة لمصير النجم.',Math.min(1,y/25000),'star');
 }
 case 'cosmos-transit':{
  const depth=Math.pow(x*6371/(y*696340),2)*100;
  return describe([M('انخفاض السطوع النسبي',depth,'%',4),M('نصف قطر الكوكب',x,'نصف قطر أرضي',0),M('نصف قطر النجم',y,'نصف قطر شمسي')],
   'عمق افتراضي لعبور مركزي مثالي؛ لا يتضمن بقعًا أو ضجيجًا أو تعتيم حافة النجم.',Math.min(1,depth/1.3),'transit');
 }
 case 'cosmos-expansion':{
  const speed=x*y,redshift=speed/299792;
  return describe([M('سرعة التباعد التقريبية',speed,'كم/ث',0),M('انزياح منخفض تقديري',redshift,'z',4)],
   'قانون هابل-لومتر هنا للتقريب المحلي فقط؛ لا يصف سرعة جسم داخل مجرة مرتبطة جاذبيًا.',speed/24000,'expansion');
 }
 }
 throw Error('نموذج غير مدعوم.');
}

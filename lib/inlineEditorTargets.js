// Public route metadata only. Permissions are always checked by the server.
export const inlineTargetKinds = Object.freeze({
  issue:{tab:'issues',label:'العدد'},work:{tab:'works',label:'العمل الإعلامي'},
  company:{tab:'companies',label:'المنشأة'},professional:{tab:'professionals',label:'الملف المهني'},
  figure:{tab:'figures',label:'الشخصية'},page:{tab:'pages',label:'الصفحة'},
  statistic:{tab:'statistics',label:'المؤشر الإحصائي',advanced:true},
  university:{tab:'universities',label:'المؤسسة التعليمية',advanced:true},
  medical_center:{tab:'medicalCenters',label:'المنشأة الطبية',advanced:true},
  ranking:{tab:'rankings',label:'مؤشر الترتيب',advanced:true},
  governorate:{tab:'map',label:'المحافظة'},district:{tab:'map',label:'المديرية',advanced:true},
  debate:{tab:'debates',label:'المناظرة'},
});
const safeId = value => typeof value==='string' && /^[a-zA-Z0-9_-]{1,120}$/.test(value);
export function canEditInlineTarget(target){
  return Boolean(target&&!target.isDemo&&inlineTargetKinds[target.kind]&&(safeId(target.id)||target.kind==='page'&&safeId(target.slug)));
}
export function inlineAdminHref(target){
  const config=inlineTargetKinds[target?.kind];if(!config)return '/admin';
  const query=new URLSearchParams();
  if(target.kind==='debate'){if(safeId(target.id))query.set('debate',target.id);return '/admin/debates'+(query.size?'?'+query:'');}
  query.set('tab',config.tab);if(safeId(target.id||target.slug))query.set('item',target.id||target.slug);
  if(['governorate','district'].includes(target.kind))query.set('region',target.kind);
  return '/admin?'+query;
}
export function createInlineTarget(input){
  if(!inlineTargetKinds[input?.kind])return null;
  const {kind}=input,id=safeId(input.id)?input.id:undefined,slug=safeId(input.slug)?input.slug:undefined;
  const href=typeof input.href==='string'&&/^\/(?!\/)/.test(input.href)&&!/[\\\u0000-\u001f]/.test(input.href)?input.href:'/';
  return {kind,...(id?{id}:{}),...(slug?{slug}:{}),title:String(input.title||inlineTargetKinds[kind].label).slice(0,250),href,adminHref:inlineAdminHref({kind,id,slug}),advanced:Boolean(inlineTargetKinds[kind].advanced),...(input.isDemo?{isDemo:true}:{})};
}
export function resolveInlineTarget(pathname,searchParams){
  const parts=String(pathname||'/').split('/').filter(Boolean);let slug;try{slug=parts[parts.length-1]?decodeURIComponent(parts[parts.length-1]):undefined;}catch{return null;}
  const routes={magazine:'issue',works:'work','yemeni-products':'company',professionals:'professional',universities:'university','medical-centers':'medical_center',debates:'debate'};
  if(parts.length===2&&routes[parts[0]])return createInlineTarget({kind:routes[parts[0]],slug,href:pathname});
  if((parts.length===2&&parts[0]==='yemeni-figures')||(parts.length===3&&parts[0]==='yemen-map'&&parts[1]==='figures'))return createInlineTarget({kind:'figure',slug,href:pathname});
  if(parts.length===3&&parts[0]==='yemen-in-numbers'&&parts[1]==='indicator')return createInlineTarget({kind:'statistic',slug,href:pathname});
  if((parts.length===1&&['about','help','privacy','terms','privacy-requests'].includes(parts[0]))||(parts.length===2&&parts[0]==='pages'))return createInlineTarget({kind:'page',slug,href:pathname});
  if(pathname==='/yemen-ranking')return createInlineTarget({kind:'ranking',slug:searchParams?.get?.('indicator')||undefined,href:pathname});
  return null;
}
export const inlineAdminTabs=new Set(Object.values(inlineTargetKinds).map(value=>value.tab).filter(value=>value!=='debates'));

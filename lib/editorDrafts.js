import {RequestValidationError} from './requestSecurity.js';
export const EDITOR_DRAFT_KINDS=['issue','work','company','professional','figure','statistic','statistic_source','statistic_values','ranking','page','settings','governorate','district','message'];
export function serializeEditorValue(value) {
  return JSON.stringify(value??null,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
}
export function validateEditorDraft(input) {
  if(!input||!EDITOR_DRAFT_KINDS.includes(input.kind)||typeof input.key!=='string'||!/^[-a-zA-Z0-9_:]{1,160}$/.test(input.key)||!input.value||typeof input.value!=='object'||Array.isArray(input.value)||JSON.stringify(input.value).length>220000)throw new RequestValidationError('المسودة غير صالحة أو تتجاوز الحجم المسموح.');
  return {kind:input.kind,key:input.key,value:input.value};
}

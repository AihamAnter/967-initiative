import {formatNumber,formatYear} from './format.js';

export const dataStatusHelp = {
  complete:'سلسلة موسومة بالمكتملة؛ راجع نطاق السنوات والمصدر قبل المقارنة.',
  partial:'السلسلة المتاحة جزئية؛ لا تعني الشارة نسبة تغير في القيمة.',
  limited:'البيانات المتاحة محدودة؛ تجنّب تعميم القيمة على سنوات غير منشورة.',
  discontinued:'توقف تحديث السلسلة؛ القيمة المعروضة تخص سنة القياس الظاهرة.',
};

export function indicatorReading(indicator) {
  const value=indicator.latestValue;
  if(!value)return 'لا توجد قيمة معتمدة للعرض حالياً. راجع حالة المصدر قبل الاستشهاد بالمؤشر.';
  const years=new Set(indicator.values.map(item=>item.year)).size;
  return `${formatNumber(value.value,{maximumFractionDigits:2})} ${indicator.unit} في ${formatYear(value.year)} على مستوى اليمن. ${value.value_status==='estimated'?'القيمة تقديرية. ':''}${years<2?'تتوفر سنة واحدة؛ لا يمكن استنتاج اتجاه زمني.':'قارن السنوات المتاحة فقط؛ الفجوات تعني غياب بيانات.'}`;
}

export function sourceLabel(source,indicatorName) {
  if(!source)return 'المصدر قيد التوثيق';
  if(source.name&&source.name!==indicatorName)return source.name;
  try{return new URL(source.url).hostname.replace(/^www\./,'');}catch{return source.name||'المصدر قيد التوثيق';}
}

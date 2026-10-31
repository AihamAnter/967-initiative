// School 967 hands-on evidence is formative: server checks objective actions,
// but never assigns points for political views or model preferences.
import {CIVIC_LABS,calculateCivicLab} from './schoolCivicModels.js';
import {civicNumbers,getCivicActivity} from './schoolCivicActivities.js';
import {SCIENCE_LABS,calculateScienceLab} from './schoolScienceModels.js';

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const changedMetric=(before,after)=>after?.some((row,i)=>finite(row?.[1])&&
 finite(before?.[i]?.[1])&&Math.abs(row[1]-before[i][1])>0.000001);
const axisValid=(axis,value)=>axis&&finite(value)&&value>=axis.min&&value<=axis.max&&
 Math.abs((value-axis.min)/axis.step-Math.round((value-axis.min)/axis.step))<0.00001;

export function labObservationChoices(before,after){
 if(!finite(before)||!finite(after)||Math.abs(before-after)<0.000001)return [];
 const round=n=>Number(n.toFixed(5));
 const diff=after-before;
 let options=[round(after),round(before),round(after+Math.sign(diff)*Math.max(Math.abs(diff),Math.abs(after)*.1,1))];
 if(new Set(options).size<3)options=[round(after),round(before),round(after+Math.sign(diff||1)*Math.max(Math.abs(diff)*2,2))];
 return [...new Set(options)].sort((a,b)=>a-b);
}
export function checkCivicLabEvidence(activity,proof){
 if(!activity||!proof||proof.kind!==activity.kind)return false;
 if(activity.kind==='case')
  return Number.isInteger(activity.correctIndex)&&proof.selection===activity.correctIndex;
 if(activity.kind==='paths')
  return Array.isArray(proof.visited)&&proof.visited.length===activity.choices.length&&
   new Set(proof.visited).size===activity.choices.length&&
   proof.visited.every(i=>Number.isInteger(i)&&i>=0&&i<activity.choices.length);
 if(activity.kind==='steps')
  return Array.isArray(proof.order)&&proof.order.length===activity.steps.length&&
   proof.order.every((i,j)=>i===j);
 if(activity.kind==='numbers'){
  if(!axisValid(activity.x,proof.x)||!axisValid(activity.y,proof.y))return false;
  let before,after;
  try{
   before=civicNumbers(activity,activity.x.initial,activity.y.initial);
   after=civicNumbers(activity,proof.x,proof.y);
  }catch{return false;}
  if(before.error||after.error||!changedMetric(before.metrics,after.metrics))return false;
  const i=proof.metricIndex;
  return Number.isInteger(i)&&i>=0&&i<after.metrics.length&&
    finite(after.metrics[i]?.[1])&&finite(before.metrics[i]?.[1])&&
    Math.abs(after.metrics[i][1]-before.metrics[i][1])>0.000001&&
    finite(proof.observed)&&Math.abs(proof.observed-after.metrics[i][1])<0.000001;
 }
 return false;
}
export function checkScienceLabEvidence(model,proof){
 const config=SCIENCE_LABS[model];
 if(!config||proof?.kind!=='science')return false;
 if(!axisValid(config.x,proof.x))return false;
 if(config.y?!axisValid(config.y,proof.y):proof.y!==undefined&&proof.y!==null)return false;
 let before,after;
 try{
  before=calculateScienceLab(model,{x:config.x.initial,y:config.y?.initial});
  after=calculateScienceLab(model,{x:proof.x,y:config.y?proof.y:undefined});
 }catch{return false;}
 if(!after?.metrics||!before?.metrics)return false;
 const i=proof.metricIndex;
 const a=after.metrics[i]?.num,b=before.metrics[i]?.num;
 return Number.isInteger(i)&&i>=0&&i<after.metrics.length&&finite(a)&&finite(b)&&
  Math.abs(a-b)>0.000001&&finite(proof.observed)&&
  Math.abs(a-proof.observed)<Math.max(0.000001,Math.abs(a)*1e-10);
}
export function checkGenericCivicEvidence(model,proof){
 const config=CIVIC_LABS[model];
 if(!config||proof?.kind!=='model'||!axisValid(config.x,proof.x)||!axisValid(config.y,proof.y))return false;
 try{
  const before=calculateCivicLab(model,{x:config.x.initial,y:config.y.initial});
  const after=calculateCivicLab(model,{x:proof.x,y:proof.y});
  return JSON.stringify(before.rows)!==JSON.stringify(after.rows);
 }catch{return false;}
}
export function schoolRequiresLabEvidence(lab){
 return lab?.kind==='science'||lab?.kind==='civic';
}
export function verifySchoolLabEvidence(lab,slug,index,proof){
 if(!schoolRequiresLabEvidence(lab))return true;
 if(lab.kind==='science')return checkScienceLabEvidence(lab.model,proof);
 const activity=lab.activity||getCivicActivity(slug,index);
 if(activity)return checkCivicLabEvidence(activity,proof);
 return checkGenericCivicEvidence(lab.model,proof);
}

import {isSameOrigin,readJsonObject,RequestValidationError} from './requestSecurity.js';
import {recordOperationalEvent} from './operationalEvents.js';
export function createTelemetryHandler({log=recordOperationalEvent,now=Date.now}={}){
 let start=now(),count=0;
 return async function POST(request){
  if(!isSameOrigin(request))return new Response(null,{status:403});
  try{
   const body=await readJsonObject(request,800);
   if(!['client_error','api_failure','slow_response'].includes(body.event)||typeof body.route!=='string'||body.route.length>250)return new Response(null,{status:400});
   if(now()-start>=60000){count=0;start=now();}
   if(count++<60)log(body.event,{source:'client',route:body.route,kind:body.kind,status:body.status,durationMs:body.durationMs});
   return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
  }catch(error){return new Response(null,{status:error instanceof RequestValidationError?error.status:400});}
 };
}

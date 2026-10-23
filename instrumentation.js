import {recordOperationalEvent} from './lib/operationalEvents';
// Next 15's request hook also covers failures before a route can render its UI.
export function onRequestError(_error,_request,context){
 recordOperationalEvent('request_error',{source:context.routeType==='route'?'api':'page',route:context.routePath,status:500});
}

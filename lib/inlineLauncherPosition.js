// Preserve the launcher's location as relative viewport coordinates. This
// keeps saved positions on-screen when a phone rotates or its viewport changes.
export const INLINE_LAUNCHER_HOLD_MS=450;
export const INLINE_LAUNCHER_SLOP_PX=12;
export const INLINE_LAUNCHER_MARGIN=8;
export const INLINE_LAUNCHER_MOBILE_WIDTH=760;

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const limit=(value,low,high)=>Math.min(high,Math.max(low,value));

export function launcherStorageKey(accountId){
 return '967:inline-launcher-position:'+accountId;
}
export function clampLauncherPoint(x,y,width,height,viewportWidth,viewportHeight){
 const margin=INLINE_LAUNCHER_MARGIN;
 const maxX=Math.max(margin,viewportWidth-width-margin);
 const maxY=Math.max(margin,viewportHeight-height-margin);
 return {
  x:limit(finite(x)?x:margin,margin,maxX),
  y:limit(finite(y)?y:margin,margin,maxY)
 };
}
export function serializeLauncherPoint(point,width,height,viewportWidth,viewportHeight){
 const bounded=clampLauncherPoint(point.x,point.y,width,height,viewportWidth,viewportHeight);
 const spanX=Math.max(1,viewportWidth-width-INLINE_LAUNCHER_MARGIN*2);
 const spanY=Math.max(1,viewportHeight-height-INLINE_LAUNCHER_MARGIN*2);
 return {
  x:limit((bounded.x-INLINE_LAUNCHER_MARGIN)/spanX,0,1),
  y:limit((bounded.y-INLINE_LAUNCHER_MARGIN)/spanY,0,1)
 };
}
export function restoreLauncherPoint(value,width,height,viewportWidth,viewportHeight){
 if(!value||!finite(value.x)||!finite(value.y)||value.x<0||value.x>1||value.y<0||value.y>1)return null;
 const margin=INLINE_LAUNCHER_MARGIN;
 return clampLauncherPoint(
  margin+value.x*Math.max(0,viewportWidth-width-margin*2),
  margin+value.y*Math.max(0,viewportHeight-height-margin*2),
  width,height,viewportWidth,viewportHeight
 );
}

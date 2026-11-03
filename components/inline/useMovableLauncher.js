'use client';
import {useEffect,useRef,useState} from 'react';
import {clampLauncherPoint,serializeLauncherPoint,restoreLauncherPoint,launcherStorageKey,INLINE_LAUNCHER_HOLD_MS,INLINE_LAUNCHER_SLOP_PX,INLINE_LAUNCHER_MOBILE_WIDTH} from '@/lib/inlineLauncherPosition';

// The button still responds to a short tap. Only a deliberate long press
// activates drag, and that gesture never toggles editor mode.
export default function useMovableLauncher(accountId,elementRef,onDragStart){
 const [position,setPosition]=useState(null);
 const [dragging,setDragging]=useState(false);
 const positionRef=useRef(null),pressRef=useRef(null),holdTimerRef=useRef(null),ignoreClickRef=useRef(false);
 const onDragStartRef=useRef(onDragStart);
 onDragStartRef.current=onDragStart;
 const key=accountId?launcherStorageKey(accountId):null;

 const clearHold=()=>{if(holdTimerRef.current!==null){window.clearTimeout(holdTimerRef.current);holdTimerRef.current=null;}};
 const updatePosition=point=>{positionRef.current=point;setPosition(point);};
 const bounds=()=>({width:window.innerWidth,height:window.innerHeight});

 useEffect(()=>{
  if(!key){positionRef.current=null;setPosition(null);return;}
  const restore=()=>{
   if(window.innerWidth>INLINE_LAUNCHER_MOBILE_WIDTH){positionRef.current=null;setPosition(null);return;}
   let saved=null;
   try{saved=JSON.parse(window.localStorage.getItem(key));}catch{}
   const rect=elementRef.current?.getBoundingClientRect();
   if(!rect)return;
   const result=restoreLauncherPoint(saved,rect.width,rect.height,window.innerWidth,window.innerHeight);
   positionRef.current=result;
   setPosition(result);
  };
  restore();
  window.addEventListener('resize',restore);
  return()=>{window.removeEventListener('resize',restore);clearHold();pressRef.current=null;};
 },[key,elementRef]);

 const savePoint=(point,width,height)=>{
  const viewport=bounds();
  const bounded=clampLauncherPoint(point.x,point.y,width,height,viewport.width,viewport.height);
  updatePosition(bounded);
  if(key){
   try{window.localStorage.setItem(key,JSON.stringify(serializeLauncherPoint(bounded,width,height,viewport.width,viewport.height)));}catch{}
  }
 };

 const onPointerDown=event=>{
  if(!key||window.innerWidth>INLINE_LAUNCHER_MOBILE_WIDTH||event.button!==0||event.isPrimary===false)return;
  clearHold();
  ignoreClickRef.current=false;
  const rect=event.currentTarget.getBoundingClientRect();
  pressRef.current={
   id:event.pointerId,startX:event.clientX,startY:event.clientY,
   left:rect.left,top:rect.top,width:rect.width,height:rect.height,
   previous:positionRef.current,active:false
  };
  try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}
  holdTimerRef.current=window.setTimeout(()=>{
   const press=pressRef.current;
   if(!press||press.id!==event.pointerId)return;
   press.active=true;
   ignoreClickRef.current=true;
   setDragging(true);
   onDragStartRef.current?.();
  },INLINE_LAUNCHER_HOLD_MS);
 };
 const onPointerMove=event=>{
  const press=pressRef.current;
  if(!press||press.id!==event.pointerId)return;
  const dx=event.clientX-press.startX,dy=event.clientY-press.startY;
  if(!press.active){
   if(Math.hypot(dx,dy)>INLINE_LAUNCHER_SLOP_PX)clearHold();
   return;
  }
  event.preventDefault();
  const viewport=bounds();
  updatePosition(clampLauncherPoint(press.left+dx,press.top+dy,press.width,press.height,viewport.width,viewport.height));
 };
 const finish=(event,cancel=false)=>{
  const press=pressRef.current;
  if(!press||press.id!==event.pointerId)return;
  clearHold();
  if(press.active){
   ignoreClickRef.current=true;
   if(cancel)updatePosition(press.previous);
   else{
    const viewport=bounds();
    const point=clampLauncherPoint(press.left+event.clientX-press.startX,press.top+event.clientY-press.startY,press.width,press.height,viewport.width,viewport.height);
    savePoint(point,press.width,press.height);
   }
   setDragging(false);
  }
  pressRef.current=null;
  try{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}catch{}
 };
 const onKeyDown=event=>{
  if(!key||window.innerWidth>INLINE_LAUNCHER_MOBILE_WIDTH||!event.altKey)return;
  const shifts={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]};
  const delta=shifts[event.key];
  if(!delta)return;
  event.preventDefault();
  const rect=event.currentTarget.getBoundingClientRect();
  savePoint({x:rect.left+delta[0],y:rect.top+delta[1]},rect.width,rect.height);
 };
 const resetPosition=()=>{
  clearHold();pressRef.current=null;setDragging(false);
  if(key){try{window.localStorage.removeItem(key);}catch{}}
  updatePosition(null);
 };
 const consumeDragClick=()=>{
  if(!ignoreClickRef.current)return false;
  ignoreClickRef.current=false;
  return true;
 };
 return {
  dragging,resetPosition,consumeDragClick,
  positionStyle:position?{left:position.x,top:position.y,right:'auto',bottom:'auto',insetInlineEnd:'auto',insetInlineStart:'auto'}:undefined,
  dragHandlers:{onPointerDown,onPointerMove,onPointerUp:event=>finish(event),onPointerCancel:event=>finish(event,true),onContextMenu:event=>{if(pressRef.current)event.preventDefault();},onKeyDown}
 };
}

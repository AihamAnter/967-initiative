// One line sends on keyboard-equipped desktop browsers. Composition and
// modified Enter keys stay in the input so Arabic IME text is not cut off.
export function shouldSendComposerEnter(event,compact=false){
 return event?.key==='Enter'&&!compact&&!event.shiftKey&&!event.ctrlKey&&
  !event.altKey&&!event.metaKey&&!event.repeat&&
  !event.isComposing&&!event.nativeEvent?.isComposing&&
  event.keyCode!==229;
}

export function composerHeight(scrollHeight,viewportHeight,threadHeight){
 const limit=Math.max(48,Math.min(440,viewportHeight*0.45,threadHeight*0.58));
 return {height:Math.min(scrollHeight,limit),overflow:scrollHeight>limit?'auto':'hidden'};
}

// Keep notification decisions separate from browser audio side effects.
// The timestamp comes from the latest *incoming unread* message, not a request
// or a message sent by the current user.
export function advanceMessageAlert(previous,summary,pathname=''){
 const time=Date.parse(summary?.latest_incoming_unread_at||'');
 const latest=Number.isFinite(time)?time:0;
 const last=previous?.latest||0;
 const initialized=Boolean(previous?.initialized);
 const onChat=/^\/messages(?:\/|$)/.test(String(pathname||''));
 return {
  state:{initialized:true,latest:Math.max(last,latest)},
  play:Boolean(initialized&&latest>last&&summary?.notify_messages!==false&&!onChat)
 };
}

// A two-note synthesized chime avoids storing audio files or collecting data.
// Browsers require the AudioContext to be unlocked by a user interaction first.
export function playMessageChime(context){
 if(!context||context.state!=='running')return false;
 try{
  const start=context.currentTime+0.015;
  for(const [offset,pitch] of [[0,660],[0.14,880]]){
   const oscillator=context.createOscillator();
   const volume=context.createGain();
   const t=start+offset;
   oscillator.type='sine';
   oscillator.frequency.setValueAtTime(pitch,t);
   volume.gain.setValueAtTime(0.0001,t);
   volume.gain.exponentialRampToValueAtTime(0.05,t+0.012);
   volume.gain.exponentialRampToValueAtTime(0.0001,t+0.14);
   oscillator.connect(volume);
   volume.connect(context.destination);
   oscillator.start(t);
   oscillator.stop(t+0.145);
  }
  return true;
 }catch{return false;}
}

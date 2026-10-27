// A curated chronological sequence, not a fixed-scale axis. Each marker is one
// historical dossier; approximate years are ordering anchors, not exact dates.
export function chronologicalHistory(entries=[]){
 return [...entries].sort((a,b)=>a.year-b.year||String(a.title).localeCompare(String(b.title),'ar'));
}
export function boundedTimelineIndex(index,length){
 if(!Number.isFinite(index)||length<1)return 0;
 return Math.max(0,Math.min(length-1,Math.round(index)));
}
export function timelineAdjacentIndex(index,delta,length){
 return boundedTimelineIndex(index+delta,length);
}

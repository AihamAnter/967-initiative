// Shared server/client rule: planned recording release dates are estimates,
// so the recorded-debate action waits for actual recording publication.
export function eligibleForDebateReminder(debate,now=Date.now()){
 if(!debate||debate.publication_status!=='published'||
    !['announced','upcoming'].includes(debate.stage))return false;
 if(debate.debate_type==='external_live')
  return Boolean(debate.scheduled_at&&Number.isFinite(Date.parse(debate.scheduled_at))&&Date.parse(debate.scheduled_at)>now);
 if(debate.debate_type==='prerecorded')
  return !debate.recording_published&&!debate.recording_first_published_at;
 return false;
}

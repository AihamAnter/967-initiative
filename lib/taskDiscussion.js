// Stable, oldest-first threads. Logical ancestry is retained while the UI uses
// one replies lane, so replying to a reply never creates an unusable mobile nest.
export function taskThreads(comments){
 const ordered=[...comments].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
 const byId=new Map(ordered.map(item=>[item.id,item])),groups=new Map();
 for(const item of ordered){
  let root=item;const seen=new Set([item.id]);
  while(root.parent_id&&byId.has(root.parent_id)&&!seen.has(root.parent_id)){seen.add(root.parent_id);root=byId.get(root.parent_id);}
  if(!groups.has(root.id))groups.set(root.id,{root,replies:[]});
  if(item.id!==root.id)groups.get(root.id).replies.push(item);
 }
 return [...groups.values()].sort((a,b)=>a.root.created_at.localeCompare(b.root.created_at)||a.root.id.localeCompare(b.root.id));
}
export function taskCommentHref(taskId,commentId){return '/admin/tasks?'+new URLSearchParams({task:taskId,comment:commentId})+'#task-comment-'+commentId;}
export function taskDiscussionVersion(detail){return detail.task.revision+':'+detail.comments.map(c=>c.id+':'+c.revision).join(',');}

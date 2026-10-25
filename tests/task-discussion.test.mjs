import test from 'node:test';import assert from 'node:assert/strict';
import {taskThreads,taskCommentHref} from '../lib/taskDiscussion.js';
test('reply ancestry is stable, includes tombstones and retains reply-to-reply context without recursive rendering',()=>{
 const items=[{id:'c',parent_id:'b',created_at:'2026-01-03'},{id:'a',parent_id:null,created_at:'2026-01-01',deleted_at:'2026-01-04'},{id:'b',parent_id:'a',created_at:'2026-01-02'},{id:'d',parent_id:null,created_at:'2026-01-02'}];
 const threads=taskThreads(items);assert.deepEqual(threads.map(t=>t.root.id),['a','d']);assert.deepEqual(threads[0].replies.map(c=>c.id),['b','c']);assert.equal(items[0].id,'c');assert.match(taskCommentHref('task','comment'),/^\/admin\/tasks\?task=task&comment=comment#task-comment-comment$/);
});

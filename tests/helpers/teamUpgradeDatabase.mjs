import {readFile} from 'node:fs/promises';
import {createTaskTestDatabase,taskTestUsers} from './taskTestDatabase.mjs';
export const teamUpgradeUsers=[...taskTestUsers,
 {id:'77777777-7777-4777-8777-777777777777',role:'admin',name:'عضو الاختبار الثالث'},
 {id:'88888888-8888-4888-8888-888888888888',role:'admin',name:'عضو الاختبار الرابع'}];
export async function createTeamUpgradeDatabase(){
 const base=await createTaskTestDatabase({collaboration:false});
 for(const user of teamUpgradeUsers.slice(taskTestUsers.length)){
  await base.pg.query('insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)',[user.id,JSON.stringify({full_name:user.name})]);
  await base.pg.query('insert into public.editors(user_id,role) values($1,$2)',[user.id,user.role]);
 }
 await base.pg.exec(await readFile(new URL('../../supabase/migrations/202610250004_task_collaboration.sql',import.meta.url),'utf8'));
 const mutate=async(user,action,id=null,revision=null,data={})=>(await base.run(user,'select public.task_mutate($1,$2,$3,$4::jsonb) result',[action,id,revision,JSON.stringify(data)])).rows[0].result;
 const task=async id=>(await base.pg.query('select * from public.tasks where id=$1',[id])).rows[0];
 return {...base,mutate,task};
}

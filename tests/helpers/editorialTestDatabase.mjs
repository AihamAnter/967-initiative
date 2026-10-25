import {readFile} from 'node:fs/promises';
import {createInlineEditorTestDatabase,inlineTestUsers} from './inlineEditorTestDatabase.mjs';
export {inlineTestUsers};
export async function createEditorialTestDatabase(){
 const db=await createInlineEditorTestDatabase();
 const read=name=>readFile(new URL('../../supabase/'+name,import.meta.url),'utf8');
 await db.pg.exec(await read('add-site-settings.sql'));
 const figures=await read('yemeni-figures.sql');await db.pg.exec(figures.slice(0,figures.indexOf('-- Figure portraits')));
 await db.pg.exec((await read('yemen-in-numbers.sql')).replace(/create extension if not exists pgcrypto;/i,''));
 await db.pg.exec(await read('yemen-ranking.sql'));
 await db.pg.exec('alter table auth.users add column banned_until timestamptz');
 await db.pg.exec(await read('migrations/202610230001_prelaunch_roles_rls.sql'));
 await db.pg.exec('grant all on all tables in schema public to service_role;');
 await db.pg.exec(await read('migrations/202610250005_editorial_contributions.sql'));
 await db.pg.exec(await read('migrations/202610250006_contributions_report.sql'));
 const service=(sql,params=[])=>db.pg.transaction(async tx=>{await tx.exec('set local role service_role');return tx.query(sql,params);});
 return {...db,service};
}

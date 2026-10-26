import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';

const cwd=new URL('..',import.meta.url),script='scripts/import-institution-directories.mjs';
const run=(args,env={})=>spawnSync(process.execPath,[script,...args],{cwd,encoding:'utf8',env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',DIRECTORY_IMPORT_CONFIRM:'',DIRECTORY_NEW_PUBLICATION_CONFIRM:'',...env}});

test('offline directory validation never needs database credentials',()=>{
 const result=run(['--kind=all']);
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Offline validation complete/);
});

test('apply and per-record publication require independent explicit confirmations',()=>{
 const missingWrite=run(['--kind=universities','--limit=1','--apply']);
 assert.notEqual(missingWrite.status,0);assert.match(missingWrite.stderr,/DIRECTORY_IMPORT_CONFIRM/);
 const records=JSON.parse(fs.readFileSync(new URL('../data/directories/universities.json',import.meta.url),'utf8')).records,key=records[0].stable_key;
 const missingPublication=run(['--kind=universities','--limit=1','--apply',`--publish-new=${key}`],{DIRECTORY_IMPORT_CONFIRM:'I_UNDERSTAND_THIS_WRITES_DIRECTORY_DATA'});
 assert.notEqual(missingPublication.status,0);assert.match(missingPublication.stderr,/DIRECTORY_NEW_PUBLICATION_CONFIRM/);
 const outsideAllowlist=run(['--kind=universities','--limit=1','--publish-new=not-in-this-import']);
 assert.notEqual(outsideAllowlist.status,0);assert.match(outsideAllowlist.stderr,/outside this import/);
});

test('unsafe blanket overwrite is rejected before any connection is opened',()=>{
 const result=run(['--kind=universities','--preview-diff','--update-existing','--overwrite-existing']);
 assert.notEqual(result.status,0);assert.match(result.stderr,/disabled/);
});

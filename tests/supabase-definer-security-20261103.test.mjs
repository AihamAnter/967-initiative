import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const guard=read('supabase/migrations/20261103001023_harden_debate_admin_authorization_before_lock.sql');
const restrict=read('supabase/migrations/20261103001314_restrict_backend_only_definer_helpers.sql');

test('debate write RPC requires a verified editor before locking rows',()=>{
 const gate=guard.indexOf("if public.debate_role() is null then");
 const lock=guard.indexOf('for update');
 const capture=guard.indexOf('before_children:=public.editorial_debate_children');
 const legacy=guard.indexOf('public.editorial_debate_mutate_legacy(');
 assert.ok(gate>0 && lock>gate && capture>gate && legacy>gate);
 assert.match(guard,/raise exception 'Editor required' using errcode='42501'/i);
 assert.match(guard,/SECURITY DEFINER/i);
 assert.match(guard,/SET search_path TO ''/);
 assert.match(guard,/RETURNS jsonb/i);
 assert.match(guard,/public\.editorial_emit\(/);
});

test('database hardening only removes direct access from four internal read helpers',()=>{
 const functions=[
  'debate_live_results_visible(uuid)',
  'debate_participation_state(uuid)',
  'debate_visible(uuid)',
  'is_967_editor()',
 ];
 for(const name of functions)assert.ok(restrict.includes('public.'+name),name);
 assert.match(restrict,/from public, anon, authenticated;/i);
 assert.doesNotMatch(restrict,/revoke\s+execute\s+on\s+all\s+functions/i);
 assert.doesNotMatch(restrict,/drop\s+function/i);
 for(const publicRpc of ['debate_catalog','debate_detail','debate_discussion','debate_live_results','debate_speaker_public','debate_audience_mutate']){
  assert.ok(!restrict.includes('public.'+publicRpc+'('),'Do not revoke public and editor APIs: '+publicRpc);
 }
});

test('migrations follow real Supabase history versions',()=>{
 assert.match(guard,/20261103001023/);
 assert.match(restrict,/20261103001314/);
 assert.match(read('docs/audit/supabase-definer-security-2026-11-03.md'),/11.*38|38.*11/s);
});

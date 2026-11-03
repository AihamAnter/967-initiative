import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import test from 'node:test';

const activeDirectory=new URL('../supabase/migrations/',import.meta.url);
const archiveDirectory=new URL('../supabase/archive/legacy-migrations/',import.meta.url);
const baselineName='20261026215718_remote_schema.sql';
const baselineSha256='56c2b7914d356266aad40d96a6fe86be1619dd83c06492ea047670db31269d93';

test('active migrations have valid 14-digit unique versions and required production milestones',async()=>{
 const names=(await readdir(activeDirectory)).filter(name=>name.endsWith('.sql')).sort();
 assert.ok(names.length>=33,'unexpected loss of migration files');
 const versions=names.map(name=>{
  assert.match(name,/^\d{14}_[a-z0-9_]+\.sql$/,'invalid migration name: '+name);
  return name.slice(0,14);
 });
 assert.equal(new Set(versions).size,versions.length,'duplicate migration version');
 for(const required of ["20261026215718_remote_schema.sql","20261027000100_account_workspace.sql","20261027000200_link_authenticated_contributions.sql","20261027004810_stat_indicator_editorial.sql","20261029141931_school_arud_course_enable.sql","20261031020834_editor_role_session_guards.sql","20261031020839_editor_rls_policy_hardening.sql","20261031031038_debate_discussion_privacy.sql","20261031031041_debate_auth_ban_guard.sql","20261103001023_harden_debate_admin_authorization_before_lock.sql","20261103001314_restrict_backend_only_definer_helpers.sql"]) assert.ok(names.includes(required),'missing reviewed migration: '+required);
 assert.ok(!names.includes('202610270001_account_workspace.sql'));
 assert.ok(!names.includes('202610270002_link_authenticated_contributions.sql'));
 assert.ok(!names.includes('20261029141600_school_arud_course_enable.sql'));
 const baseline=await readFile(new URL(baselineName,activeDirectory));
 assert.equal(createHash('sha256').update(baseline).digest('hex'),baselineSha256);
});

test('all 19 legacy migrations remain in the non-executable archive',async()=>{
 const archived=(await readdir(archiveDirectory)).filter(name=>name.endsWith('.sql')).sort();
 assert.equal(archived.length,19);
 assert.ok(archived.includes('202610230002_management_guard.sql'));
 assert.ok(archived.includes('202610260001_institution_directory_data_safety.sql'));
});

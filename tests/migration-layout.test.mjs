import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import test from 'node:test';

const activeDirectory=new URL('../supabase/migrations/',import.meta.url);
const archiveDirectory=new URL('../supabase/archive/legacy-migrations/',import.meta.url);
const baselineName='20261026215718_remote_schema.sql';
const baselineSha256='56c2b7914d356266aad40d96a6fe86be1619dd83c06492ea047670db31269d93';

test('the verified baseline remains intact and the next reviewed schema migration is active',async()=>{
 const names=(await readdir(activeDirectory)).filter(name=>name.endsWith('.sql')).sort();
 assert.deepEqual(names,[baselineName,'202610270001_account_workspace.sql','202610270002_link_authenticated_contributions.sql','20261027004810_stat_indicator_editorial.sql','20261028205636_games_daily_attempts_single_per_utc_day.sql','20261028211450_games_verified_leaderboard.sql','20261028215012_games_967_five_new_modes.sql','20261028225742_games_player_achievements.sql','20261029000239_game_friends.sql','20261029000415_game_friends.sql','20261029122247_school_967_musnad_attempts.sql','20261029124719_school_musnad_full_alphabet_stages.sql','20261029141600_school_arud_course_enable.sql','20261029181659_school_967_xp_events.sql','20261029183746_school_learning_habits.sql']);
 const baseline=await readFile(new URL(baselineName,activeDirectory));
 assert.equal(createHash('sha256').update(baseline).digest('hex'),baselineSha256);
});

test('all 19 legacy migrations are preserved in the non-executable archive',async()=>{
 const archived=(await readdir(archiveDirectory)).filter(name=>name.endsWith('.sql')).sort();
 assert.equal(archived.length,19);
 assert.ok(archived.includes('202610230002_management_guard.sql'));
 assert.ok(archived.includes('202610260001_institution_directory_data_safety.sql'));
});

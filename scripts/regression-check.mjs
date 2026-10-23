import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const app = readFileSync('src/App.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/20261023173000_grant_auth_signup_trigger_table_access.sql', 'utf8');

// Registration must continue to use the Supabase Auth API.
assert.match(app, /supabase\.auth\.signUp\(/, 'Signup must use Supabase Auth signUp');

// The signup-trigger migration must keep the minimum required grants.
assert.match(migration, /grant insert, select on table public\.profiles to supabase_auth_admin;/i);
assert.match(migration, /grant insert, select on table public\.user_preferences to supabase_auth_admin;/i);

// If atomic routine save fails, never delete existing planned sessions as a fallback.
const saveFailure = app.slice(app.indexOf("const {error:saveError}=await supabase.rpc('replace_planned_study_sessions'"), app.indexOf("const {data,error}=await supabase.from('study_sessions').select('*')"));
assert.ok(saveFailure.includes('Your existing routine was not changed.'));
assert.ok(!saveFailure.includes(".delete()"), 'Failed routine save must preserve existing routine data');

console.log('StudyFlow regression checks passed.');

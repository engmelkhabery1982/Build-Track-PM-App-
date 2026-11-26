import assert from 'node:assert/strict';
import test from 'node:test';

test('loading the Supabase module without web configuration is safe for desktop startup', async () => {
  const { getSupabaseClient } = await import('../src/lib/supabase.ts');
  assert.throws(getSupabaseClient, /Supabase is not configured for the web app/);
});

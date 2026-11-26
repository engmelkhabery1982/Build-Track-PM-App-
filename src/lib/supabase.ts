import { createClient } from '@supabase/supabase-js';

function createConfiguredClient() {
  const url = import.meta.env?.VITE_SUPABASE_URL;
  const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase is not configured for the web app.');
  }

  return createClient(url, key);
}

let client: ReturnType<typeof createConfiguredClient> | undefined;

// Only web repository operations need Supabase configuration.
export function getSupabaseClient() {
  return client ??= createConfiguredClient();
}

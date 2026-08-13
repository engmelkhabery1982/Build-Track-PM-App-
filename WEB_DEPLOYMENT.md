# BuildTrack web deployment readiness

The same application uses a repository abstraction:

- Tauri desktop: local SQLite (`buildtrack.db`) only.
- Browser build: Supabase, configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Before switching a production workspace to the web

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Apply the SQL files in `supabase/migrations/` in chronological order.
3. Verify every table used by the desktop PMO features exists in Supabase before enabling browser users. Do not point a live desktop workspace at an incomplete cloud schema.
4. Replace the temporary anonymous access policies with Supabase Auth and role-based RLS policies before granting external access.
5. Take a local **Backup local data** copy from BuildTrack before any migration. Keep that SQLite file as the recovery source.
6. Import a tested Excel export into a non-production cloud project first, then reconcile contract value, approved variations, PV, EV and AC against the desktop PMO Report Pack.

## Data ownership rule

During the current desktop phase, SQLite is the system of record. A later cloud migration must be a planned cutover; it must not run silently in the background or overwrite the local workspace.

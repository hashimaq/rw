# Red Wings Cricket

Mobile-first PWA foundation for the Red Wings cricket team — **Phase 1: backend and data layer**.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS
- Supabase (PostgreSQL, Auth, Realtime, RLS)
- Dexie.js (IndexedDB offline queue)

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in Supabase URL, anon key, and service role key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) (optional but recommended).
3. Link the project: `supabase link --project-ref <your-ref>`
4. Apply migrations:

   ```bash
   supabase db push
   ```

   Or paste/run each file in `supabase/migrations/` in order via the SQL editor.

5. **Do not seed fake players or matches.** `supabase/seed.sql` is intentionally empty.
6. Enable **Realtime** for `matches`, `innings`, and `deliveries` (migration `20250921000007` adds them to `supabase_realtime`).
7. **Admin Auth users:** copy `scripts/admin-provision.local.example.json` → `scripts/admin-provision.local.json` (gitignored), add passwords locally only. Then:

   ```bash
   npm run supabase:provision-admins
   ```

   Creates/updates **Auth users first**, then upserts `public.profiles` with `role = 'admin'`. The Next.js app never reads that JSON file.

   **SQL-only fallback** (Auth users must already exist): `scripts/promote-admins-by-email.sql`.

8. Verify: `npm run supabase:verify-admins`

   Admin API routes use `requireAdmin()` → `profiles.role === 'admin'` (see `src/lib/auth/admin.ts`). Profiles are also created on signup via trigger `on_auth_user_created`.

## Match numbering

- Display numbers `RW-001`, `RW-002`, … come from sequence `match_display_number_seq` and trigger `matches_assign_display_number` on insert.
- Internal primary key remains UUID.
- Admins may update `match_number` later; unique constraint prevents duplicates.
- Sequence values are not reused if a match is deleted (preserves audit integrity).

## Security model

| Actor | Access |
|--------|--------|
| Public | Read live/completed public matches, deliveries, scorecard data (RLS) |
| Admin | Full write via authenticated session + `profiles.role = admin` |
| Scorer | Write deliveries via server API after 4-digit PIN + single active `scoring_sessions` row |

- Scorer PIN: bcrypt hash in `matches.scorer_pin_hash` (set at match creation).
- Scoring session token: SHA-256 in httpOnly cookie `rw_scorer_session`.
- Service role key: **server only** (`SUPABASE_SERVICE_ROLE_KEY`).

## Project layout

```
src/lib/
  auth/           Admin checks, PIN + session helpers
  database/       TypeScript types
  local-db/       Dexie schema
  match/          Share slug helpers
  repositories/   Data access
  scorecard/      PDF-ready structured types
  scoring-engine/ Deterministic ball-by-ball calculations
  statistics/     Derived stats (empty until real matches)
  supabase/       Browser, server, service clients
  sync/           Offline queue + flush to API
  validation/     Zod schemas
supabase/migrations/  Versioned SQL
```

## Vercel deployment

1. Import this repository root (`D:\PROJECTS\RW`) as a Next.js project.
2. Environment variables:

   | Variable | Notes |
   |----------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server only — mark sensitive in Vercel |
   | `NEXT_PUBLIC_SITE_URL` | Production URL for auth redirects |

3. Deploy; run migrations against the same Supabase project used in production.

## API routes (foundation)

- `POST /api/admin/matches` — admin creates match (auto `RW-nnn`, PIN hashed)
- `POST /api/scoring/verify-pin` — start scoring session or 409 conflict
- `POST /api/scoring/deliveries` — idempotent delivery upsert (active scorer cookie)

## Offline scoring flow

1. Scorer records ball → `recordDeliveryLocalFirst()` writes Dexie immediately.
2. Entry added to `syncQueue` with `client_event_id` (UUID).
3. `flushSyncQueue()` POSTs to `/api/scoring/deliveries`.
4. Server calls `upsert_delivery_idempotent` (unique on `client_event_id`).

## What is not in this phase

- Final scoring UI, dashboards, animations, PWA manifest polish
- AI post-match generation (table `match_ai_analysis` is ready)
- PDF rendering (types in `src/lib/scorecard/types.ts`)

# Cogitster handoff

**Last updated:** 16 August 2026
**Current state:** backend and static browser app deployed at its branded custom
domain. Supabase production Auth should now use that domain as its canonical URL.

## What works now

- 300-card solo philosophy timeline game with quote, thinker, book, concept,
  and event cards (`cards.js` is the source, imported into the live
  database).
- Deterministic Curious, Scholar, and Oracle AI opponents.
- AI placement appears in its timeline before its result is revealed.
- Passwordless email login through Supabase Auth.
- Guests can choose **Play without an account** from the sign-in dialog; that
  starts a local-only solo game whose progress remains in the current browser.
- Cloud-saved solo games: start, placement, AI turn, round advance, reload,
  and resume are server-authoritative.
- Resuming after an AI reveal rebuilds the result and its “Next round” action;
  resuming during the AI-placement pause safely completes that turn.
- Passwordless sign-in feedback reserves its own space below the submit button.
- Local-only mode remains available when `config.js` has no publishable key.

## Live backend

- **Supabase project ref:** `cfkdtgjmqpgpatbvfxau`
- **Schema:** `cogitster`
- **Edge Function:** `solo-game`
- **Production URL:** `https://cogitster.vibetrunk.com`
- **Vercel fallback URL:** `https://cogitster.vercel.app`
- **Custom domain:** `cogitster.vibetrunk.com` is attached, verified, and live
  on Vercel.
- **Migration applied:** `202608160001_cogitster_solo.sql`
- **Card catalogue:** 300 `published` records imported successfully
  (2026-08-16 expansion from the initial 100, via `scripts/import-cards.mjs`,
  which upserts by id and is safe to re-run after future `cards.js` edits).
- **Data API:** the `cogitster` schema is exposed in Project Settings → Data
  API. Direct browser table access is still blocked by grants/RLS; only the
  Edge Function exposes the game state required by a player.

Never record, commit, or send a secret/service-role key. `config.js` contains
only the project URL and a browser-safe publishable key.

## Local development

```powershell
python -m http.server 4321
```

Open `http://localhost:4321`. Supabase Auth must allow
`http://localhost:4321/**` as a redirect URL. The Supabase CLI is installed as
a dev dependency; run it through `npx supabase` from this folder.

Useful read-only commands:

```powershell
npx supabase migration list
npx supabase db push --dry-run
```

`npx supabase functions deploy solo-game` is an external deployment to the
shared project: run it only with the owner's yes for that deploy.

The first `supabase init` had to be bootstrapped around an existing migration
folder; a temporary `supabase-cogitster-backup/` safety copy existed during
that bootstrap and was dropped when this repo was split out — see
"Next implementation work" below.

## Deployment checklist

1. In Supabase Auth, set the **Site URL** to
   `https://cogitster.vibetrunk.com` and add
   `https://cogitster.vibetrunk.com/**` as an allowed Redirect URL. Keep the
   Vercel production and preview URLs as additional redirect URLs.
2. Test passwordless login, an entire solo round, refresh/resume, and sign-out
   on the production URL.
3. The root VibeTrunk entry now points to the canonical custom domain; deploy
   the root site after making this repository change.

## Important files

| File | Purpose |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | Game UI and local fallback. |
| `backend.js` | Browser Auth/session handling and calls to `solo-game`. |
| `config.js` | Browser-safe project URL and publishable key. |
| `cards.js` | 300-card source catalogue. |
| `supabase/migrations/202608160001_cogitster_solo.sql` | Schema, RLS, profiles, persistent games. |
| `supabase/functions/solo-game/index.ts` | Server-authoritative solo game API. |
| `scripts/import-cards.mjs` | Service-role-only card importer. |

## Next implementation work

1. Deploy/verify production as above.
2. ~~Move Cogitster into its own VibeTrunk GitHub repository; this folder was
   nested in the root landing-page workspace only for development.~~ Done
   2026-08-16 — this is now that repository (`VBTRNK/cogitster`),
   git-linked to the existing `cogitster` Vercel project.
3. Add private sequential multiplayer rooms with Supabase Realtime, server
   timers, reconnect tokens, and no hidden-card leakage.
4. Replace the current direct `config.js` setup with build-time Vercel public
   environment variables once a bundler/build step is adopted.
5. `cards.js` has reached the 300-card release target and is imported live
   (2026-08-16). It still needs a formal editorial/source review pass per
   the Phase 1 workflow — the new cards' dates and quotes were checked
   against secondary sources during expansion but not yet formally
   reviewed.

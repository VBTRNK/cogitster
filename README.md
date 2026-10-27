# Cogitster prototype

A dependency-free, browser-playable Cogitster MVP. Open `index.html` in a
modern browser, or serve this directory with any static file server.

Included:

- 100 philosophy cards across quotation, thinker, book, concept, and event
  prompts, all with one specific chronology year;
- playable sequential solo rounds against deterministic Curious, Scholar, or
  Oracle AI;
- responsive timeline controls and keyboard-accessible placement buttons; and
- browser-local saved game checkpoints and discovery/game statistics.

## Supabase backend foundation

The prototype remains playable without a backend, but this directory now also
contains the first production backend slice:

- [`supabase/migrations/202608160001_cogitster_solo.sql`](supabase/migrations/202608160001_cogitster_solo.sql)
  creates the private card catalogue, player profiles, persistent solo games,
  idempotency log, and row-level security policies.
- [`supabase/functions/solo-game/index.ts`](supabase/functions/solo-game/index.ts)
  owns dealing, placement validation, AI placement/reveal, and round advances.
  The browser never directly reads cards or decides whether a placement is
  correct.
- [`scripts/import-cards.mjs`](scripts/import-cards.mjs) upserts the 100-card
  starter deck into the catalogue as `published` cards.

The one-time bootstrap on 2026-08-16 ran these commands. They are history
now: hosted migrations go only through
[`VBTRNK/supabase`](https://github.com/VBTRNK/supabase), and every
`db push`, `secrets set` or `functions deploy` against the shared project
needs the owner's yes for that run (see `AGENTS.md`).

```sh
supabase link --project-ref <shared-project-ref>
supabase db push
SUPABASE_URL=<project-url> SUPABASE_SERVICE_ROLE_KEY=<server-only-key> node scripts/import-cards.mjs
supabase secrets set SUPABASE_ANON_KEY=<anon-key>
supabase functions deploy solo-game
```

The next code step is connecting the current browser prototype to this
function through passwordless Supabase authentication, replacing local-only
save checkpoints with the returned persistent game state. Private Realtime
multiplayer follows on this same server-authoritative model.

## Browser integration

The browser app now uses the deployed `solo-game` function whenever
`config.js` contains a Supabase **publishable** key. In the Supabase Dashboard,
open **Project Settings → API Keys**, create/copy a publishable key, then set:

```js
window.COGITSTER_CONFIG = {
  supabaseUrl: 'https://<project-ref>.supabase.co',
  supabasePublishableKey: 'sb_publishable_...',
};
```

The publishable key is safe in browser code; never put a secret or service-role
key in `config.js`. Run a local static server (for example,
`python -m http.server 4321`) and visit `http://localhost:4321`, which must be
listed in Supabase Auth's redirect URLs for magic-link sign-in to work.

After any change under `supabase/functions`, redeploy it with the command
below. It ships code to the shared hosted project, so it is an external
deployment: run it only with the owner's yes for that deploy.

```sh
npx supabase functions deploy solo-game
```

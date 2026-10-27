# AGENTS.md

Canonical instructions for every agent (Codex and Claude) in this repo.
`CLAUDE.md` imports this file; edit it here. Open work is GitHub issues.

## Project

Cogitster is a philosophy timeline game: players put quotes, thinkers, books,
concepts and events in chronological order. It is a tool in the
[VibeTrunk](https://vibetrunk.com) hub; add no coupling to `VBTRNK/home`
beyond its tools-list entry and the shared Supabase project. Product intent is
in `docs/spec.md` and `docs/build-plan.md`; the current state is in
`README.md` and `HANDOFF.md`.

- Stack: a dependency-free static browser app, no bundler
  (`index.html`, `app.js`, `backend.js`, `cards.js`, `styles.css`,
  `config.js`).
- Hosting: Vercel project `cogitster`, at `https://cogitster.vibetrunk.com`.
- Backend: the shared VibeTrunk Supabase project, schema `cogitster` (not
  `public`). Row-level security is on for every table; the browser never
  talks to Postgres directly. All game logic (dealing, placement validation,
  AI placement and reveal, round advance) lives in the `solo-game` Edge
  Function, called with the player's JWT, so a browser never sees a hidden
  card or a future placement early. New game modes, multiplayer included,
  stay on this server-authoritative model.
- A hobby project and a deliberate learning project in production-grade
  practice: clear structure, decisions recorded in `docs/decisions.md`.

## Invariants

These must never be violated; security and data integrity win over
convenience.

- No secret in a tracked file, a log or a browser bundle. `config.js` holds
  only the project URL and the publishable key; `.env.example` documents the
  shape only.
- Every table has row-level security. Only the publishable key reaches the
  browser; the secret key is server-only.
- Game state changes only through the `solo-game` Edge Function, never direct
  client writes.
- The Content-Security-Policy stays as strict as the app allows; loosen it
  per origin, never with a wildcard.

Changing a rule, invariant or public contract means recording it in
`docs/decisions.md`.

## Commands

- Serve locally with `python -m http.server 4321` and open
  `http://localhost:4321`.
- The Supabase CLI is a dev dependency: run it as `npx supabase` from this
  folder. `migration list` and `db push --dry-run` are read-only.

## Workspace and branches

- `main` is protected: squash merges only, `scan` (gitleaks) must pass.
  Branch (`feat/`, `fix/`, `docs/`, ...) and open a PR; the owner reviews and
  merges. Branches auto-delete on merge. Use conventional commit prefixes.
- Never commit, push, deploy or change hosted state without the owner's
  authorization for that change.

## Release

A merge to `main` deploys to production through Vercel's Git integration. The
merge authorizes that deploy only; other hosted changes need their own yes.
Never run `vercel deploy` or `vercel --prod` by hand unless asked.

- `npx supabase functions deploy solo-game` ships code to the shared hosted
  project. It is an external deployment: run it only with the owner's yes for
  that deploy.

## Database

- Hosted migrations are catalogued in
  [`VBTRNK/supabase`](https://github.com/VBTRNK/supabase), the only
  deployment authority for the shared project. Its automated
  `apply-migrations` route is KUT-only today, so a Cogitster migration
  reaches the shared project as a local `supabase db push` from that repo,
  run with the owner's explicit OK. Never push from this repo.
- Existing migrations are immutable. New code degrades gracefully against
  the old schema until its migration is live.

## Agent safety

- Hooks in `.claude/hooks/` and `.codex/hooks/` block destructive commands
  (forced deletes, force push, remote branch deletion, hard reset, forced
  clean, broad checkout discards, forced branch deletion, downloads piped into
  an interpreter). What they enforce is non-negotiable; changing a guard needs
  a PR the owner asked for. Codex hooks and rules need the repo to be trusted.
- Never auto-allowed: `git commit`, `git push`, state-changing `gh` commands
  (merge, close, comment, rerun, cancel, delete), `supabase functions
  deploy`, real `db push`, `db reset`, `migration repair` and `secrets set`.
- Dependabot waits 5 days after a release; review any manual install in its
  PR diff.

## Documentation map

`README.md` and `HANDOFF.md` are the current state, `docs/spec.md` and
`docs/build-plan.md` the product intent, `docs/decisions.md` the rules and
their reasons, GitHub issues the open work, and the PR description the
narrative.

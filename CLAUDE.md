# Cogitster — Project Context

## What this is
Cogitster is a philosophy timeline game: players put quotes, thinkers, books,
concepts, and events in chronological order. It is the first tool in the
[VibeTrunk](https://vibetrunk.com) hub — see
[VibeTrunk/home](https://github.com/VibeTrunk/home) for the landing page and
the wider ecosystem context. Full product intent lives in
[`docs/spec.md`](docs/spec.md) and [`docs/build-plan.md`](docs/build-plan.md).

## Status so far
- **Live** at `https://cogitster.vibetrunk.com` (Vercel fallback:
  `https://cogitster.vercel.app`), deployed as its own Vercel project on the
  `VibeTrunk` team.
- **Solo play** against three deterministic AI opponents (Curious, Scholar,
  Oracle) is shipped and server-authoritative — see
  [`HANDOFF.md`](HANDOFF.md) for exact live-backend details (Supabase
  project ref, schema, Edge Function).
- **Sequential-turn multiplayer** (private rooms, 2–6 players, Supabase
  Realtime) is designed in the spec but not yet built — see "Next
  implementation work" in `HANDOFF.md`.
- This repo was split out of `VibeTrunk/home` on 2026-08-16, where the code
  had been developed nested in that repo's working tree. This repo, its
  agent-safety scaffold, and its Vercel project link are the result of that
  split.

## This repo's job
Own the Cogitster game end to end: the browser frontend
(`index.html`/`app.js`/`backend.js`/`cards.js`/`styles.css`, currently a
dependency-free static app, no bundler), the Supabase backend
(`supabase/migrations`, `supabase/functions/solo-game`), and its deployment
as the `cogitster` Vercel project on the `cogitster.vibetrunk.com` subdomain.
`VibeTrunk/home` knows nothing about this repo beyond its name, blurb, and
URL — keep it that way; don't add cross-repo coupling beyond the shared
Supabase project.

## Backend model
All VibeTrunk tools share **one Supabase project**, each in its own Postgres
schema — Cogitster's is the `cogitster` schema (not `public`). Row-level
security is enabled on every table; the browser never talks to Postgres
directly. All game logic (dealing, placement validation, AI
placement/reveal, round advance) lives server-side in the `solo-game` Edge
Function, called with the player's Supabase JWT — this is deliberate, so a
player's browser can never see a hidden card or an opponent's future
placement early. Keep new game modes (multiplayer included) on this same
server-authoritative model.

## Working style
Same as `VibeTrunk/home`: this is partly a deliberate learning project in
production-grade practices, not just a quick hack — favor clear structure
and document decisions in markdown as you go (see `docs/` for product
decisions; add an equivalent decisions log here if architectural choices
start accumulating).

## Agent safety
Destructive shell commands (force-push, hard reset, recursive delete, etc.)
are blocked by a PreToolUse hook regardless of what an agent decides — see
`AGENTS.md` for the Codex-specific summary, and `.claude/settings.json` /
`.codex/rules/project.rules` for the exact allow/deny lists. This scaffold
was copied from `VibeTrunk/home`, which is the canonical template for every
VibeTrunk-org repo.

A second PreToolUse hook (`block-young-packages.cjs`, mirrored in
`.claude/hooks/` and `.codex/hooks/`) blocks `npm install`/`npm i` of any
package version published less than 14 days ago, checked live against the
npm registry — a cool-off against supply-chain attacks (typosquats,
compromised maintainer accounts). It fails open if the registry is
unreachable or the version can't be resolved unambiguously.

Live-mutating Supabase CLI commands (`supabase db push` for real,
`supabase db reset`, `supabase secrets set`) are intentionally **not**
auto-allowed — they change the live schema or rotate live credentials for
every VibeTrunk tool sharing this Supabase project, so each use should get a
deliberate look rather than running unattended. Read-only/dry-run commands
(`supabase migration list`, `supabase db push --dry-run`,
`supabase functions deploy`) are allowed.

## Branch protection
Branch protection on `main` was enabled 2026-08-23 (PRs required, direct
pushes blocked including for admins, squash-only merges with
auto-delete-on-merge). See the global `~/.claude/CLAUDE.md`'s "Branch
workflow" section for the actual branching/PR conventions this enforces.

# Security

This repo handles real user data: passwordless email accounts and
server-authoritative solo game state, backed by a shared Supabase project
(schema `cogitster`). Every table has row-level security enabled; the
browser never talks to Postgres directly — all game logic runs through the
`solo-game` Edge Function, authenticated with the player's Supabase JWT. See
[`CLAUDE.md`](CLAUDE.md) for the backend model and
[`HANDOFF.md`](HANDOFF.md) for current live-deployment details.

If you notice something suspicious (an RLS gap, a way to see a hidden card
or an opponent's future placement, a CSP bypass, a vulnerable dependency, a
leaked credential), report it privately through GitHub's
[private vulnerability reporting](https://github.com/VBTRNK/cogitster/security/advisories/new)
rather than opening a public issue.

The `service_role` Supabase key must never be `PUBLIC_`-prefixed, never
ships to the browser, and never appears in any tracked file — only
`config.js`'s browser-safe publishable key does. See
[VBTRNK/home](https://github.com/VBTRNK/home)'s `docs/decisions.md`
for the reasoning behind the shared agent-safety and CI scaffolding this
repo copies.

# Decisions — Cogitster

Short records of rules and why: context, decision, consequences, about 20
lines each. Newest last. Earlier choices are recorded in `VibeTrunk/home`'s
`docs/decisions.md` ("Cogitster split into its own repo") and in
`docs/build-plan.md`.

## ADR-001 — Working standards

Date: 2026-10-17

Brought in line with the refreshed `vibetrunk-new-tool` templates
([VibeTrunk/kut#329](https://github.com/VibeTrunk/kut/issues/329)).

- `AGENTS.md` is canonical and `CLAUDE.md` imports it. The stale status text
  is gone; `README.md` and `HANDOFF.md` hold the current state.
- `git commit` and `git push` are no longer auto-allowed; both prompt. A
  standing permission is not the owner's per-change authorization.
- `supabase functions deploy` is no longer auto-allowed either. It was listed
  as read-only, but it ships code to the project every VibeTrunk tool shares:
  an external deployment, reversible or not. `migration repair` joins `db
  reset`, `secrets set` and a real `db push` as denied commands.
- `gh` allows are read-only subcommands only. The old Codex `gh pr` and
  `gh run` prefixes also allowed `gh pr merge` and `gh run delete`.
- The Codex hook never fired (its `^Bash$` matcher missed `exec_command`).
  The hook pair now uses KUT's matcher and a plain `node` launcher, fails
  closed on a malformed payload, and anchors the `rm` pattern.
- The 14-day package-age hook is replaced by a Dependabot 5-day cooldown;
  security updates are exempt and manual installs are reviewed in the PR
  diff. gitleaks is pinned by image digest and is the required `scan` check.
- Hosted migrations go through `VibeTrunk/supabase`, never from this repo.

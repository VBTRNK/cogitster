# AGENTS.md

This file provides guidance to ChatGPT and Codex when working with code in this repository.

## Canonical project guidance

Before doing repository work, read [`CLAUDE.md`](CLAUDE.md) in full and follow it as project guidance. It is the canonical description of the project, its status, and the wider VibeTrunk ecosystem.

Do not duplicate that guidance here: keeping a single canonical project description prevents Claude and Codex instructions from drifting apart. If the project changes, update `CLAUDE.md`; this file will continue to direct Codex to it.

## Codex-specific safety and permissions

- Repository-local Codex hooks and command rules live under `.codex/` and require the repository to be trusted. Standard VibeTrunk scaffold — see global `~/.codex/AGENTS.md` for the agent safety policy and push/deployment discipline these hooks and rules enforce.
- Normal `git push`, `npm install`, `gh ...`, and read-only/dry-run Supabase CLI commands (`supabase migration list`, `supabase db push --dry-run`, `supabase functions deploy`) are allowed by the repository command rules. `supabase db push` (real), `supabase db reset`, and `supabase secrets set` are deliberately left out of the auto-allow list — they mutate the live schema or rotate live credentials, so each use should get an explicit look before running.
- Never run `vercel deploy`/`vercel --prod` or a real `supabase db push`/`supabase secrets set` unless explicitly asked.
- This same pattern (`.claude/`, `.codex/`, `AGENTS.md`, gitleaks CI) originated in the `VibeTrunk/home` repo and is the template for every VibeTrunk-org repo.

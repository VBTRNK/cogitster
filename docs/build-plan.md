# Cogitster — build plan

**Status:** shipped — solo play is live at cogitster.vibetrunk.com; sequential
multiplayer remains to be built (see [`HANDOFF.md`](../HANDOFF.md))
**Inputs:** [product specification](spec.md)
**Delivery target:** a separate Cogitster repository and Vercel project —
done as of this repo's creation; the landing-page repo now only links to it.

## Outcome

Deliver an English-language browser game in which players put philosophy quote,
thinker, book, concept, and event cards in order by year. Version 1 supports:

- saved solo play against a deterministic AI;
- sequential-turn private multiplayer rooms for 2–6 people;
- a broad, global philosophy card catalogue; and
- a vetted, specific year on every playable card.

## Delivery order

| Phase | Deliverable | Exit criteria |
| --- | --- | --- |
| 0. Foundation | New repository, deployment, auth/data baseline | CI, preview deployment, environment configuration, and RLS test harness work. |
| 1. Content prototype | Reviewed 20-card starter set | Every card has a specific year, source, basis, and rights/translation review. |
| 2. Solo vertical slice | Complete 10-round solo game | Player can place cards, receive validated reveals, play against all AI levels, and save/resume progress. |
| 3. Multiplayer | Private sequential-turn rooms | 2–6 guests can create, join, reconnect, and finish a synchronized game. |
| 4. Content and polish | Launch deck and accessible UI | 300 reviewed cards, responsive/keyboard/screen-reader support, visual identity, and error states. |
| 5. Hardening and launch | Production-ready release | Security, performance, recovery, and acceptance tests pass; domain and landing-page entry are ready. |

## Phase 0 — foundation

1. Create a dedicated `Cogitster` repository from the VibeTrunk app template.
2. Set up Vercel preview/production projects and a Cogitster subdomain; do not
   modify the root landing-page link until production is live.
3. Create the `cogitster` schema in the shared Supabase project.
4. Configure passwordless email authentication for saved solo progress and
   anonymous/signed guest sessions for multiplayer.
5. Add environment examples for the public Supabase URL and anon key; keep all
   privileged keys server-only.
6. Establish server-side routes/functions for actions and a typed data-access
   layer. The browser must not receive future cards or decide correctness.
7. Add CI for formatting, type checking, unit tests, database/RLS tests, and
   secret scanning.

**Database milestones**

- Implement `cards`, `rooms`, `room_players`, `games`, `game_players`,
  `turns`, `timeline_entries`, `game_actions`, `player_profiles`, and
  `solo_progress`.
- Give each game action an idempotency key and version check.
- Write RLS policies that limit a guest to their rooms and an account holder to
  their own progress.
- Define retention/expiry jobs for lobbies, completed games, and guest data.

## Phase 1 — content prototype and rules engine

1. Create the editorial card workflow and source-review checklist.
2. Build 20 representative cards across all five card types and several global
   traditions/eras.
3. Require `chronology_year`, `chronology_year_basis`, rationale, source, and
   review status before a card can become `published`.
4. Implement the pure, server-tested timeline validator:
   - ordered timeline in + proposed gap + card year -> correct/incorrect;
   - shared years accept either relative order;
   - invalid/missing timeline IDs are rejected.
5. Implement deterministic deck selection and server-side dealing, with enough
   audit metadata to investigate a dispute without exposing future cards.
6. Playtest the 20-card set with at least five players. Record confusing card
   prompts, year disputes, difficulty, and representation gaps.

**Gate:** Do not expand the catalogue or build realtime rooms until the rules
are fun, each card type is understandable, and the year policy survives review.

## Phase 2 — solo vertical slice

1. Build mode selection, solo settings, and passwordless sign-in.
2. Build the timeline UI with click/tap placement, keyboard placement, and a
   mobile alternative to drag-and-drop.
3. Build the hidden-card, confirm, reveal, explanation, and score states.
4. Add the three deterministic AI profiles:
   - Curious: target ~45% correct;
   - Scholar: target ~65% correct;
   - Oracle: target ~82% correct.
5. Run AI simulation tests over the eligible deck to calibrate each profile.
   Ensure it chooses before any reveal and uses only the allowed coarse year
   band plus its revealed timeline.
6. Persist a signed-in player's game state, history, completion data, and
   summary stats. Test resuming on another device.
7. Build the end screen and replay/new-game flows.

**Gate:** A new visitor can complete a solo game; an authenticated player can
resume it later; the server is the sole authority for every result.

## Phase 3 — private sequential multiplayer

1. Build create-room, join-code, share-link, lobby, host settings, and guest
   display-name flows.
2. Add server-authoritative room/game state transitions:
   `lobby -> dealing -> player_turn -> reveal -> next_turn -> finished`.
3. Deal a hidden card only to the active player. Other players see a waiting
   state, then the public reveal before the next player starts.
4. Integrate Supabase Realtime for authorized room updates and snapshot
   recovery after missed events.
5. Add reconnect identity, server-driven timer behavior, disconnect grace, and
   turn-skipping rules.
6. Test 2, 4, and 6-player games over normal and throttled connections.

**Gate:** Invited guests can finish a 2–6-player game with synchronized scores
and timelines, with no hidden card leaked through API or Realtime messages.

## Phase 4 — launch content, design, and accessibility

1. Expand to 300 reviewed cards, balancing card types, periods, regions,
   traditions, genders, and fields of philosophy.
2. Create Cogitster’s original name treatment, card system, and responsive
   interface; avoid visual or textual imitation of the game that inspired the
   initial concept.
3. Add an English “How it works” guide and transparent AI explanation.
4. Complete keyboard navigation, screen-reader labels/live announcements,
   focus handling, colour-independent outcomes, and reduced-motion behavior.
5. Add loading, network-loss, empty, expired-room, invalid-code, and server
   error states.
6. Let players report a problematic card; route reports into the editorial
   workflow rather than changing published data automatically.

**Gate:** Accessibility acceptance criteria pass on desktop and mobile, and
every launch card has completed editorial review.

## Phase 5 — security, quality, and release

1. Add automated integration tests for authorization, hidden-card isolation,
   duplicate action submissions, score validation, and reconnect recovery.
2. Perform an RLS/security review, including attempts to subscribe to or fetch
   another player’s private turn data.
3. Test current Chrome, Firefox, Safari, and mobile browsers; measure initial
   load and interaction responsiveness on a throttled connection.
4. Set CSP, HTTPS-only behavior, rate limits, logging/error monitoring, backup
   approach, and data-retention/account-deletion behavior.
5. Run a closed beta with diverse players; review AI difficulty calibration and
   content reports before launch.
6. Deploy production, map the subdomain, and then change this home repository’s
   tool entry from `coming-soon` to `live` with the production URL.

## Workstreams and dependencies

| Workstream | Can start | Blocks |
| --- | --- | --- |
| Editorial cards | immediately | Content prototype, full deck |
| Database/RLS | Phase 0 | Solo and multiplayer persistence |
| Rules/dealing service | Phase 1 | Solo and multiplayer results |
| Solo UI and AI | after rules service | Solo beta |
| Realtime rooms | after rules service | Multiplayer beta |
| Design/accessibility | low-fidelity in Phase 1; final in Phase 4 | Launch readiness |
| Security/QA | test scaffolding in Phase 0; full review in Phase 5 | Production launch |

## Definition of done

Cogitster is ready to launch when all Version 1 acceptance criteria in the
product specification pass, the content review gate is complete, and a closed
beta has not uncovered a severity-one security, hidden-information, or game
state integrity defect.

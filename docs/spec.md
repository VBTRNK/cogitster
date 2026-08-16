# Cogitster — product specification

**Status:** approved product baseline, August 2026
**Product:** Cogitster, deployed as a separate VibeTrunk application
**Primary release:** browser game for desktop and mobile

## 1. Product summary

Cogitster is a social timeline game in which players put memorable
philosophy cards in chronological order. Cards can feature quotations, thinkers,
books, concepts, or events. A card initially reveals only the prompt; the player
decides where it belongs on their timeline, then reveals its year and context to
learn whether they were right.

The game borrows the satisfying *place it in the right era* loop of a timeline
party game, but has its own name, visual identity, rules presentation, and
content. The core subject matter is ideas: the player gradually builds a visual
history of philosophy while competing with friends or an AI opponent.

### Product principles

- **Playable before scholarly.** A round should be understandable in seconds;
  optional context rewards curiosity without slowing the game.
- **Historically honest.** Dates have uncertainty, traditions beyond the
  Western canon are deliberately represented, and disputed attributions are
  not presented as facts.
- **Social at the table, viable alone.** Multiplayer is the main party
  experience; a full single-player mode against AI is a first-class mode, not
  a practice screen.
- **Accessible by default.** No outcome depends only on colour, audio, speed,
  a touch gesture, or prior philosophy education.
- **No answer-key leakage.** The date, philosopher, school, and other strong
  hints remain hidden until the placement is locked.

## 2. Release scope

### Version 1 (must have)

- One-device solo game against one AI opponent.
- Online private-room multiplayer for 2–6 human players.
- A vetted, balanced initial content set spanning quotation, thinker, book,
  concept, and event cards; every card has one specific chronology year.
- Chronological placement, reveal, scoring, winner screen, replay.
- Three AI difficulties: Curious, Scholar, and Oracle.
- A short explanation and source after every reveal.
- English-only UI; source quotations may show a translation note.
- Saved solo progress, secured by a player account; guests may still join a
  multiplayer room without creating an account.
- Mobile-first responsive UI, keyboard support, and reduced-motion support.

### Explicitly out of scope for Version 1

- Public matchmaking, rankings, chat, friends, cosmetics, purchases, and ads.
- Real-money prizes or gambling-like mechanics.
- Voice/video rooms, native mobile apps, and offline multiplayer.
- User-submitted cards (requires a separate editorial/moderation design).
- A generated-answer model deciding historical truth at game time.

## 3. Players and jobs to be done

| Player | Need | Success looks like |
| --- | --- | --- |
| Curious player | Learn without feeling tested. | Can start immediately, understands each reveal, and wants another round. |
| Philosophy learner | Connect thinkers and eras. | Can inspect reliable context and improve across games. |
| Host | Start a light multiplayer game quickly. | Creates a private room and shares one simple join link or code. |
| Solo player | Get a fair, replayable challenge. | Plays a complete game against an AI with a transparent, adjustable level. |

## 4. Core game rules

### Definitions

- **Card:** a quotation, thinker, book, concept, or event plus its source
  record and approved chronology year.
- **Timeline:** a player's ordered, revealed cards. It always runs earliest to
  latest from left to right (or top to bottom on narrow screens).
- **Placement:** the gap a player chooses in their own timeline before a card
  is revealed.
- **Correct placement:** the hidden card's chronology year falls within the
  selected gap, inclusive of either adjacent boundary.
- **Round:** every active player receives one new card and makes a placement.

### Standard game

1. Each player begins with one revealed starter card. Starter cards are chosen
   far enough apart that early rounds are not arbitrary.
2. On their turn, a player sees the card prompt and an optional neutral prompt
   such as “place this on your timeline.” They may not see its chronology year
   or other answer-revealing metadata.
3. The player chooses a gap before, between, or after cards already on their
   timeline, then confirms.
4. The card flips to reveal its chronology year, relevant context, a concise
   explanation, and a link to the selected source record.
5. A correct card joins the timeline in that gap. An incorrect card is not
   added. The player receives the defined points either way.
6. After all players have completed the same number of turns, the game ends;
   highest score wins. Ties use the most correct placements, then share the
   win if still tied.

### Default configuration

| Setting | Default | Options |
| --- | ---: | --- |
| Players | 2 | solo + AI, or 2–6 humans |
| Rounds per player | 10 | 5, 10, 15 |
| Timer | off | off, 30 s, 60 s |
| Difficulty | standard | introductory, standard, expert |
| AI difficulty (solo) | Scholar | Curious, Scholar, Oracle |

The host selects settings in the lobby. In solo mode the player selects them
before the game. A game must display its active settings in the game header.

### Scoring

- Correct placement: **1 point**.
- Incorrect placement: **0 points**.
- A timed-out turn: **0 points**; the card is revealed and discarded.
- No streak bonuses, steals, or penalties in Version 1.

This keeps the score explainable, avoids a runaway lead, and lets the timeline
itself communicate progress. Game length is fixed by rounds, not by the number
of correct placements, so every player gets equal turns.

## 5. Solo mode: player versus AI

Solo mode uses the same turn and scoring rules as multiplayer. The player and
the AI have independent timelines and draw from the same eligible card pool;
they never receive the exact same card within a game. This prevents the AI's
reveals from accidentally teaching the player a hidden answer.

### AI turn

1. The player completes and sees the result of their turn.
2. The AI's hidden card is shown briefly as an “AI is thinking” card. It does
   not reveal the answer prematurely.
3. The AI visibly marks its selected gap in its timeline, pauses long enough
   for the player to understand that choice, then reveals and scores its card
   using the same validation code as a human turn.
4. The AI's completed timeline and score remain visible. Its choices are never
   altered after the result is known.

The AI is a deterministic game simulation, not a live language-model call.
That makes it fast, inexpensive, privacy-preserving, and auditable.

### AI difficulties

| Level | Intended feel | Placement model |
| --- | --- | --- |
| Curious | Friendly beginner | Chooses the correct gap about 45% of the time; otherwise makes a plausible nearby error. |
| Scholar | Default fair challenge | Chooses the correct gap about 65% of the time; errors cluster near the correct era. |
| Oracle | Strong but beatable | Chooses the correct gap about 82% of the time; may make occasional close errors. |

The target percentages are calibrated over a large eligible-card sample, not
forced in every individual game. The AI must never see a card result and then
choose its placement. It receives only the card's hidden `ai_knowledge_band`
(a deliberately coarse era band) and its current revealed timeline; its error
profile determines whether it picks the correct, adjacent, or a farther gap.

At game end, the UI should say that AI skill is simulated and show the selected
difficulty. It must not imply that a model “knows” or reasons about philosophy.

## 6. Card and content design

### What a card contains

Each card has two states.

**Hidden state:** the card's playable prompt and an optional neutral language
label or citation cue (for example, “fragment”). The prompt is the quote text,
thinker name, book title, concept label/short description, or event title. It
must not expose the chronology year or other answer-revealing metadata.
Thinker cards explicitly identify the target as the thinker's **birth year**;
players should never need to infer which date convention applies.

**Revealed state:** chronology year, a clear explanation of what that year
represents, the relevant thinker/work/event metadata, quote language and
translator where applicable, a 1–3 sentence context note, tradition/topic
tags, and a source link.

### Chronology policy

Every playable card has one displayed, integer year (including BCE years). That
year is a deliberate editorial anchor, never a vague century/range label. The
game orders by this best-supported year:

- **Quotation card:** the approved composition or publication year of the
  quoted work.
- **Thinker card:** the thinker's birth year, unless the card explicitly
  concerns a named work or intervention, in which case use that work/event's
  year.
- **Book card:** composition or first publication year, selected consistently
  for the card and stated in its reveal explanation.
- **Concept card:** the earliest verified year in which the named philosophical
  concept was formulated or published in the intended sense.
- **Event card:** the year in which the event occurred.

For ancient or otherwise uncertain material, editorial research selects the
single most defensible conventional year and records its source, rationale, and
confidence. A card cannot be published unless that choice is strong enough to
be fair to players; content with only a century/range, or an irreconcilably
disputed year, stays out of the game. This preserves the specific-year rule
without pretending the underlying scholarship is more certain than it is.

If two cards share an approved year, either order is correct. The client should
say “same year” rather than reject a valid placement.

### Editorial standards

- Start with roughly 180–250 cards, enough for repeat play but small enough to
  fact-check closely. Include all five card types, and expand in reviewed
  packs.
- Balance eras, regions, traditions, genders, and philosophical fields. The
  initial set must include ancient Mediterranean, South Asian, East Asian,
  Islamic-world, African, Indigenous (where sources and permissions permit),
  European, and modern global traditions.
- Store an attribution confidence level. Exclude quotations that are popular
  but untraceable, misleadingly shortened, or materially disputed unless the
  uncertainty itself is made explicit in the card explanation.
- Prefer public-domain primary texts or original, licensed translations.
  Translation copyright, not just the original author's age, must be checked.
- Keep quotations and prompts short enough to play on a phone. An accessible
  plain-text transcription is required even if a stylized card treatment is
  added later.
- Every production card is reviewed by an editor before it can enter gameplay;
  cards are never published directly from an AI-generated import.

### Suggested content schema

```text
cards
  id (UUID)
  card_type (quotation | thinker | book | concept | event)
  prompt_display
  prompt_plain_text
  quote_display
  quote_plain_text
  original_language (nullable)
  translation_credit (nullable)
  philosopher_display_name
  work_title (nullable)
  passage_reference (nullable)
  chronology_year (integer)
  chronology_year_basis (work_composed | work_published | birth |
                         concept_formulated | event_occurred)
  chronology_rationale
  attribution_confidence (high | medium | disputed)
  explanation
  source_url
  rights_status
  tradition_tags (text[])
  topic_tags (text[])
  difficulty (introductory | standard | expert)
  ai_knowledge_band
  status (draft | reviewed | published | retired)
  created_at, updated_at
```

`chronology_year` is a signed integer (BCE negative). Only `published` cards
with a specific approved year are selectable for a game.

## 7. Player experience and screens

### Entry and mode selection

The home screen explains the game in one sentence and offers:

- **Play solo** — opens settings, then begins immediately against AI.
- **Create a room** — host selects settings and receives a private share link
  and short join code.
- **Join a room** — player enters a code or follows a share link.
- **How it works** — a short interactive or static three-step explanation.

Solo players create or sign into a lightweight account to save their progress.
Version 1 should offer passwordless email sign-in; it must explain what is
saved and provide account deletion. A visitor may play one guest solo game, but
is prompted to sign in before progress is retained. Multiplayer remains usable
as a guest: a guest chooses a display name, which is validated, limited in
length, and filtered for unsafe content. The app should not expose a searchable
room directory.

### Gameplay screen

The active player's view contains:

- Current score, round, and optional timer.
- Their revealed timeline with clear drop targets before, between, and after
  cards. On small screens, use explicit “place before/after” controls as an
  alternative to drag-and-drop.
- One large hidden card and a confirmable selected placement.
- A result state with the revealed metadata, explanation, and score change.
- For multiplayer, player names and scores, but no other player's hidden card
  or placement until the round resolves.

Screen-reader users must be able to move a card through a named list of
positions, such as “after Arendt, before Fanon,” and receive the reveal result
in an announced live region. Respect `prefers-reduced-motion`; avoid a flip
animation when it is set.

### End screen

Show winner, score table, each final timeline, and a concise learning recap
(for example, three eras encountered). Offer **Play again** with the same
settings and **New game**. Do not automatically share results publicly.

## 8. Multiplayer and realtime behavior

### Room lifecycle

1. A host creates a room with settings. The server assigns an unguessable room
   ID and a short, collision-resistant join code.
2. Guests join the lobby with a display name. The host may start once the
   configured minimum is met; the lobby caps at six humans.
3. The server creates a full game state and assigns hidden cards server-side.
4. During a round, only the active player receives their hidden card. Others
   see a waiting state. (Simultaneous-turn mode is deferred.)
5. A server-authoritative action validates each placement, updates scores and
   timeline, then broadcasts the public reveal.
6. Finished rooms expire after a defined retention window; abandoned lobbies
   and games expire sooner.

### Reconnection and failure rules

- Rejoining with the same room link and a private session token restores the
  player if the game has not expired.
- A disconnected player's turn is paused briefly, then skipped on timeout;
  the host may not edit another player's turn.
- Server time, not browser time, determines turn expiry.
- Every mutating request uses a game version/action ID so retries cannot score
  a card twice.
- If realtime delivery is missed, the client fetches the authoritative game
  snapshot and resumes from it.

## 9. Technical architecture

The application will live in its own repository and deploy as its own Vercel
project on a Cogitster subdomain. It may use an Astro interface with isolated
interactive components, or another lightweight web framework if implementation
needs prove that choice better; the API and data ownership below remain the
contract.

### Backend

- **Supabase Postgres**, in a dedicated `cogitster` schema within VibeTrunk's
  shared Supabase project, stores cards, rooms, games, players, turns, and
  audit actions.
- **Supabase Realtime** distributes authorised room/game state changes.
- **Server-side functions/routes** create games, deal cards, validate
  placements, simulate AI turns, and enforce timers. The browser never decides
  correctness or receives future hidden cards.
- **Passwordless player accounts** identify solo players and own their saved
  progress. **Anonymous auth or signed guest sessions** identify multiplayer
  guests. Room membership is checked for every room read/write.
- **Row-level security** protects stored data; browser access uses only the
  public Supabase URL and anonymous key. A service-role key is server-only and
  never committed or sent to the client.

### Core tables

```text
cogitster.rooms        room settings, state, join-code hash, expiry timestamps
cogitster.room_players membership, display name, seat, reconnect identity
cogitster.player_profiles
                      authenticated player profile and privacy/account settings
cogitster.solo_progress authenticated player's completion, stats, unlocked decks
cogitster.games        authoritative game phase, round, version, seed metadata
cogitster.game_players score, active status, player timeline summary
cogitster.turns        dealt card, actor, selected gap, result, timestamps
cogitster.timeline_entries
                      revealed card order and chronology key per player
cogitster.cards        editorial card catalogue (see section 6)
cogitster.game_actions idempotency/audit record for state-changing actions
```

The exact normalisation can evolve, but raw hidden-card data must never be
broadcast in a general room payload. A player receives at most their current
hidden card; spectators and opponents receive only public/revealed fields.

### State machine

```text
lobby -> dealing -> player_turn -> reveal -> next_turn -> finished
                     |               |
                     +-> paused -----+
```

All transitions are validated on the server. `finished` is terminal; replay
creates a new game/seed instead of reopening the finished record.

### Fairness and security requirements

- Generate card order server-side with a cryptographically secure random
  source; store enough seed/audit metadata to investigate disputes without
  exposing future cards during a game.
- Validate that a proposed gap belongs to the acting player's current timeline.
- Rate-limit room creation, join attempts, and game actions; cap request size
  and display-name length.
- Hash join codes at rest if the implementation supports lookup efficiently;
  always use high-entropy room IDs in share URLs.
- Set sensible expiry and deletion/aggregation policies before launch. Keep
  only the minimum guest data needed for an active game.
- Use Content Security Policy, HTTPS, input encoding, and dependency updates.
  Add automated tests for unauthorised reads, action replay, and hidden-card
  exposure.

## 10. Analytics and success measures

Use privacy-minimising, aggregate product analytics only after the consent and
legal approach is decided. Do not record card prompt text, guest display names, or
room codes as analytics properties.

Initial signals:

- Solo game completion rate.
- Multiplayer room created -> game started conversion.
- Median number of rounds completed and replay rate.
- Correct-placement rate by difficulty, era, card, and AI level.
- Card report/removal rate and content coverage gaps.
- Reconnect/recovery success rate and realtime error rate.

The first content/AI tuning review should use these signals plus qualitative
playtests, not a single global “engagement” target.

## 11. Acceptance criteria for Version 1

1. A new visitor can start a 10-round solo game against AI without signing in.
2. Every solo turn resolves against the same server-side placement validator
   used for human players.
3. The three AI difficulty modes deliver statistically distinct, documented
   target win/correctness rates over a test corpus and never inspect the
   reveal result before choosing a gap.
4. A host can create a private 2–6-player room; invited guests can join and
   finish a game with synchronized score and timeline results.
5. No client can obtain an opponent's or a future card's hidden prompt/answer
   through normal API/realtime traffic.
6. Each published card has one displayed specific year, a documented basis and
   source, attribution confidence where applicable, and rights/translation
   review status in editorial data.
7. Keyboard-only and screen-reader users can complete a placement and receive
   an announced result; reduced-motion settings suppress non-essential motion.
8. An authenticated solo player can close and later resume their saved progress
   on another device; a guest multiplayer client can reconnect to an
   in-progress, unexpired game without corrupting scores or duplicating a turn.

## 12. Decisions needed before implementation

The following product choices are now confirmed:

- Version 1 includes quotation, thinker, book, concept, and event cards. Every
  card has one specific chronology year.
- Launch language is English only.
- The first release covers a broad, global philosophy timeline.
- Saved solo progress is a Version 1 requirement; guest multiplayer remains
  available without an account.
- Multiplayer uses sequential turns. Only the active player receives a hidden
  card; other players wait for its public reveal before the next turn begins.

## 13. Recommended next steps

1. Build a 20-card editorial prototype and run five or more in-person/remote
   playtests before committing to visual design or realtime infrastructure.
2. Establish a source, attribution, and translation-rights review workflow.
3. Create the separate application repository from the VibeTrunk template,
   including Supabase schema/RLS tests and a minimal solo vertical slice.
4. Add AI simulation and a small private-room flow, then tune with playtest
   results before expanding the card catalogue.

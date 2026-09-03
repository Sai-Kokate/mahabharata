# Patterns & How-To Guides

Conventions this codebase already follows consistently. Match them rather than introducing a
parallel style — the whole point of most of these is that the client and server can never
disagree, and that only holds if new code respects the same boundaries.

## How to: add a new mutation the game table can call

1. Write the `mutation` in `convex/avalon.ts` (or the relevant module), with a full `v.*`
   argument validator — no exceptions, per the Convex guidelines this project follows.
2. Re-validate anything the client already checked (setup legality, card legality, party
   membership) — the client's checks are UX-only. See `startGame` re-running `validateSetup()`,
   `playQuestCard` re-running `clampQuestCard()`.
3. Add the corresponding field to `TableActions` in `src/table/index.tsx:20-48`.
4. Implement it once in `src/App.tsx`'s `tableActions` object (`App.tsx:269-311`), wrapping the
   `useMutation` call and pinning `code`/`playerId` — every mutation error should flow through the
   existing `act`/`wrap` funnel (`App.tsx:206-213,314-321`) so it surfaces via the shared `error`
   prop, not a bespoke try/catch per screen.
5. Consume it from the relevant phase screen via `props.actions.yourNewAction(...)`.

**Anti-pattern to avoid**: calling `useMutation` directly from inside a `src/table/*.tsx` screen.
Every existing screen goes through `TableActions` — a screen that imports `api` directly breaks
the one-funnel error handling and makes `App.tsx` no longer the single place mutation wiring
lives.

## How to: add a rule, and keep the client from disagreeing with the server

Any number, matrix, or eligibility check that both the client (for disabling buttons, showing
previews) and the server (for enforcement) need should live in `convex/logic.ts`, as a pure
function with no `ctx` and no I/O — never duplicated as a hand-written constant in `src/`.

This is why `LobbyScreen`'s "can we start?" check, `RulesPage`'s team/quest-size tables,
`LearnPage`'s walkthrough numbers, and `avalon.ts`'s actual enforcement all import the *same*
`TEAM_COUNTS`/`QUEST_SIZES`/`doubleFailQuests`/`validateSetup` functions from `convex/logic.ts`.
If you add a new rule and find yourself writing the threshold twice — once in a screen, once in a
mutation — stop and factor it into `logic.ts` instead.

**Anti-pattern to avoid**: hardcoding a rule-derived number (a team size, a plot-card window, an
expansion's minimum player count) directly in a React component. It will drift the next time the
underlying rule changes, exactly the class of bug this project's whole `logic.ts` convention
exists to prevent.

## How to: add a new theme ("world")

Themes are a **data change, not a code change** (`README.md`).

1. Add a `ThemeConfig` entry to the `THEMES` record in `convex/themes.ts`: `id`, `name`,
   `tagline`, `crestIcon`, `goodTeamName`/`evilTeamName`, a 13-key `colors` palette (or reuse
   `INDIA_COLORS`/`MEDIEVAL_COLORS`), 13 `roles` entries (one per engine role id — `merlin`,
   `percival`, `guinevere`, `tristan`, `isolde`, `lancelot_good`, `servant`, `assassin`,
   `morgana`, `mordred`, `oberon`, `lancelot_evil`, `minion`), optional `expansions` renames, and
   `winReasons` copy.
2. **It will not appear in the theme picker** until you also add its `id` to
   `PLAYABLE_THEME_IDS` (`convex/themes.ts:1130`) — `THEME_LIST`, what `LandingPage`/`App`
   actually render, is derived from that constant, not from every key in `THEMES`. See
   [OVERVIEW.md §9](./OVERVIEW.md#9-a-live-discrepancy-worth-knowing) for why three themes
   currently exist in `THEMES` but not in `THEME_LIST`.
3. If the theme should be free rather than premium, add its `id` to `FREE_THEME_IDS`
   (`convex/logic.ts:247`) — the default for any new theme is premium-gated.
4. Never remove a theme id once a room may have used it — `README.md` explicitly notes that
   `THEMES` retains ids past their playable lifetime so old rooms still resolve.

## How to: add a new plot card

1. Add the card's id, `name`, `desc`, `kind` (`instant` | `usable` | `effect`), and `window` (if
   `usable`) to the `PLOT_CARDS` registry in `convex/logic.ts`.
2. If it's `usable` or has a targeting/eligibility rule, implement the case in `playPlotCard`
   (`convex/avalon.ts:1440-1607` — see the existing per-card `case` blocks for the pattern each
   card type follows: instants resolve immediately or during `resolveAutoInstant`, usables check
   `room.phase` against the card's `window`).
3. Decide whether it should be logged publicly (`plotLog`, the default), leave a public mark
   (`plotMarks`, for "Charge"/"We Found You"-style persistent effects), or stay entirely private
   (a `secrets` row addressed by `toId`, the pattern "Ambush" uses to leave zero trace).
4. Add the card's per-theme rename (if any) to each `ThemeConfig.expansions.plots.cards` entry in
   `convex/themes.ts` — a card without a theme rename just falls back to its base English name.
5. `RulesPage.tsx` and `LearnPage.tsx` both iterate `Object.values(PLOT_CARDS)` — a new card
   appears in both automatically, with no additional doc-page code required.

## How to: add a new "beat" to the `/learn` walkthrough

`src/learn/scenarios.ts` is pure data; `src/learn/Stage.tsx` renders any `Beat` generically and
contains no scenario-specific logic. Add a new `Scenario` object to the `SCENARIOS` array (or a
new `Beat` to an existing scenario's `beats` array) — no new component code is needed unless the
beat needs a *new kind* of visual element `Stage.tsx` doesn't already know how to render (seat
states, card flips, vote tallies, quest track, rejection track, a stamp banner all already
exist). If a rule the beat describes changes, the beat's `say`/`note` prose must be hand-edited —
it is narration, not derived from the engine, unlike the numeric tables `LearnPage.tsx` imports
directly.

## How to: add a per-player secret

Model it as a row in the `secrets` table (`toId`, `kind`, `subjectId`, and whichever of
`card`/`team` applies), addressed and queried via the existing `by_room_to` index — never as a
field you plan to null out on other players' documents. See
[SECURITY.md §2](./SECURITY.md#2-server-authoritative-game-state--getrooms-per-viewer-filtering)
for why this table shape is what actually makes leaking another player's secret structurally
impossible, not just unlikely.

## How to: add a timed/expiring phase window

Follow the `plot`/`kingReturns`/`excalibur`/`lady` pattern exactly:

1. Add the phase literal to `rooms.phase` in `convex/schema.ts`.
2. Enter it via `enterTimedPhase(ctx, room, "yourPhase", YOUR_MS)` (`avalon.ts:224-240`), which
   sets `phaseEndsAt` and schedules `internal.avalon.autoAdvance`.
3. Add a `case "yourPhase":` branch to `autoAdvance` (`avalon.ts:1097-1178`) that resolves the
   window to its "nobody acted" outcome — every existing timed window has one, so a disconnected
   player can never stall the table.
4. Always re-check `room.phase === expectedPhase && room.roundId === roundId` (and `questIndex`
   if relevant) at the top of the scheduled handler before mutating — scheduled callbacks run
   outside the transaction that scheduled them and must guard against the game having already
   moved on.

## Error-handling pattern (client)

Every mutation call site in `src/table/*` and `App.tsx` wraps the call in the shared `act`/`wrap`
helper (`App.tsx:206-213,314-321`): try the mutation, and on rejection set a single `msg`/`error`
state string surfaced by `TableShell` in one place. No screen implements its own error banner —
adding one would fragment the single error-display convention the rest of the app relies on.

## Anti-patterns this codebase deliberately avoids (don't reintroduce them)

- **Unbounded arrays on a hot document.** `rooms` never grows an array per vote/quest-card/plot
  action — those all live in dedicated tables. See [DATABASE.md §3](./DATABASE.md#3-notable-schema-design-choices).
- **Trusting a client-supplied identifier for authorization.** Every entitlement/admin check
  derives identity from `ctx.auth`, never from an argument — see
  [SECURITY.md §5](./SECURITY.md#5-payment--admin-trust-boundary).
- **Counting the full roster for round-completion checks.** Vote/quest-card completion counts
  only `presentOf(seated)` (excludes `departedAt` players) — counting everyone is a deadlock, since
  a departed player's vote is never coming. Sizing rules (team split, quest sizes) intentionally
  use the *full* seated roster regardless of departures, so losing a player never quietly changes
  the game's math mid-round. Don't conflate the two counts when adding new phase-completion logic.
- **A single `mode`/`current` slot for a queue of things the user must see.** `RevealCeremony`
  used to overwrite a single reveal slot when both a vote and a quest resolved at once, silently
  dropping one; it's now a real FIFO queue keyed by a content-derived dedup key. If you add
  another "must be shown once" UI event, queue it — don't slot it.
- **Coloring a result before the reveal has played.** `RevealCeremony`'s danger/success styling
  is gated on a GSAP-timeline `settled` checkpoint, specifically because an earlier version
  colored the plate on the first frame, spoiling the result before the cards visually flipped.

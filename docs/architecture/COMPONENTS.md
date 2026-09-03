# Component Catalog

## Top-level pages (`src/`)

| Component | File | Route | Convex dependency | Purpose |
|---|---|---|---|---|
| `App` | `App.tsx` (576 lines) | `/play`, invite links | `avalon.*` (every mutation), `billing.viewer` | The gate (convene/join/rejoin) and the mount point for `Table` + `RevealCeremony`; owns `playerId`, room `code`, and every `TableActions` implementation. |
| `LandingPage` | `LandingPage.tsx` (256) | `/` | `billing.viewer`, `billing.paymentConfig` | Front door; paints its own board outside the shared shell. Shows sign-up CTA or `AccountCard` depending on `viewer.signedIn`. |
| `RulesPage` | `RulesPage.tsx` (570) | `/rules` | none (data-driven from `convex/logic.ts` + `convex/themes.ts` imports, no live query) | The rulebook; every number (team sizes, quest sizes, plot cards, night order) is imported from the engine so it can't drift from real behavior. |
| `SignInPage` / `SignInCard` | `SignIn.tsx` (251) | `/signin` | `useAuth()` (from `src/auth.ts`) | Four-mode card: sign in, sign up, request reset, verify reset. |
| `UpgradePage` | `UpgradePage.tsx` (429) | `/upgrade` | `billing.viewer/paymentConfig/myOrders/mySubscription`, `submitOrder/cancelMyOrder/updateMyMembers` | Plan picker, UPI QR (`qrcode.react`), payment-ref submission, seat editor, order history. |
| `AdminPage` | `AdminPage.tsx` (543) | `/admin` | `billing.adminOverview/adminOrders/adminSubscriptions/adminUsers` + all `admin*` mutations | Orders / Subscriptions / Users / Grant tabs; client-side `isAdmin` gate is UX-only, server re-enforces via `requireAdmin`. |
| `LearnPage` | `LearnPage.tsx` (345), lazy-loaded | `/learn` | **none** — no query, mutation, or auth of any kind | Standalone animated walkthrough; imports rule *data* (`PLOT_CARDS`, `NIGHT_ORDER`, `TEAM_COUNTS`) from the engine but never executes it. |

## The game table (`src/table/`)

```
src/table/
  index.tsx           phase router + the TableActions interface
  types.ts            Room type DERIVED from getRoom's return type
  TableShell.tsx       board chrome: topbar, phase banner, clock alert, host controls
  Parts.tsx            QuestColumn, ChronicleColumn, SeatRing (room→CouncilSeal mapping)
  LobbyScreen.tsx       seats, watcher queue, host setup controls
  NightScreen.tsx       role card (hold-to-reveal) + night-order script
  RoleReveal.tsx        the shared press-and-hold hook + persistent "hold to see your lot" widget
  ProposeScreen.tsx     team selection, clock, Excalibur assignment; exports <Riders>
  VoteScreen.tsx        hidden votes; exports <KingReturnsScreen>
  QuestScreen.tsx       card choice; exports <ExcaliburScreen>, <QuestResultPlate>
  LadyScreen.tsx        eligible-target grid, past holders disabled
  AssassinScreen.tsx    candidate grid, Merlin/lovers mode toggle
  ReckoningScreen.tsx   endgame ledger, full allegiance reveal
  PlotHand.tsx          dealing UI, own hand, private intel, public log
```

### Phase routing (`index.tsx:50-118`)

A flat sequence of `room.phase === "..."` conditionals — not a lookup table — selects exactly one
primary screen, plus two overlay phases rendered via the shared `Plate` component
(`kingReturns` → `KingReturnsScreen`, `excalibur` → `ExcaliburScreen`), and `PlotHand`, which
renders unconditionally beneath every phase. Every screen receives a common `base` props object
(`{ room, pid, theme, emblemSrc, account, worlds, act }`) plus its phase-specific action
callback(s) from `TableActions`.

### `TableActions` (`index.tsx:20-48`)

The single interface every screen uses to trigger server mutations — implemented once, in
`App.tsx:269-311`. Adding a new player action means adding one field here and one
implementation in `App.tsx`; no screen calls `useMutation` directly.

### `Room` type derivation (`types.ts:9-13`)

```ts
export type Room = NonNullable<FunctionReturnType<typeof api.avalon.getRoom>>;
```

`Room` is structurally inferred from `getRoom`'s actual return type, not hand-declared — a
server-side field rename/removal breaks every screen that reads it at **compile time**, which is
the explicit reason this replaced an earlier hand-written `RoomView` interface. `TablePlayer` and
`Watcher` are further derived as indexed-access types off `Room["players"][number]` /
`Room["watchers"][number]`.

### Per-screen responsibilities

| Screen | Phase | Reads | Triggers | Notable UX |
|---|---|---|---|---|
| `LobbyScreen` | `lobby` | roster, watcher queue, `opts` | `onStart`, `onSwapSeat`, `onRemovePlayer`, `onSetOpts`, `onChangeTheme` | `validateSetup()` (same `logic.ts` import as the server) disables "begin" for an illegal roster before the round-trip. |
| `NightScreen` | `reveal` | `me.role`, `known`, theme's `NIGHT_ORDER` | `onBegin` (host only) | Role info gated behind `useHold()`; watchers see a fixed "no role" card. |
| `RoleReveal` | overlay, every non-lobby/reveal phase | `me.role` | none (read-only re-check) | Persistent "hold to see your lot" widget mounted by `TableShell`. |
| `ProposeScreen` | `propose`, `plot` (shared) | `room.discussEndsAt/selectEndsAt`, seat ring | `onPropose(team, excaliburId)` | Local `picked`/`sword` state resets on `roundId`/`questIndex` change so stale selections never survive a committed round. |
| `VoteScreen` | `vote` | `voteProgress`, `openVotes` (Charge-marked only) | `onVote(choice)` | Never reveals a vote until resolution; seats flip to `"voted"` without exposing the choice. |
| `KingReturnsScreen` (in `VoteScreen.tsx`) | `kingReturns` | `kingReturnsPassed` | `onPlay` / `onPass` | Overlay on top of whatever board was showing. |
| `QuestScreen` | `quest` | `questProgress`, `me.allowedCards` | `onCard(card)` | Buttons gated by server-computed `allowedCards`; explains forced cards and the `goodMayFail` house rule inline. |
| `ExcaliburScreen` (in `QuestScreen.tsx`) | `excalibur` | `excaliburHolder` | `onUse(targetId?)` / `onSeal` | Only the holder sees action buttons; everyone else waits. |
| `LadyScreen` | `lady` | `ladyHolder`, `ladyHistory` | `onUse(targetId)` | Result is never shown on this screen — only via `mySecrets`. |
| `AssassinScreen` | `assassin` | `opts.lovers` | `onStrike(mode, targetId, targetId2?)` | Mode toggle (Merlin vs. the lovers); non-assassins see a fixed danger panel. |
| `ReckoningScreen` | `end` | full role reveal, `winReason` | `onNewGame` | The only screen where per-viewer role filtering is lifted. |
| `PlotHand` | unconditional overlay | `room.myHand`, `room.mySecrets`, `room.plots.log` | `onDeal`, `onPlay(card, target?)`, `onDiscard` | Self-guards (`return null` if no cards/secrets); bespoke per-card-type targeting logic. |

## Shared primitives

- **`CouncilSeal.tsx`** — the seat-ring renderer. Scales across 5–18 seats via `ringMetrics(n)`
  (four size bands), positions seats at `seatPosition(i, n)` (clockwise from -90°, 42% radius).
  Seat visual states: `idle | leader | named | voted | spent`, each mapped to CSS classes and
  sigil coloring — never to a role or team color, since that would leak allegiance.
- **`src/table/Parts.tsx` → `SeatRing`** — the room-to-`CouncilSeal` adapter: computes
  deterministic sigils via `dealSigils()`, and lets each phase screen supply its own
  `stateFor`/`noteFor`/`onSelect`/`isDisabled` callbacks.
- **`sigils.tsx`** — 18 hand-drawn CSS/`clipPath` marks, chosen deterministically per player via
  an FNV-1a hash of `playerId` (`sigilIndex`), with `dealSigils()` resolving hash collisions by a
  bounded one-lap linear probe (fixed a prior infinite-loop bug once player count exceeded the
  palette size).
- **`RevealCeremony.tsx`** — the GSAP-driven vote/quest "unveil" ceremony, mounted by `App.tsx`
  (not the phase router). Queues `lastVote`/`lastQuest` events (deduped, `sessionStorage`-gated
  against replay), and only applies danger/success styling to the result plate **after** the
  animation timeline reaches a `settled` checkpoint — the plate can never visually spoil the
  result before the reveal has actually played out.
- **`TableShell.tsx`** — board chrome: topbar (brand, room code, premium badge, nav links),
  `PhaseBanner` (per-phase "what is the table waiting for" line with an `urgent` flag),
  `ClockAlert` (a one-shot toast fired on the crossing of `discussEndsAt`, not retroactively for
  late-opening tabs), host controls (`Confirm`-gated Restart/New council/Close council), and the
  universal Leave button.
- **`TableParts.tsx`** — `ClockFuse` (second-granularity countdown, deliberately non-smooth),
  `QuestLadder` (per-quest party size / resolved tally), `RejectionTrack` (5-pip reject counter),
  `Chronicle` (the persistent public ledger, distinct from `RevealCeremony`'s transient
  animation), `Plate` (the generic modal-overlay template every interstitial screen uses).

## Design system

The gameplay surface ("Council Seal") is a flat, brass/parchment design system with no gradients
or shadows, implemented in `src/seal.css` (imported after `src/styles.css` so its tokens win on
gameplay screens). The spec lives in `design/COUNCIL_SEAL.md` and
`design/Verdict Council Seal Flow.dc.html`. Non-gameplay pages (landing, rules, sign-in, upgrade,
admin, learn) share `src/styles.css` and read as one visual surface with the table via the shared
`.vd-board`/`.vd-content` shell classes.

# API Reference — Convex Function Surface

Decevia has no REST/GraphQL API. Its "API" is the set of Convex `query`/`mutation` functions the
client calls via `useQuery`/`useMutation`, referenced as `api.<file>.<exportName>` (file-based
routing per Convex convention — a function exported from `convex/avalon.ts` is `api.avalon.x`).
`internalMutation`s are listed for completeness but are **not** reachable from any client; they
only run via the scheduler or a cron.

Every function validates its arguments with `v.*` validators at the boundary (a Convex
requirement) — argument shapes below are simplified for readability; see the cited file:line for
the exact validator.

## `convex/avalon.ts` — the game engine

| Function | Kind | Args | Purpose | Line |
|---|---|---|---|---|
| `createRoom` | mutation | `playerId, name, themeId?, opts` | Create a new lobby room | 633 |
| `joinRoom` | mutation | `code, playerId, name, rejoin?` | Join or rejoin a room (see [FLOWS.md](./FLOWS.md#flow-9-disconnect--rejoin)) | 644 |
| `leaveRoom` | mutation | `code, playerId` | Leave; purges the room if now empty | 709 |
| `closeRoom` | mutation | `code, playerId` | Host disbands the room outright | 810 |
| `startFreshRoom` | mutation | `code, playerId` | Host closes this room and opens a new one under a new code, carrying theme/opts forward | 833 |
| `removePlayer` | mutation | `code, playerId, targetId` | Host kicks another player | 873 |
| `swapSeat` | mutation | `code, playerId, watcherId, seatedId` | Host pulls a watcher into a seat (lobby only) | 903 |
| `setOpts` | mutation | `code, playerId, opts` | Host changes role/expansion options (lobby only, paywall-checked) | 929 |
| `changeTheme` | mutation | `code, playerId, themeId` | Host changes the world/theme (lobby only, paywall-checked) | 962 |
| `startGame` | mutation | `code, playerId` | Validate setup, deal roles, enter `reveal` | 974 |
| `beginQuests` | mutation | `code, playerId` | Host advances from `reveal` into round 0 | 1037 |
| `proposeTeam` | mutation | `code, playerId, team[], excaliburId?` | Leader submits the mission team | 1180 |
| `castVote` | mutation | `code, playerId, choice` | Cast/update an approve/reject vote | 1233 |
| `playQuestCard` | mutation | `code, playerId, card` | Submit a success/fail card, server-clamped | 1281 |
| `useExcalibur` | mutation | `code, playerId, targetId?` | Holder flips a rider's card, or declines | 1332 |
| `useLady` | mutation | `code, playerId, targetId` | Holder inspects a never-inspected player | 1377 |
| `dealPlotCard` | mutation | `code, playerId, toId` | Leader deals the next queued plot card | 1412 |
| `playPlotCard` | mutation | `code, playerId, card, targetId?` | Play a usable/instant plot card | 1440 |
| `discardPlotCard` | mutation | `code, playerId, card` | Discard an unplayable instant card | 1609 |
| `sealQuest` | mutation | `code, playerId` | Close the Excalibur window early (sword unarmed only) | 1629 |
| `passKingReturns` | mutation | `code, playerId` | Decline to overturn the vote | 1646 |
| `assassinate` | mutation | `code, playerId, targetId, mode?, targetId2?` | Assassin's final guess; ends the game | 1667 |
| `newGame` | mutation | `code, playerId` | Host resets to `lobby`, same room/code/players | 1723 |
| `getRoom` | **query** | `code, playerId` | **The single reactive read model for the whole client** | 1750 |
| `sweepAbandonedRooms` | internalMutation | `{}` | Cron-triggered purge of rooms past `ROOM_TTL_MS` (12h) | 789 |
| `passSealIfLeaderIsSilent` | internalMutation | `roomId, roundId` | Scheduled: leader clock expired, passes leadership (not a rejection) | 1059 |
| `autoAdvance` | internalMutation | `roomId, phase, roundId, questIndex` | Scheduled: auto-resolves an expired `plot`/`kingReturns`/`excalibur`/`lady` window | 1097 |

`getRoom` is the only public query in this file — see [SECURITY.md](./SECURITY.md) for exactly
how it filters its output per viewer.

## `convex/billing.ts` — subscriptions, seats, orders

**Public (any caller):**

| Function | Kind | Args | Purpose | Line |
|---|---|---|---|---|
| `viewer` | query | `{}` | Signed-in/premium/admin snapshot — drives the whole client's paywall UI | 26 |
| `paymentConfig` | query | `{}` | Pricing, UPI details, free/premium theme & option lists — no auth required | 49 |

**Buyer (signed-in, not admin):**

| Function | Kind | Args | Purpose | Line |
|---|---|---|---|---|
| `myOrders` | query | `{}` | Caller's own order history | 64 |
| `mySubscription` | query | `{}` | Caller's subscription + resolved member emails | 78 |
| `submitOrder` | mutation | `plan, memberEmails[], paymentRef, note?` | Submit a purchase request; price computed server-side via `priceFor(plan)` | 110 |
| `cancelMyOrder` | mutation | `orderId` | Withdraw a still-pending order | 161 |
| `updateMyMembers` | mutation | `emails[]` | Owner edits covered emails (owner's own email always force-included) | 176 |

**Admin-only** (every one calls `requireAdmin(ctx)` first, throwing `"Admins only."` otherwise):

| Function | Kind | Args | Purpose | Line |
|---|---|---|---|---|
| `adminOrders` | query | `status?` | List/filter purchase requests | 195 |
| `adminSubscriptions` | query | `{}` | All subscriptions with resolved members + live status | 205 |
| `adminOverview` | query | `{}` | Dashboard counts (pending/approved orders, live subs, seats, revenue, users, rooms) | 235 |
| `adminUsers` | query | `{}` | Every user with computed entitlement + admin flag | 261 |
| `adminApproveOrder` | mutation | `orderId, days?, adminNote?` | Approve — extends or creates the subscription + seats | 290 |
| `adminRejectOrder` | mutation | `orderId, adminNote?` | Reject a pending order | 350 |
| `adminGrantSubscription` | mutation | `email, plan, days?, seats?, memberEmails?, adminNote?` | Direct/comp grant, bypassing the order flow | 369 |
| `adminSetSeats` | mutation | `subscriptionId, emails[]` | Rewrite a subscription's covered emails | 413 |
| `adminSetStatus` | mutation | `subscriptionId, status, expiresAt?` | Revoke / reactivate / extend (`+N days` is this + a computed `expiresAt`) | 423 |
| `adminDeleteSubscription` | mutation | `subscriptionId` | Delete a subscription and its seat rows | 441 |

## `convex/entitlements.ts` — identity, admin, pricing (not directly called by the client)

Exposes helpers consumed by `avalon.ts` and `billing.ts`: `signedInUser`, `requireUser`,
`isAdminEmail`, `requireAdmin`, `entitlementForEmail`, `callerEntitlement`, `roomEntitlement`,
`pricing`, `priceFor`. See [SECURITY.md](./SECURITY.md) for the exact entitlement algorithm.

## `convex/auth.ts` / `convex/passwordReset.ts` — authentication

Not called directly via `api.*` from application code — the client talks to Convex Auth's own
generated surface via `useAuthActions()`/`signIn()` (wrapped by `src/auth.ts`'s `useAuth()`
hook). See [FLOWS.md](./FLOWS.md#flow-2-password-reset) for the sign-in/reset sequence.

## `convex/crons.ts`

Declares one scheduled job: `crons.interval("sweep abandoned rooms", { hours: 6 },
internal.avalon.sweepAbandonedRooms, {})`.

## Client-side "API" wrapper — `TableActions`

The frontend never calls `useMutation` directly from a phase screen. `src/table/index.tsx:20-48`
defines `TableActions`, a stable interface of async callbacks (`start`, `propose`, `vote`,
`card`, `useExcalibur`, `sealQuest`, `useLady`, `strike`, `dealPlot`, `playPlot`, `discardPlot`,
`playKingReturns`, `passKingReturns`, `newGame`, `restart`, `close`, `startFresh`, `setOpts`,
`changeTheme`, `swapSeat`, `removePlayer`, `leave`), implemented once in `src/App.tsx:269-311`
as thin wrappers around the `useMutation` calls above, each pinning `code`/`playerId`
automatically. Adding a new mutation means adding one entry here and one implementation in
`App.tsx` — see [PATTERNS.md](./PATTERNS.md).

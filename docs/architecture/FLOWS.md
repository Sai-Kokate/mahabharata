# End-to-End Flows

Ten representative flows through the system, each with a trigger, a sequence diagram, a
step-by-step walkthrough, and the error/edge paths that matter.

## Flow 1: Create a Room → Join → Start a Game

**Trigger**: a player opens `/`, clicks "Convene," enters a name.

```mermaid
sequenceDiagram
    actor Host
    actor Guest
    participant App as App.tsx (Host tab)
    participant Convex
    actor GuestApp as App.tsx (Guest tab)

    Host->>App: enter name, click "Convene a council"
    App->>Convex: mutation createRoom({playerId, name, themeId, opts})
    Convex->>Convex: mintRoom() — insert rooms + players (host, seat 0)
    Convex-->>App: { code: "ABCD" }
    App->>App: setCode("ABCD"), sessionStorage["decevia.code"]
    App->>Convex: useQuery getRoom({code:"ABCD", playerId})
    Convex-->>App: reactive room snapshot (phase: "lobby")

    Guest->>GuestApp: open link .../?code=ABCD, enter name
    GuestApp->>Convex: mutation joinRoom({code, playerId, name})
    Convex->>Convex: insert players row, seat = next dense index
    Convex-->>GuestApp: { code, status: "joined" }
    Note over Convex: rooms/players documents changed
    Convex-->>App: getRoom subscription pushes updated roster
    Convex-->>GuestApp: getRoom subscription pushes room snapshot

    Host->>App: toggle roles/expansions, click "Cast the lots & begin"
    App->>Convex: mutation setOpts / startGame({code, playerId})
    Convex->>Convex: validateSetup() — reject if illegal roster
    Convex->>Convex: buildRoles() — shuffle & deal roles
    Convex->>Convex: patch rooms: phase="reveal"
    Convex-->>App: getRoom push (phase: "reveal", me.role visible)
    Convex-->>GuestApp: getRoom push (phase: "reveal", me.role visible)
```

**Notes**: `startGame` (`avalon.ts:974`) re-validates the roster server-side even though
`LobbyScreen` already ran the identical `validateSetup()` client-side (imported straight from
`convex/logic.ts`) to disable the start button — the client check is a UX convenience, the
server check is the actual gate. If a client somehow submits an illegal roster anyway (stale UI,
tampered request), `startGame` throws and no roles are dealt.

## Flow 2: Password Reset

**Trigger**: a user on `/signin` clicks "Forgot your password?"

```mermaid
sequenceDiagram
    actor User
    participant SignIn as SignIn.tsx
    participant Auth as src/auth.ts useAuth()
    participant ConvexAuth as Convex Auth (Password provider)
    participant Reset as passwordReset.ts
    participant Email as email.ts
    participant Resend

    User->>SignIn: enter email, click "Send me a code"
    SignIn->>Auth: requestPasswordReset(email)
    Auth->>ConvexAuth: signIn("password", {email, flow:"reset"})
    ConvexAuth->>Reset: generateVerificationToken()
    Reset->>Reset: numericCode(6) via crypto.getRandomValues (rejection-sampled)
    ConvexAuth->>Reset: sendVerificationRequest({identifier: email, token})
    Reset->>Email: sendEmail({to, subject:"Your reset code: NNNNNN", html, text})
    alt RESEND_API_KEY configured
        Email->>Resend: POST /emails (fetch, no SDK)
        Resend-->>Email: 200 OK
        Email-->>Reset: true
    else not configured
        Email-->>Reset: false
        Reset--xConvexAuth: throw "Password reset is unavailable..."
    end
    Auth-->>SignIn: {ok: true} (always, even if email unregistered — anti-enumeration)
    SignIn->>SignIn: switch to mode "resetVerify"

    User->>SignIn: type 6-digit code + new password, "Set new password"
    SignIn->>Auth: completePasswordReset(email, code, newPassword)
    Auth->>ConvexAuth: signIn("password", {email, code, newPassword, flow:"reset-verification"})
    ConvexAuth->>ConvexAuth: validate code (15min expiry, single-use) + email pairing
    alt valid
        ConvexAuth-->>Auth: session established
        Auth-->>SignIn: {ok: true}
        SignIn->>SignIn: onDone() → navigate("/play")
    else invalid/expired
        ConvexAuth--xAuth: throw
        Auth-->>SignIn: {ok:false, error:"That code was wrong or has expired..."}
    end
```

**Error-path asymmetry (deliberate)**: an unconfigured `RESEND_API_KEY` makes the *reset* email
fail loudly (the user is actively waiting for it), while the same missing key makes the
*welcome* email on sign-up fail silently, logged only via `console.error` — the account is
created either way, since a welcome note isn't worth failing a sign-up over
(`convex/email.ts` header comment; see [SECURITY.md](./SECURITY.md#4-authentication-security)).

## Flow 3: Propose → Vote → Rejection (Leadership Rotates)

**Trigger**: the round enters `propose`; the leader names a team the table doesn't approve.

```mermaid
sequenceDiagram
    actor Leader
    actor PlayerB
    participant Convex

    Note over Convex: enterPropose() sets discussEndsAt, selectEndsAt,<br/>schedules passSealIfLeaderIsSilent
    Leader->>Convex: mutation proposeTeam({code, playerId, team[], excaliburId?})
    Convex->>Convex: validate team size (QUEST_SIZES), no departed members
    Convex->>Convex: patch rooms: proposedTeam, phase="vote"; clear phaseEndsAt
    Convex-->>Leader: getRoom push (phase:"vote")
    Convex-->>PlayerB: getRoom push (phase:"vote")

    Leader->>Convex: mutation castVote({choice:"reject"})
    PlayerB->>Convex: mutation castVote({choice:"reject"})
    Note over Convex: castVote counts only presentOf(seated) —<br/>departed players never block resolution
    Convex->>Convex: resolveVotes(): all present voted, rejecters > approvers
    Convex->>Convex: applyRejection(): rejectCount++, NOT >= MAX_REJECTS(5)
    Convex->>Convex: leaderIndex = (leaderIndex+1) % n; roundId++; enterPropose()
    Convex-->>Leader: getRoom push (phase:"propose", new leader, lastVote public)
    Convex-->>PlayerB: getRoom push (phase:"propose", new leader, lastVote public)
    Note over Leader,PlayerB: RevealCeremony plays the "unveil" animation<br/>off room.lastVote — approvers/rejecters now public
```

**If this were the 5th consecutive rejection**, `applyRejection` (`avalon.ts:342-352`) sets
`phase:"end", winner:"evil"` instead of rotating leadership — five rejected proposals in a row is
an outright evil win, no further play. **If the leader instead lets the clock run out** without
proposing, `passSealIfLeaderIsSilent` (`avalon.ts:1059-1091`) rotates leadership the same way but
records `lastSkip` and does **not** touch `rejectCount` — a timeout is explicitly not a
rejection, per `README.md`'s clock table.

## Flow 4: Quest Resolution with Excalibur

**Trigger**: all riders on an approved team have submitted their quest cards, and Excalibur is
armed (holder is a party member).

```mermaid
sequenceDiagram
    actor Rider1
    actor Rider2
    actor SwordHolder
    participant Convex

    Rider1->>Convex: mutation playQuestCard({card:"success"})
    Convex->>Convex: clampQuestCard() — server enforces role-legal card
    Rider2->>Convex: mutation playQuestCard({card:"fail"})
    Convex->>Convex: afterAllQuestCards(): all riders in, swordArmed(room)==true
    Convex->>Convex: phase="excalibur", enterTimedPhase(45s), schedule autoAdvance
    Convex-->>SwordHolder: getRoom push (phase:"excalibur", questProgress counts only)

    SwordHolder->>Convex: mutation useExcalibur({targetId: Rider2.playerId})
    Convex->>Convex: flip that questCards row (fail→success), flipped:true
    Convex->>Convex: record public lastExcalibur {holderId, targetId, used:true}
    Convex->>Convex: finishQuest(): tally fails vs failsNeeded(n, questIndex)
    alt fails >= failsNeeded
        Convex->>Convex: questResults[i]="fail"; check 3-fail evil win
    else
        Convex->>Convex: questResults[i]="success"; check 3-success → assassin phase
    end
    Convex->>Convex: build lastQuest (transient) + append questLog (durable)
    Convex-->>Rider1: getRoom push (new phase, lastQuest public summary)
    Convex-->>Rider2: getRoom push (new phase, lastQuest public summary)
    Note over Rider1,Rider2: RevealCeremony's QuestUnveil plays card-flip animation;<br/>plate does not turn red until GSAP timeline reaches "settled"
```

**Timeout branch**: if nobody acts within 45s, `autoAdvance(phase:"excalibur")`
(`avalon.ts:1143-1155`) records non-use and calls `finishQuest` anyway — the sword holder cannot
stall the table by disconnecting.

## Flow 5: Lady of the Lake

**Trigger**: a quest (index 1–3, i.e. after quest 2, 3, or 4) just resolved, the room has 7+
players with `opts.lady` enabled, and a never-inspected target remains.

```mermaid
sequenceDiagram
    actor Holder
    participant Convex

    Note over Convex: finishQuest() opens the lady window automatically
    Convex->>Convex: enterTimedPhase("lady", 60s), schedule autoAdvance
    Convex-->>Holder: getRoom push (phase:"lady", eligible targets minus ladyHistory)

    Holder->>Convex: mutation useLady({targetId})
    Convex->>Convex: insert secrets row {toId: Holder, kind:"lady", team: currentTeam(target)}
    Convex->>Convex: ladyHolder = targetId; ladyHistory.push(target)
    Convex->>Convex: record public lastLady {holderId, targetId} — never the result
    Convex->>Convex: beginRound(questIndex+1) — next round begins
    Convex-->>Holder: getRoom push — mySecrets now contains the private allegiance read
    Note over Holder: Only Holder's getRoom response contains this secret,<br/>scoped by the secrets.by_room_to index
```

Everyone else at the table sees only the public fact that an inspection happened and who was
targeted — never the result. If the 60s timer expires unattended, `autoAdvance(phase:"lady")`
auto-assigns the first eligible un-inspected target and performs the identical secret-write, so
the game never stalls on a disconnected holder.

## Flow 6: Plot Card — "Ambush" (the only card with zero public trace)

**Trigger**: a player holding the Ambush card plays it during the `quest` or `excalibur` window.

```mermaid
sequenceDiagram
    actor Ambusher
    actor Target
    participant Convex

    Ambusher->>Convex: mutation playPlotCard({card:"ambush", targetId})
    Convex->>Convex: delete Ambusher's plotHands row for "ambush"
    Convex->>Convex: read Target's already-played questCards row
    Convex->>Convex: insert secrets row {toId: Ambusher, kind:"ambush", card: Target's card}
    Note over Convex: NOT written to plotLog — the one card type<br/>that leaves no public record at all
    Convex-->>Ambusher: getRoom push — mySecrets now reveals Target's card
    Convex-->>Target: getRoom push — nothing different; Target never learns they were ambushed
```

Contrast with **"We Found You"**, which is the opposite extreme: it writes a `plotMarks` row
(`kind:"revealCard"`) that forces the target's card to be publicly shown in `lastQuest.revealed`
once the quest resolves — a fully public reveal rather than a private one.

## Flow 7: Assassin's Strike (Endgame)

**Trigger**: Good has just completed its 3rd successful quest; phase enters `assassin`.

```mermaid
sequenceDiagram
    actor Assassin
    participant Convex
    participant AllPlayers as Every other client

    Note over Convex: finishQuest() sets phase="assassin" (3 successes reached)
    Convex-->>AllPlayers: getRoom push (phase:"assassin", "the knife is out")

    Assassin->>Assassin: pick mode (Merlin, or "the lovers" if opts.lovers)
    Assassin->>Convex: mutation assassinate({targetId, mode, targetId2?})
    Convex->>Convex: check target(s) against actual Merlin / lovers pair
    alt correct guess
        Convex->>Convex: phase="end", winner:"evil", winReason: assassinHit copy
    else wrong guess
        Convex->>Convex: phase="end", winner:"good", winReason: assassinMiss copy
    end
    Convex-->>AllPlayers: getRoom push (phase:"end", every role now revealed)
    Note over AllPlayers: ReckoningScreen renders full seat-by-seat allegiance table
```

Only at this final `getRoom` push does the per-viewer role/team filtering described in
[SECURITY.md](./SECURITY.md) lift — `phase === "end"` is the one condition under which every
player's role becomes visible to every viewer.

## Flow 8: Purchase → Admin Approval → Entitlement Unlock

**Trigger**: a signed-in user submits a UPI payment reference on `/upgrade`.

```mermaid
sequenceDiagram
    actor Buyer
    participant Upgrade as UpgradePage.tsx
    participant Convex
    actor Admin
    participant AdminPage

    Buyer->>Upgrade: pick plan, scan UPI QR, pay out-of-band, paste UTR reference
    Upgrade->>Convex: mutation submitOrder({plan, memberEmails, paymentRef, note})
    Convex->>Convex: amountInr = priceFor(plan) — computed server-side, never trusted from client
    Convex->>Convex: insert orders row, status:"pending"

    Admin->>AdminPage: open /admin → Orders tab
    AdminPage->>Convex: query adminOrders({}) [requireAdmin gate]
    Admin->>Admin: verify the UTR manually against their own bank/UPI app
    Admin->>Convex: mutation adminApproveOrder({orderId, days?, adminNote?})
    Convex->>Convex: requireAdmin(ctx) — throws if caller not in ADMIN_EMAILS
    alt buyer already has a live subscription
        Convex->>Convex: extend: subscription.expiresAt += span
    else
        Convex->>Convex: create new subscriptions row
    end
    Convex->>Convex: replaceSeats(subscriptionId, memberEmails, seatCount)
    Convex->>Convex: patch orders: status:"approved", reviewedAt, reviewedByEmail

    Note over Convex: No caching layer — entitlement is recomputed<br/>from seats+subscriptions on every read
    Buyer->>Convex: useQuery(api.billing.viewer, {}) [next render]
    Convex->>Convex: entitlementForEmail(): find live seat row → premium:true
    Convex-->>Buyer: viewer.premium = true — unlocked immediately, no propagation delay
```

**Trust boundary**: the client never supplies `amountInr`; `priceFor(plan)`
(`entitlements.ts:178-181`) is the sole source, and `orders.amountInr` is snapshotted at
submission so a later price change can't retroactively alter what was charged
(`schema.ts:99`). See [SECURITY.md](./SECURITY.md#5-payment--admin-trust-boundary).

## Flow 9: Disconnect & Rejoin

**Trigger**: a seated player's tab closes mid-game; they open the invite link again later.

```mermaid
sequenceDiagram
    actor Player
    participant TabA as Original tab (dead)
    participant TabB as New tab (same browser, or new device)
    participant Convex

    Note over TabA,Convex: Tab closes — server is told nothing directly
    Note over Convex: room stays exactly as it was;<br/>Player's players row is untouched until they act again

    Player->>TabB: open invite link, type the SAME name, click Join
    TabB->>Convex: mutation joinRoom({code, playerId: NEW random id, name, rejoin: false})
    Convex->>Convex: normalizeName(name) matches an existing seated player
    Convex-->>TabB: { status: "nameTaken" } — does NOT transfer the seat yet
    TabB->>TabB: show "X is already at that table — rejoin as X?"

    Player->>TabB: click "Rejoin as X"
    TabB->>Convex: mutation joinRoom({code, playerId, name, rejoin: true})
    Convex->>Convex: clear departedAt on the ORIGINAL players row
    Convex-->>TabB: { code, playerId: ORIGINAL id, status: "rejoined" }
    TabB->>TabB: sessionStorage["decevia.pid"] = ORIGINAL id; setPid(original)
    TabB->>Convex: useQuery getRoom({code, playerId: ORIGINAL id})
    Convex-->>TabB: full room state — role, votes cast, quest cards, everything reunited
```

**Why the two-step**: an automatic silent takeover on name match would let anyone who merely
knows a seated player's display name steal their seat by typing it into a join form. Requiring
an explicit `rejoin: true` confirmation is a deliberate (if non-cryptographic) speed bump — see
[SECURITY.md](./SECURITY.md#7-known-accepted-weaknesses-documented-not-oversights).

**If the game was still in `lobby`** when the player left, their row was deleted outright
(seats stay dense via `compactSeats`) rather than marked `departedAt` — there's no dealt state to
preserve yet, so "rejoin" there is really just "join again."

## Flow 10: Abandoned Room Sweep (Cron)

**Trigger**: the 6-hourly cron fires (`convex/crons.ts`), or a prior sweep found a full batch and
self-rescheduled.

```mermaid
sequenceDiagram
    participant Cron as Convex cron (every 6h)
    participant Sweep as sweepAbandonedRooms (internalMutation)
    participant DB

    Cron->>Sweep: runAfter trigger
    Sweep->>DB: query rooms, order("asc") [by _creationTime], take(100)
    Sweep->>Sweep: filter to rooms._creationTime < now - 12h
    loop each stale room
        Sweep->>DB: clearSubmissions(roomId) — delete votes, questCards,<br/>plotHands, plotLog, plotMarks, secrets (all by_room* indexes)
        Sweep->>DB: delete players (by_room index)
        Sweep->>DB: delete the room document
    end
    alt exactly 100 of 100 were stale (backlog may run deeper)
        Sweep->>Sweep: ctx.scheduler.runAfter(60_000, sweepAbandonedRooms, {})
    else fewer than 100 stale
        Sweep->>Sweep: done — next run is the regular 6h cron tick
    end
```

**Why batched at 100**: a Convex mutation is one atomic transaction with hard ceilings (4,096
index-range reads, 16,000 writes). Purging one room costs ~7 index reads plus every row hanging
off it; an unbounded sweep on a large backlog could exceed those limits and roll back the
**entire** transaction — nothing purged, and the backlog never shrinks. The self-reschedule after
60s (rather than waiting for the next 6-hour tick) is what actually drains a large backlog in a
reasonable time. The identical `purgeRoom`/`clearSubmissions` pair also backs the manual
**"Close council"** mutation (`avalon.ts:810-818`) — one purge implementation, two callers.

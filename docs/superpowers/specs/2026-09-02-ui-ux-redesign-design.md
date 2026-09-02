# UI/UX redesign: unify on Verdict, fix cross-app friction

Date: 2026-09-02
Status: approved, pending implementation plan

## Summary

The app already carries a deliberate, high-quality visual design system —
"Verdict" / "the Council Seal" (`src/seal.css`, documented in
`design/COUNCIL_SEAL.md`): flat blackened surfaces with paper grain, brass for
state, parchment for actions you can take, Cinzel/Garamond/Manrope type, zero
gradients/glow/shadow, a 4px spacing scale. It is fully applied to the landing
page, sign-in, the `/learn` walkthrough, and the entire game table.

Three screens never got it — `RulesPage.tsx`, `UpgradePage.tsx`,
`AdminPage.tsx` — and still run on the pre-redesign look (`styles.css`:
indigo/gold gradients, glowing buttons, a different type system). That
three-screen mismatch is the most visible "unpolished" thing in the app today,
because it reads as a different product mid-navigation.

Separately, an audit of the *already-redesigned* screens (game table,
onboarding, learn) found a set of real UX friction points — confusing flows,
missing feedback, a couple of accessibility gaps — that are independent of
visual style and worth fixing in the same pass, since the brief asks for
clarity and accessibility, not just visual consistency.

This spec covers both. It does **not** touch game rules, Convex schema, or
backend logic — pure frontend (components + CSS), with one documented
exception (see "Out of scope").

## Goals

1. Rules / Upgrade / Admin look and behave like the rest of the app: same
   type scale, same button/field/panel/badge vocabulary, same spacing.
2. Fix the friction points the audit found, prioritized by impact and cost.
3. Add no new visual language — every new class is built from tokens that
   already exist in `seal.css`. No new colors.

## Non-goals

- Restyling the landing page, sign-in, learn, or the game table — they are
  already on-system. This pass may touch their *behavior* (see the friction
  fixes below) but not their look.
- Backend/game-logic changes. One friction finding (host-disconnect recovery)
  needs a new server-side mechanism and is explicitly deferred — see "Out of
  scope."
- Adding features beyond what's listed (no new admin capabilities, no new
  billing flows).

---

## Part A — New shared Verdict components

All added to `src/seal.css`, using existing `--vd-*` tokens only. Each is
generic enough to serve more than one of the three target pages, which is the
point: build the pattern once, reuse it three times.

### `.vd-page`

The header block already used ad hoc on the gate and sign-in pages, formalized
as one reusable pattern: back-link (`vd-pill` with `ArrowLeft`), `vd-label`
kicker, Cinzel `h1`, `vd-voice` lede paragraph. Replaces `rules-hero` /
`rules-kicker` / `rules-lede` / `rules-back`.

### `.vd-toc`

A jump-nav: a row of anchor links to a page's own section `id`s. Sticky in a
left rail on desktop (≥1024px, alongside the content column); a horizontally
scrolling pill row on mobile, matching the theme-row/world-row scroll pattern
already used elsewhere. This directly fixes Rules having ten section anchors
(`#how-it-plays`, `#winning`, `#table-size`, `#beyond-ten`, `#sight`,
`#night`, `#lancelot`, `#expansions`, `#roles`, `#themes`) that nothing
currently links to.

### `.vd-tabs`

A real tablist: `role="tablist"` / `role="tab"` / `aria-selected`, visually
the segmented-control look already used for Convene/Join and Sign
in/Create account (`.vd-seg`), generalized to N items instead of 2. Replaces
Admin's repurposed `rules-theme-btn` pill row, which has no tab semantics
today.

### `.vd-stat`

A flat bordered tile — Cinzel numeral (matching the clock's numeral
treatment), Manrope label underneath, `--vd-rule-container` border, no
shadow. Replaces `admin-tile`. Used for Admin's overview strip.

### `.vd-choice-card`

A selectable 2-up card: generalizes the world-picker's interaction
(`.vd-world`: bordered card, `is-on` state shows a brass border + check) into
a reusable pattern for "pick one of a few options with a visible price/detail
line." Used for Upgrade's monthly/yearly plan picker, replacing
`billing-plan`.

### `.vd-table`

A bordered row-list generalizing the existing `rules-map` head/row idea into
Verdict's language — `--vd-rule-structure` dividers, Manrope uppercase column
labels, no zebra striping (flat). Used for Admin's orders/subscriptions/users
lists and Upgrade's order history, replacing `rules-map`/`admin-order`.

### Status badges

Reuse the state vocabulary the design doc already defines rather than invent
a new "success" color:

| Meaning | Treatment |
|---|---|
| pending / in progress | brass outline pill (echoes the "voted" seat state: brass border, idle face) |
| approved / live / active | filled parchment pill (echoes "named/riding": parchment fill) |
| rejected / revoked / cancelled | red outline pill (the existing `--vd-red` — used for exactly this: rejection) |

No new hue is introduced. Replaces `billing-badge`.

---

## Part B — Page redesigns

### Rules (`RulesPage.tsx`)

- Wrap in `.vd-page` + `.vd-toc`. Content, copy, and section order are
  unchanged — this is a container/nav change, not a content rewrite.
- `rules-flow` steps, `rules-callouts`, `rules-win` cards, `rules-quests`
  gems, `rules-sight` rows, `rules-role` cards, and the theme-mapper table all
  move onto Verdict panels (`vd-panel`, `vd-studded` where a plate reads as
  "act on this," flat bordered `vd-table` rows for the mapper) — same
  information, same layout shape, restyled.
- The two "back" links at the top (`← How to play`, `← Back to council`)
  become a single `vd-page` back-link row instead of two ad hoc anchors with
  an inline `style={{marginRight:18}}`.

### Upgrade (`UpgradePage.tsx`)

- `.vd-page` header.
- Status card (free/premium/pending) as a `vd-studded` plate using the badge
  vocabulary above.
- Seat/plan picker as `.vd-choice-card`s.
- QR payment block stays on a **white** card — the one deliberate exception,
  because a UPI scanner needs real black-on-white contrast; everything around
  it (the explanatory copy, the reference-number field) is Verdict.
- Member-email fields as `vd-field` grids; the buyer's own seat is visibly
  fixed/non-editable text, not a field, so "which of these is required" stops
  being ambiguous.
- Order history as `.vd-table`.
- Submit/save buttons get `vd-btn--primary` + the `vd-spin` loading treatment
  already used in Sign in, replacing the ad hoc `btn-gold-hover billing-btn`
  mix.

### Admin (`AdminPage.tsx`)

- `.vd-page` header.
- Overview strip as `.vd-stat` tiles.
- Section switcher (orders/subs/users/grant) as real `.vd-tabs`.
- All three lists as `.vd-table`.
- Destructive actions unified on the app's own two-tap `Confirm` component
  (already built in `TableShell.tsx` for Restart/New council/Close council)
  instead of the current mix of a native `window.confirm()` (Delete
  subscription) and no confirmation at all (Revoke). Reject on a pending
  order also gets the same two-tap treatment, since it's a real financial
  decision.
- Numeric-looking inputs (`days`, `seats`) get `inputMode="numeric"` so
  mobile keyboards match the expected input.

---

## Part C — Friction fixes (from the cross-app audit)

Grouped by priority. Each was verified against the actual source, not just
observed behavior.

### High priority

1. **Gate's default tab mismatches the landing page's primary CTA.**
   `LandingPage.tsx`'s "Join the council" button links to `/play`, but
   `App.tsx` defaults `activeTab` to `"create"` and only flips to `"join"`
   when a `?code=` param is present. A user who explicitly chose "join"
   arrives on a screen titled toward creating a room. Fix: default to the
   join tab when there's no active session and no create-intent signal, or
   retitle the landing CTA.
2. **World picker stays interactive (and misleading) on the Join tab.**
   `App.tsx`'s world-selection grid renders unconditionally; a joiner's
   selection is silently discarded server-side (only `createRoom` reads
   `localThemeId`). Fix: hide it, or replace it with static "World is set by
   the host" copy, when `activeTab === "join"`.
3. **No "How to play" link on the actual gate screen.** Only the marketing
   landing page links to `/learn`; invite-link arrivals (`?code=...`) skip
   the landing page entirely and never see that link. Fix: add it to
   `Home()`'s footer in `App.tsx` alongside Rules/Sign in/Admin.
4. **Removing a player from the lobby has no confirmation.** Every other
   destructive table action (Restart, New council, Close council, Leave)
   goes through the shared `Confirm` two-tap pattern in `TableShell.tsx`;
   the lobby's remove-player `X` does not, despite sitting on a small touch
   target next to the player's name. Fix: route it through `Confirm`.
5. **Role reveal is unreachable by keyboard.** `RoleReveal.tsx`'s hold-to-
   reveal wires only `onPointerDown`/`onPointerUp`/`onPointerCancel`; a
   keyboard-activated button fires `click`, not synthetic pointer events, so
   a non-pointer user can never see their own role. Fix: add matching
   `onKeyDown`/`onKeyUp` handlers for Enter/Space.
6. **The shared `Plate` overlay claims `aria-modal` but has no focus trap or
   Escape handling.** `RevealCeremony.tsx` already implements both (Escape
   listener, `autoFocus` on its action button); `Plate` in `TableParts.tsx`
   — reused by King Returns, Excalibur, and quest-result overlays — has
   neither. Fix: move that logic down into `Plate` so every overlay built on
   it inherits it.

### Medium priority

7. **Gate inputs don't submit on Enter**, unlike every field on the sign-in
   card. Fix: add the same `onKeyDown` pattern.
8. **Disabled lobby options explain themselves only via a hover `title`**,
   which never fires on touch — this app's primary surface. Fix: an inline
   caption under the disabled control instead of (or in addition to) the
   tooltip.
9. **Restart / New council / Close council read as three interchangeable
   buttons** until the confirm step's fine print is read. Fix: visually
   differentiate them (grouping, icon, or a short inline description) rather
   than relying on label text alone under time pressure.
10. **Night phase's "Begin" has no readiness signal**, unlike Vote and Quest,
    which both show "X of Y have acted." Fix: track a per-player "has held
    their card" flag and surface the same count.
11. **The `/learn` walkthrough's per-beat animations ignore
    `prefers-reduced-motion`**, even though the landing page and `/learn`'s
    own page-load animation both check it. This is the one *repeating*
    animation surface in the app (autoplay every 4.2s), which makes the gap
    the most consequential instance of it. Fix: gate `Stage.tsx`'s GSAP
    calls behind the same `matchMedia` check.

### Low priority

12. **`/learn`'s jump-nav is missing an entry** for its own "How the table
    splits" section (`#table`), which exists and is real reference content.
    Fix: add the link.

### Out of scope (flagged, not fixed here)

- **Host-disconnect recovery.** Every phase-advancing action (start, begin,
  restart, new council, close) is host-gated with no host-migration or
  timeout mechanism; if the host's tab dies, no one else can advance the
  game. This needs new server-side logic (a host-transfer mutation, at
  minimum), not a UI change — it's a resilience feature, not a UI/UX polish
  item, so it's named here for visibility and left for a separate pass.

---

## Testing / verification

No backend changes, so no Convex-side testing. For the frontend:

- `tsc -b` must stay clean (the project's own build gate).
- Manual pass in the browser for each of the three redesigned pages, at
  mobile (390px) and desktop widths, matching the two reference sizes the
  original Council Seal handoff used.
- Manual pass on the six friction fixes that are interaction-visible
  (join-tab default, world picker on join, lobby remove-confirm, keyboard
  role-reveal, Plate Escape/focus, Enter-to-submit on the gate) — these are
  UI behavior, not something a type-check catches.
- `prefers-reduced-motion` checked via the OS/DevTools emulation for the
  `/learn` fix.
- No new dependency, no schema change, no new Convex function — nothing
  needs a Convex deploy beyond the existing dev loop.

## Rollout order

1. Add the six new shared components to `seal.css` (Part A) — no visual
   change yet, since nothing consumes them.
2. Rebuild Admin on them (smallest audience, easiest to sanity-check).
3. Rebuild Upgrade.
4. Rebuild Rules (largest content volume, so goes last once the patterns are
   proven on the other two).
5. Friction fixes — independent of 1–4, can happen in parallel: high-priority
   items first, then medium, then low.

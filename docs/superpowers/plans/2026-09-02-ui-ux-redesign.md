# UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Rules, Upgrade, and Admin onto the app's existing Verdict/Council Seal design system, and fix the concrete UX friction points found in a full-app audit — without touching backend/game logic or restyling the screens that are already on-system.

**Architecture:** Add a small number of new shared CSS patterns to `src/seal.css`, built entirely from tokens that already exist there. Rebuild the three legacy pages' markup onto those patterns and the primitives that already exist (`.vd-panel`, `.vd-pill`, `.vd-field`, `.vd-btn`, `.vd-world`/`.vd-opt`, `.vd-seg`). Then apply eleven independent, narrowly-scoped fixes to onboarding, the lobby, role reveal, overlays, and the walkthrough.

**Tech Stack:** React 18 + TypeScript, Vite, plain CSS (no CSS-in-JS, no Tailwind), Convex (untouched by this plan), lucide-react icons, GSAP (untouched except gating two calls). No test framework is configured in this project (`package.json` has no test script) — verification is `tsc -b` plus explicit manual QA steps per task, not automated tests.

**Spec:** `docs/superpowers/specs/2026-09-02-ui-ux-redesign-design.md`

## Global Constraints

- **No Convex/backend changes.** Every query, mutation, prop signature, and data shape stays exactly as it is today. This plan only changes markup, CSS, and a small number of client-only event handlers.
- **No new colors.** Every new CSS rule reuses an existing `--vd-*` token from `src/seal.css`. Do not introduce a hex value that isn't already a token.
- **Border radius 0 everywhere**, except sigil/seat discs (`50%`) — this is an existing, load-bearing rule of the design system (`design/COUNCIL_SEAL.md`).
- **No shadows, no gradients, no glow, anywhere.**
- **Minimum tap target 44px; a primary action button is 56px** (`.vd-btn`'s existing `min-height: 56px` already enforces this — don't override it downward).
- **Every destructive action** (delete, revoke, reject, remove-player) **uses the app's own two-tap `Confirm` component**, never the browser's native `window.confirm()` and never a bare one-tap button.
- **`tsc -b` must exit 0 after every task.** Run it from the repo root: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`.
- Dev server for manual QA: `npm run dev` (a second terminal must already be running `npx convex dev`, per this repo's own README — the app will otherwise hang on every query).

---

## File Structure

| File | Change |
|---|---|
| `src/seal.css` | Add shared page/toc/stats/rowlist/pill patterns (Task 1); delete the now-dead legacy remap shim (Task 4, final step) |
| `src/table/TableShell.tsx` | Export + generalize `Confirm` (Task 1); group the three destructive shellbar actions (Task 9) |
| `src/AdminPage.tsx` | Full rebuild onto Verdict (Task 2) |
| `src/UpgradePage.tsx` | Full rebuild onto Verdict (Task 3) |
| `src/RulesPage.tsx` | Full rebuild onto Verdict (Task 4) |
| `src/App.tsx` | Gate/onboarding fixes (Task 5) |
| `src/LandingPage.tsx` | One href change (Task 5) |
| `src/table/LobbyScreen.tsx` | Confirm-wrapped remove, inline disabled-reason (Task 6) |
| `src/table/RoleReveal.tsx` | Keyboard-accessible hold (Task 7) |
| `src/table/NightScreen.tsx` | Keyboard-accessible hold wiring + readiness reminder (Task 7, Task 10) |
| `src/TableParts.tsx` | `Plate` focus trap (Task 8) |
| `src/learn/Stage.tsx` | Reduced-motion gating (Task 11) |
| `src/LearnPage.tsx` | Jump-nav entry (Task 11) |

No files are created; no files are deleted (only a CSS block within `seal.css` is removed).

---

## Task 1: Shared Verdict primitives (CSS) + reusable `Confirm`

**Files:**
- Modify: `src/seal.css` (append new block at end of file)
- Modify: `src/table/TableShell.tsx:269-306` (export + generalize `Confirm`)

**Interfaces:**
- Produces (CSS classes, consumed by Tasks 2, 3, 4, 6): `.vd-page`, `.vd-page__back`, `.vd-page__head`, `.vd-page__section`, `.vd-toc`, `.vd-stats`, `.vd-rowlist`, `.vd-rowlist__head`, `.vd-rowlist__row`, `.vd-rowlist--3col`, `.vd-pill--parchment`, `.vd-pill--danger`, `.vd-pill.is-on`, `.vd-qr-frame`.
- Produces (component, consumed by Tasks 2, 6): `export function Confirm({ label, icon, ask, onConfirm, danger?, compact?, ariaLabel?, className? }): JSX.Element` from `src/table/TableShell.tsx`. `onConfirm: () => Promise<unknown>`. `compact` renders the icon without the label (for a small icon-only trigger like a roster row's remove control); `className` overrides the default `vd-textbtn` trigger style; `ariaLabel` sets both `aria-label` and `title` on the trigger.

- [ ] **Step 1: Append the new CSS block to `src/seal.css`**

Add this at the very end of the file (after the last rule, `.vd-chron__tally-of { ... }`):

```css

/* ============================================================================
   Page shell — Rules / Upgrade / Admin.

   A close read of the rest of this file found that most of what these three
   pages need already exists as a generic primitive (.vd-seg for tabs,
   .vd-panel--strong for stat tiles, .vd-world/.vd-opt for choice cards). What
   follows is the short, honest list of pieces that pattern didn't cover.
   ========================================================================== */

.vd-page {
  max-width: 820px;
  margin-inline: auto;
  padding: 40px 20px 64px;
}
@media (max-width: 720px) {
  .vd-page { padding: 24px 16px 48px; }
}
.vd-page__back { margin-bottom: var(--vd-5); display: flex; gap: var(--vd-2); flex-wrap: wrap; }
.vd-page__head {
  display: flex;
  flex-direction: column;
  gap: var(--vd-2);
  padding-bottom: 24px;
  margin-bottom: 32px;
  border-bottom: 1px solid var(--vd-rule-container);
}

/* Jump-nav: a wrapping row of the existing pill style — no new pill CSS. */
.vd-toc {
  display: flex;
  flex-wrap: wrap;
  gap: var(--vd-2);
  padding-bottom: 24px;
  margin-bottom: 32px;
  border-bottom: 1px solid var(--vd-rule-container);
}

/* Every vd-page section after the first gets a top rule, echoing how the old
   .rules-section did it. */
.vd-page__section {
  padding-top: 32px;
  margin-top: 32px;
  border-top: 1px solid var(--vd-rule-container);
}
.vd-page__section:first-of-type { padding-top: 0; margin-top: 0; border-top: 0; }

/* Admin's overview strip: lay several vd-panel--strong stat tiles in a row —
   the tile itself is the Lobby's "At the table" pattern, reused as-is. */
.vd-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--vd-2);
}

/* Bordered row-list: orders/users history, order history. NOT named .vd-table
   — that class already means the game board's 3-column layout (see "Table
   body" above); reusing the name would collide. */
.vd-rowlist { display: flex; flex-direction: column; }
.vd-rowlist__head {
  display: grid;
  gap: var(--vd-3);
  padding: 0 4px 8px;
  border-bottom: 1px solid var(--vd-rule-container);
  font: 700 8px/1 var(--vd-ui);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--vd-ink-dim);
}
.vd-rowlist__row {
  display: grid;
  gap: var(--vd-3);
  align-items: center;
  padding: 13px 4px;
  border-bottom: 1px solid var(--vd-rule-structure);
  font: 500 13px/1.4 var(--vd-ui);
  color: var(--vd-ink);
}
.vd-rowlist__row:last-child { border-bottom: 0; }
.vd-rowlist--3col > .vd-rowlist__head,
.vd-rowlist--3col > .vd-rowlist__row { grid-template-columns: 1fr 1fr auto; }
@media (max-width: 640px) {
  .vd-rowlist--3col > .vd-rowlist__head,
  .vd-rowlist--3col > .vd-rowlist__row { display: flex; flex-wrap: wrap; gap: 4px 14px; }
}

/* Status pills: extends the existing .vd-pill vocabulary. .vd-pill--brass
   already exists (used for "Premium") and doubles as "pending" here. */
.vd-pill--parchment { background: var(--vd-parchment); border-color: var(--vd-brass-edge); color: #171410; }
.vd-pill--danger { border-color: var(--vd-red-rule); color: var(--vd-red-ink); }
/* A selected pill in a picker row (Rules' player-count / theme picker) —
   mirrors .vd-seg's brass "is-active" fill. */
.vd-pill.is-on { background: var(--vd-brass); border-color: var(--vd-brass); color: #171410; }

/* The one deliberate exception to "no new visual language": a UPI QR code
   needs real black-on-white contrast to scan. */
.vd-qr-frame {
  display: inline-flex;
  background: #fff;
  padding: 12px;
  border: 2px solid var(--vd-brass);
}
```

- [ ] **Step 2: Export and generalize `Confirm` in `src/table/TableShell.tsx`**

Replace the existing `Confirm` function (lines 269-306):

```tsx
/** A destructive action that asks once. Two taps, no browser dialog. */
function Confirm({
  label, icon, ask, onConfirm, danger,
}: {
  label: string;
  icon: ReactNode;
  ask: string;
  onConfirm: () => Promise<unknown>;
  danger?: boolean;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button className="vd-textbtn" onClick={() => setAsking(true)}>
        {icon} {label}
      </button>
    );
  }

  return (
    <span className="vd-confirm">
      <span className="vd-confirm__ask">{ask}</span>
      <button
        className={`vd-textbtn ${danger ? "is-danger" : ""}`}
        onClick={() => {
          setAsking(false);
          void onConfirm();
        }}
      >
        Yes
      </button>
      <button className="vd-textbtn" onClick={() => setAsking(false)}>
        No
      </button>
    </span>
  );
}
```

with:

```tsx
/** A destructive action that asks once. Two taps, no browser dialog. */
export function Confirm({
  label, icon, ask, onConfirm, danger, compact, ariaLabel, className,
}: {
  label: string;
  icon: ReactNode;
  ask: string;
  onConfirm: () => Promise<unknown>;
  danger?: boolean;
  /** Icon-only trigger (e.g. a roster row's remove control) instead of the text-button row. */
  compact?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button
        className={className ?? "vd-textbtn"}
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => setAsking(true)}
      >
        {icon} {!compact && label}
      </button>
    );
  }

  return (
    <span className="vd-confirm">
      <span className="vd-confirm__ask">{ask}</span>
      <button
        className={`vd-textbtn ${danger ? "is-danger" : ""}`}
        onClick={() => {
          setAsking(false);
          void onConfirm();
        }}
      >
        Yes
      </button>
      <button className="vd-textbtn" onClick={() => setAsking(false)}>
        No
      </button>
    </span>
  );
}
```

This is a superset of the old signature — `TableShell.tsx`'s own three call sites (Restart/New council/Close council) pass none of the new optional props, so they're unaffected.

- [ ] **Step 3: Verify the build**

Run: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`
Expected: exits 0, no errors (the CSS addition can't fail `tsc`; the `Confirm` change is a widening of an existing type, so `TableShell.tsx`'s own usage still compiles).

- [ ] **Step 4: Manual smoke check — nothing existing changed visually**

Run `npm run dev` (with `npx convex dev` already running in another terminal), open the app, and confirm the gate, lobby, and a game in progress look pixel-identical to before — this task added CSS and widened a type but nothing consumes the new classes or props yet.

- [ ] **Step 5: Commit**

```bash
git add src/seal.css src/table/TableShell.tsx
git commit -m "$(cat <<'EOF'
feat: add shared Verdict page primitives, export Confirm

Adds .vd-page/.vd-toc/.vd-stats/.vd-rowlist and two status-pill
modifiers to seal.css, built from existing tokens only. Exports and
generalizes TableShell's Confirm component so it can be reused as a
compact icon-only trigger elsewhere.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Rebuild Admin on Verdict

**Files:**
- Modify: `src/AdminPage.tsx` (full rewrite)

**Interfaces:**
- Consumes: Task 1's CSS classes and `Confirm` from `./table/TableShell`.
- No change to any Convex query/mutation call — every `api.billing.*` call, argument, and field read is identical to the current file.

**Design notes for this task specifically:**
- Color mapping for admin actions follows the same logic the game table already uses: **parchment** = affirmative/primary (Approve, +30 days, Reactivate, Save seats, Grant — matches `.vd-card--success`'s material), **red outline** = destructive (Reject, Revoke, Delete — matches `.vd-card--fail`'s red-outlined-not-filled treatment), **brass outline** = neutral/in-progress (pending status). No new hue.
- Reject, Revoke, and Delete move onto `Confirm` (Reject and Revoke didn't have any confirmation before; Delete used `window.confirm()`).
- `days`/`seats` numeric-looking inputs get `inputMode="numeric"`.

- [ ] **Step 1: Replace the full contents of `src/AdminPage.tsx`**

```tsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "./auth";
import {
  ArrowLeft, BadgeCheck, Ban, Check, Clock, Crown, Gift, Loader2, LogOut,
  RefreshCw, ScrollText, Shield, Trash2, Users, X,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import { SignInCard } from "./SignIn";
import { Confirm } from "./table/TableShell";

const INR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
const fmtWhen = (ms: number) =>
  new Date(ms).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

type Tab = "orders" | "subs" | "users" | "grant";

export default function AdminPage() {
  const { signOut } = useAuth();
  const viewer = useQuery(api.billing.viewer, {});
  const [tab, setTab] = useState<Tab>("orders");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      if (ok) setMsg(ok);
    } catch (e: any) {
      setMsg(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (viewer === undefined) {
    return (
      <div className="vd-board">
        <div className="vd-content vd-center">
          <Loader2 size={26} className="vd-spin" color="var(--vd-brass)" />
        </div>
      </div>
    );
  }

  if (!viewer.signedIn) {
    return (
      <div className="vd-board">
        <div className="vd-content vd-page">
          <div className="vd-page__back">
            <a className="vd-pill" href="/play"><ArrowLeft size={11} /> Back to council</a>
          </div>
          <header className="vd-page__head">
            <span className="vd-label vd-label--brass"><Shield size={11} /> Admin</span>
            <h1 className="vd-h1">Admin console</h1>
            <p className="vd-voice">Sign in to continue.</p>
          </header>
          <SignInCard />
        </div>
      </div>
    );
  }

  // Not an admin: say so plainly rather than pretending the page does not exist.
  if (!viewer.isAdmin) {
    return (
      <div className="vd-board">
        <div className="vd-content vd-page">
          <div className="vd-page__back">
            <a className="vd-pill" href="/play"><ArrowLeft size={11} /> Back to council</a>
          </div>
          <header className="vd-page__head">
            <span className="vd-label vd-label--brass"><Shield size={11} /> Admin</span>
            <h1 className="vd-h1">Not your console</h1>
            <p className="vd-voice">
              <strong>{viewer.email}</strong> is not an admin on this deployment.
              Admin emails come from the <code>ADMIN_EMAILS</code> Convex
              environment variable.
            </p>
          </header>
          <button className="vd-pill" onClick={() => void signOut()}>
            <LogOut size={11} /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vd-board">
      <div className="vd-content vd-page">
        <div className="vd-page__back">
          <a className="vd-pill" href="/play"><ArrowLeft size={11} /> Back to council</a>
        </div>
        <header className="vd-page__head">
          <span className="vd-label vd-label--brass"><Shield size={11} /> Admin</span>
          <h1 className="vd-h1">Admin console</h1>
          <p className="vd-voice">
            Signed in as <strong>{viewer.email}</strong>
          </p>
          <button className="vd-textbtn" onClick={() => void signOut()}>
            <LogOut size={11} /> Sign out
          </button>
        </header>

        <Overview />

        <div
          className="vd-seg"
          role="tablist"
          aria-label="Admin sections"
          style={{ margin: "24px 0" }}
        >
          {([
            ["orders", "Payment requests", Clock],
            ["subs", "Subscriptions", Crown],
            ["users", "Users", Users],
            ["grant", "Grant a plan", Gift],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "is-active" : undefined}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              onClick={() => setTab(id)}
            >
              <Icon size={13} />
              <span className="vd-label" style={{ color: "inherit" }}>{label}</span>
            </button>
          ))}
        </div>

        {msg && (
          <p className="vd-panel vd-panel--danger vd-errline" style={{ margin: "0 0 20px" }}>
            {msg}
          </p>
        )}

        {tab === "orders" && <Orders run={run} busy={busy} />}
        {tab === "subs" && <Subscriptions run={run} busy={busy} />}
        {tab === "users" && <UsersList />}
        {tab === "grant" && <Grant run={run} busy={busy} />}
      </div>
    </div>
  );
}

/* ------------------------------- overview -------------------------------- */

function Overview() {
  const o = useQuery(api.billing.adminOverview, {});
  if (!o) return null;
  const tiles: Array<[string, string]> = [
    ["Pending", String(o.pendingOrders)],
    ["Live plans", String(o.liveSubscriptions)],
    ["Seats covered", String(o.seatsCovered)],
    ["Approved", String(o.approvedOrders)],
    ["Collected", INR(o.revenueInr)],
    ["Users", String(o.users)],
    ["Open rooms", String(o.openRooms)],
  ];
  return (
    <div className="vd-stats">
      {tiles.map(([label, value]) => (
        <div key={label} className="vd-studded vd-panel vd-panel--strong">
          <span className="vd-stud-b" aria-hidden />
          <div className="vd-numeral" style={{ fontSize: 28 }}>{value}</div>
          <div className="vd-label vd-label--dim" style={{ marginTop: 6 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------- payment requests ---------------------------- */

function Orders({
  run, busy,
}: {
  run: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
  busy: boolean;
}) {
  const orders = useQuery(api.billing.adminOrders, {});
  const approve = useMutation(api.billing.adminApproveOrder);
  const reject = useMutation(api.billing.adminRejectOrder);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [days, setDays] = useState<Record<string, string>>({});

  if (!orders) return <Loading />;
  const pending = orders.filter((o) => o.status === "pending");
  const done = orders.filter((o) => o.status !== "pending");

  return (
    <>
      <section className="vd-page__section">
        <h2 className="vd-h2" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={16} /> Awaiting approval ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="vd-voice" style={{ marginTop: 12 }}>Nothing to review right now.</p>
        )}
        <div className="vd-stack" style={{ marginTop: 16 }}>
          {pending.map((o) => (
            <div key={o._id} className="vd-studded vd-panel vd-panel--strong vd-stack">
              <span className="vd-stud-b" aria-hidden />
              <div className="vd-row" style={{ justifyContent: "space-between" }}>
                <strong style={{ font: "500 16px/1.2 var(--vd-display)" }}>{o.name}</strong>
                <span className="vd-pill vd-pill--brass">{o.plan} · {INR(o.amountInr)}</span>
              </div>
              <span className="vd-label vd-label--dim">{o.email}</span>

              <div className="vd-row" style={{ gap: 20, marginTop: 4 }}>
                <div>
                  <div className="vd-label">Reference</div>
                  <code style={{ fontSize: 13 }}>{o.paymentRef}</code>
                </div>
                <div>
                  <div className="vd-label">Submitted</div>
                  <span style={{ fontSize: 13 }}>{fmtWhen(o.createdAt)}</span>
                </div>
                <div>
                  <div className="vd-label">Seats</div>
                  <span style={{ fontSize: 13 }}>{o.seats}</span>
                </div>
              </div>

              <div className="vd-row" style={{ marginTop: 4 }}>
                <span className="vd-label vd-label--dim">Covers:</span>
                {o.memberEmails.map((e: string) => (
                  <span key={e} className="vd-pill">{e}</span>
                ))}
              </div>

              {o.note && (
                <p className="vd-voice" style={{ margin: 0 }}>Buyer says: &ldquo;{o.note}&rdquo;</p>
              )}

              <div className="vd-row" style={{ marginTop: 8 }}>
                <input
                  className="vd-field"
                  style={{ maxWidth: 200, marginBottom: 0 }}
                  inputMode="numeric"
                  placeholder="days (blank = plan length)"
                  value={days[o._id] ?? ""}
                  onChange={(e) => setDays({ ...days, [o._id]: e.target.value })}
                />
                <input
                  className="vd-field"
                  style={{ maxWidth: 220, marginBottom: 0 }}
                  placeholder="note (optional)"
                  value={notes[o._id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [o._id]: e.target.value })}
                />
                <button
                  className="vd-pill vd-pill--parchment"
                  disabled={busy}
                  onClick={() =>
                    void run(() => {
                      const d = Number.parseInt(days[o._id] ?? "", 10);
                      return approve({
                        orderId: o._id,
                        days: Number.isFinite(d) && d > 0 ? d : undefined,
                        adminNote: notes[o._id]?.trim() || undefined,
                      });
                    }, `Activated ${o.seats} seats for ${o.email}.`)
                  }
                >
                  <Check size={12} /> Approve
                </button>
                <Confirm
                  className="vd-pill vd-pill--danger"
                  icon={<X size={12} />}
                  label="Reject"
                  ask={`Reject ${o.email}'s request?`}
                  onConfirm={() =>
                    run(
                      () =>
                        reject({
                          orderId: o._id,
                          adminNote: notes[o._id]?.trim() || undefined,
                        }),
                      `Rejected ${o.email}'s request.`,
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {done.length > 0 && (
        <section className="vd-page__section">
          <h2 className="vd-h2" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <ScrollText size={16} /> History
          </h2>
          <div className="vd-rowlist vd-rowlist--3col" style={{ marginTop: 16 }}>
            <div className="vd-rowlist__head">
              <span>When</span><span>Who</span><span>Status</span>
            </div>
            {done.map((o) => (
              <div key={o._id} className="vd-rowlist__row">
                <span>{fmtDate(o.createdAt)}</span>
                <span>{o.email} · {o.plan} · {INR(o.amountInr)}</span>
                <span
                  className={`vd-pill ${o.status === "approved" ? "vd-pill--parchment" : "vd-pill--danger"}`}
                >
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/* ---------------------------- subscriptions ------------------------------ */

function Subscriptions({
  run, busy,
}: {
  run: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
  busy: boolean;
}) {
  const subs = useQuery(api.billing.adminSubscriptions, {});
  const setSeats = useMutation(api.billing.adminSetSeats);
  const setStatus = useMutation(api.billing.adminSetStatus);
  const del = useMutation(api.billing.adminDeleteSubscription);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (!subs) return <Loading />;
  if (subs.length === 0) {
    return (
      <section className="vd-page__section">
        <p className="vd-voice">No subscriptions yet.</p>
      </section>
    );
  }

  return (
    <section className="vd-page__section">
      <h2 className="vd-h2" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
        <Crown size={16} /> Subscriptions ({subs.length})
      </h2>
      <div className="vd-stack" style={{ marginTop: 16 }}>
        {subs.map((s) => {
          const draft = drafts[s._id] ?? s.members.join(", ");
          return (
            <div key={s._id} className="vd-studded vd-panel vd-panel--strong vd-stack">
              <span className="vd-stud-b" aria-hidden />
              <div className="vd-row" style={{ justifyContent: "space-between" }}>
                <strong style={{ font: "500 16px/1.2 var(--vd-display)" }}>{s.ownerEmail}</strong>
                <span className={`vd-pill ${s.live ? "vd-pill--parchment" : "vd-pill--danger"}`}>
                  {s.live ? "live" : s.status}
                </span>
              </div>
              <span className="vd-label vd-label--dim">
                {s.plan} · {s.seats} seats · expires {fmtDate(s.expiresAt)}
              </span>
              {s.adminNote && (
                <p className="vd-voice" style={{ margin: 0 }}>Note: &ldquo;{s.adminNote}&rdquo;</p>
              )}
              <div className="vd-row">
                <span className="vd-label vd-label--dim">{s.members.length}/{s.seats} seats used</span>
                {s.members.map((e: string) => (
                  <span key={e} className="vd-pill">{e}</span>
                ))}
              </div>
              <label className="vd-field__label">Covered emails (comma separated)</label>
              <input
                className="vd-field"
                value={draft}
                onChange={(e) => setDrafts({ ...drafts, [s._id]: e.target.value })}
              />
              <div className="vd-row">
                <button
                  className="vd-pill"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        setSeats({
                          subscriptionId: s._id,
                          emails: draft.split(",").map((e) => e.trim()).filter(Boolean),
                        }),
                      "Seats updated.",
                    )
                  }
                >
                  <Check size={12} /> Save seats
                </button>
                <button
                  className="vd-pill"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        setStatus({
                          subscriptionId: s._id,
                          status: "active",
                          expiresAt: Math.max(Date.now(), s.expiresAt) + 30 * 86400_000,
                        }),
                      "Extended by 30 days.",
                    )
                  }
                >
                  <RefreshCw size={12} /> +30 days
                </button>
                {s.status === "active" ? (
                  <Confirm
                    className="vd-pill vd-pill--danger"
                    icon={<Ban size={12} />}
                    label="Revoke"
                    ask={`Revoke ${s.ownerEmail}'s plan?`}
                    onConfirm={() =>
                      run(
                        () => setStatus({ subscriptionId: s._id, status: "revoked" }),
                        "Revoked.",
                      )
                    }
                  />
                ) : (
                  <button
                    className="vd-pill vd-pill--parchment"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => setStatus({ subscriptionId: s._id, status: "active" }),
                        "Reactivated.",
                      )
                    }
                  >
                    <BadgeCheck size={12} /> Reactivate
                  </button>
                )}
                <Confirm
                  className="vd-pill vd-pill--danger"
                  icon={<Trash2 size={12} />}
                  label="Delete"
                  ask={`Permanently delete ${s.ownerEmail}'s plan and all its seats?`}
                  onConfirm={() =>
                    run(() => del({ subscriptionId: s._id }), "Subscription deleted.")
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------- users ---------------------------------- */

function UsersList() {
  const users = useQuery(api.billing.adminUsers, {});
  if (!users) return <Loading />;
  return (
    <section className="vd-page__section">
      <h2 className="vd-h2" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
        <Users size={16} /> Users ({users.length})
      </h2>
      <div className="vd-rowlist vd-rowlist--3col" style={{ marginTop: 16 }}>
        <div className="vd-rowlist__head">
          <span>Joined</span><span>Account</span><span>Tier</span>
        </div>
        {users.map((u) => (
          <div key={u._id} className="vd-rowlist__row">
            <span>{fmtDate(u.joinedAt)}</span>
            <span>
              {u.name ? `${u.name} · ` : ""}{u.email ?? "no email"}
              {u.isAdmin && " · admin"}
            </span>
            <span className={`vd-pill ${u.premium ? "vd-pill--parchment" : ""}`}>
              {u.premium ? "premium" : "free"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ manual grant ----------------------------- */

function Grant({
  run, busy,
}: {
  run: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
  busy: boolean;
}) {
  const grant = useMutation(api.billing.adminGrantSubscription);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [days, setDays] = useState("");
  const [seats, setSeats] = useState("");
  const [emails, setEmails] = useState("");
  const [note, setNote] = useState("");

  return (
    <section className="vd-page__section">
      <h2 className="vd-h2" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
        <Gift size={16} /> Grant a plan directly
      </h2>
      <p className="vd-voice" style={{ marginTop: 8 }}>
        For comps, testing, or a payment you took outside the app. The person
        must have created an account at least once, so the account exists.
      </p>

      <label className="vd-field__label" style={{ marginTop: 20, display: "block" }}>Owner email</label>
      <input
        className="vd-field"
        placeholder="someone@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="vd-field__label" style={{ display: "block" }}>Also cover (comma separated, optional)</label>
      <input
        className="vd-field"
        placeholder="a@x.com, b@y.com"
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
      />

      <div className="vd-row">
        <select
          className="vd-field"
          style={{ maxWidth: 160 }}
          value={plan}
          onChange={(e) => setPlan(e.target.value as "monthly" | "yearly")}
        >
          <option value="monthly">monthly</option>
          <option value="yearly">yearly</option>
        </select>
        <input
          className="vd-field"
          style={{ maxWidth: 160 }}
          inputMode="numeric"
          placeholder="days (optional)"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
        <input
          className="vd-field"
          style={{ maxWidth: 160 }}
          inputMode="numeric"
          placeholder="seats (optional)"
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
        />
      </div>

      <label className="vd-field__label" style={{ display: "block" }}>Note (optional)</label>
      <input
        className="vd-field"
        placeholder="why this was granted"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button
        className="vd-btn vd-btn--primary"
        disabled={busy || email.trim().length < 5}
        onClick={() =>
          void run(() => {
            const d = Number.parseInt(days, 10);
            const st = Number.parseInt(seats, 10);
            return grant({
              email: email.trim(),
              plan,
              days: Number.isFinite(d) && d > 0 ? d : undefined,
              seats: Number.isFinite(st) && st > 0 ? st : undefined,
              memberEmails: emails.split(",").map((e) => e.trim()).filter(Boolean),
              adminNote: note.trim() || undefined,
            });
          }, `Granted a ${plan} plan to ${email.trim()}.`)
        }
      >
        <span>Grant plan</span>
        <Gift size={15} />
      </button>
    </section>
  );
}

function Loading() {
  return (
    <div className="vd-center" style={{ minHeight: 200 }}>
      <Loader2 size={22} className="vd-spin" color="var(--vd-brass)" />
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`
Expected: exits 0.

- [ ] **Step 3: Manual QA**

With `npm run dev` and `npx convex dev` running, sign in as an address in `ADMIN_EMAILS` and open `/admin`:
- Confirm the four section tabs switch content and read as tabs (visually and via a screen reader / the browser's accessibility inspector — `role="tab"`, `aria-selected` toggling).
- Confirm the overview strip renders 7 stat tiles.
- Submit a test payment request from `/upgrade` (see Task 3) with another account, then Approve it here — confirm the days/note fields work and the pending card disappears into History with a parchment "approved" pill.
- Reject a second test request — confirm the two-tap `Confirm` flow appears (ask text, Yes/No) before anything happens.
- On an active subscription, click Revoke — confirm the two-tap flow. Click Delete — confirm the two-tap flow (no native browser dialog appears).
- Confirm `days`/`seats` inputs bring up the numeric keypad on a phone (or DevTools mobile emulation).

- [ ] **Step 4: Commit**

```bash
git add src/AdminPage.tsx
git commit -m "$(cat <<'EOF'
feat: rebuild the admin console on the Verdict design system

Same data, same mutations — only the markup changes. Reject, Revoke
and Delete now go through the app's own two-tap Confirm instead of a
native window.confirm() (Delete) or no confirmation at all (Revoke).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Rebuild Upgrade on Verdict

**Files:**
- Modify: `src/UpgradePage.tsx` (full rewrite)

**Interfaces:**
- Consumes: Task 1's CSS classes (`.vd-page`, `.vd-page__section`, `.vd-rowlist--3col`, `.vd-pill--parchment`, `.vd-pill--danger`, `.vd-qr-frame`) and the existing `.vd-world`/`.vd-opt`/`.vd-field`/`.vd-btn`/`.vd-tile` primitives.
- No change to any Convex query/mutation call.

**Design notes:** the buyer's own seat is now shown as a fixed `.vd-tile--parchment` line, not an editable field, per the spec's fix for "which of these is required" ambiguity. The plan picker reuses `.vd-opt` (bordered, `is-on` state) rather than a bespoke component.

- [ ] **Step 1: Replace the full contents of `src/UpgradePage.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "./auth";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, BadgeCheck, Check, Clock, Crown, Loader2, LogOut, QrCode,
  ScrollText, Sparkles, Users, X,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import { SignInCard } from "./SignIn";

const INR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

/** UPI intent link. Any Indian banking app can scan this as a QR. */
function upiLink(vpa: string, payee: string, amount: number, note: string) {
  const q = new URLSearchParams({
    pa: vpa,
    pn: payee,
    am: String(amount),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${q.toString()}`;
}

export default function UpgradePage() {
  const { signOut } = useAuth();
  const viewer = useQuery(api.billing.viewer, {});
  const config = useQuery(api.billing.paymentConfig, {});
  const orders = useQuery(api.billing.myOrders, {});
  const sub = useQuery(api.billing.mySubscription, {});

  const mSubmit = useMutation(api.billing.submitOrder);
  const mCancel = useMutation(api.billing.cancelMyOrder);
  const mMembers = useMutation(api.billing.updateMyMembers);

  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [members, setMembers] = useState<string[]>([]);
  const [paymentRef, setPaymentRef] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [memberDraft, setMemberDraft] = useState<string[]>([]);

  const seats = config?.seats ?? 7;

  useEffect(() => {
    setMembers((m) => (m.length === seats - 1 ? m : Array(seats - 1).fill("")));
  }, [seats]);

  useEffect(() => {
    if (sub?.members) setMemberDraft(sub.members.filter((e) => e !== sub.ownerEmail));
  }, [sub?.members, sub?.ownerEmail]);

  const amount = plan === "yearly" ? (config?.yearlyInr ?? 0) : (config?.monthlyInr ?? 0);
  const pendingOrder = (orders ?? []).find((o) => o.status === "pending");

  const qr = useMemo(() => {
    if (!config?.upiVpa || !amount) return null;
    return upiLink(config.upiVpa, config.payeeName, amount, `Decevia ${plan} plan`);
  }, [config?.upiVpa, config?.payeeName, amount, plan]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      if (ok) setMsg(ok);
    } catch (e: any) {
      setMsg(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ loading ------------------------------- */
  if (viewer === undefined || config === undefined) {
    return (
      <div className="vd-board">
        <div className="vd-content vd-center">
          <Loader2 size={26} className="vd-spin" color="var(--vd-brass)" />
        </div>
      </div>
    );
  }

  /* --------------------------- not signed in --------------------------- */
  if (!viewer.signedIn) {
    return (
      <div className="vd-board">
        <div className="vd-content vd-page">
          <div className="vd-page__back">
            <a className="vd-pill" href="/play"><ArrowLeft size={11} /> Back to council</a>
          </div>
          <header className="vd-page__head">
            <span className="vd-label vd-label--brass"><Crown size={11} /> Premium</span>
            <h1 className="vd-h1">Unlock the full war</h1>
            <p className="vd-voice">
              One plan covers <strong>{seats} people</strong>. Sign in to buy one, or
              to claim a seat someone bought for you.
            </p>
          </header>
          <SignInCard />
          <TierTable config={config} />
        </div>
      </div>
    );
  }

  /* ----------------------------- signed in ----------------------------- */
  return (
    <div className="vd-board">
      <div className="vd-content vd-page">
        <div className="vd-page__back">
          <a className="vd-pill" href="/play"><ArrowLeft size={11} /> Back to council</a>
        </div>
        <header className="vd-page__head">
          <span className="vd-label vd-label--brass"><Crown size={11} /> Premium</span>
          <h1 className="vd-h1">{viewer.premium ? "Your plan" : "Unlock the full war"}</h1>
          <p className="vd-voice">
            Signed in as <strong>{viewer.email}</strong>
            {viewer.isAdmin && (
              <>
                {" · "}
                <a className="vd-textbtn" href="/admin" style={{ display: "inline-flex" }}>admin console</a>
              </>
            )}
          </p>
          <button className="vd-textbtn" onClick={() => void signOut()}>
            <LogOut size={11} /> Sign out
          </button>
        </header>

        {/* ------------------------------ status ---------------------------- */}
        <section className="vd-page__section">
          <div className="vd-studded vd-panel vd-panel--strong vd-row" style={{ alignItems: "flex-start", gap: 16 }}>
            <span className="vd-stud-b" aria-hidden />
            {viewer.premium ? <BadgeCheck size={22} color="var(--vd-brass)" /> : <ScrollText size={22} />}
            <div>
              <strong style={{ font: "500 16px/1.2 var(--vd-display)", display: "block", marginBottom: 4 }}>
                {viewer.premium ? "Premium active" : "Free tier"}
              </strong>
              <p className="vd-voice" style={{ margin: 0 }}>
                {viewer.premium ? (
                  <>
                    Every character and expansion is unlocked
                    {viewer.expiresAt ? <> until {fmtDate(viewer.expiresAt)}</> : null}.
                    {!viewer.iOwnPlan && viewer.ownerEmail && (
                      <> You hold a seat on <strong>{viewer.ownerEmail}</strong>'s plan.</>
                    )}
                  </>
                ) : (
                  <>
                    You can play full games of base Avalon. Mordred, Oberon,
                    Guinevere, the lovers, the Lancelots, all three expansions and
                    the themed worlds need a plan.
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* --------------------------- seat editor -------------------------- */}
        {sub && sub.iAmOwner && (
          <section className="vd-page__section">
            <h2 className="vd-h2" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} /> Who your plan covers
            </h2>
            <p className="vd-voice" style={{ margin: "8px 0 16px" }}>
              Your own seat ({sub.ownerEmail}) is permanent. Add up to{" "}
              {sub.seats - 1} more — they get premium in any room they host or join
              once they sign in with that email address.
            </p>
            <div className="vd-grid2">
              {Array.from({ length: sub.seats - 1 }).map((_, i) => (
                <input
                  key={i}
                  className="vd-field"
                  placeholder={`teammate ${i + 1} — email`}
                  value={memberDraft[i] ?? ""}
                  onChange={(e) => {
                    const next = [...memberDraft];
                    next[i] = e.target.value;
                    setMemberDraft(next);
                  }}
                />
              ))}
            </div>
            <button
              className="vd-btn vd-btn--primary"
              disabled={busy}
              onClick={() =>
                void run(
                  () => mMembers({ emails: memberDraft.map((e) => e.trim()).filter(Boolean) }),
                  "Seats updated.",
                )
              }
            >
              <span>Save seats</span>
              <Check size={15} />
            </button>
          </section>
        )}

        {/* ---------------------------- buy flow --------------------------- */}
        {pendingOrder ? (
          <section className="vd-page__section">
            <h2 className="vd-h2" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={16} /> Awaiting approval
            </h2>
            <div
              className="vd-studded vd-panel vd-panel--strong vd-row"
              style={{ alignItems: "flex-start", gap: 16, marginTop: 12 }}
            >
              <span className="vd-stud-b" aria-hidden />
              <Clock size={22} color="var(--vd-brass)" />
              <div>
                <strong style={{ font: "500 16px/1.2 var(--vd-display)", display: "block", marginBottom: 4 }}>
                  {pendingOrder.plan === "yearly" ? "Yearly" : "Monthly"} plan ·{" "}
                  {INR(pendingOrder.amountInr)}
                </strong>
                <p className="vd-voice" style={{ margin: 0 }}>
                  Submitted {fmtDate(pendingOrder.createdAt)} with reference{" "}
                  <code>{pendingOrder.paymentRef}</code>. An admin will verify the
                  payment and activate your {pendingOrder.seats} seats.
                </p>
              </div>
            </div>
            <button
              className="vd-pill"
              style={{ marginTop: 12 }}
              disabled={busy}
              onClick={() =>
                void run(() => mCancel({ orderId: pendingOrder._id }), "Request withdrawn.")
              }
            >
              <X size={12} /> Withdraw request
            </button>
          </section>
        ) : (
          <>
            <section className="vd-page__section">
              <h2 className="vd-h2" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <Crown size={16} /> Choose a plan
              </h2>
              <div className="vd-grid2" style={{ marginTop: 16 }}>
                {(["monthly", "yearly"] as const).map((k) => {
                  const price = k === "yearly" ? config.yearlyInr : config.monthlyInr;
                  const on = plan === k;
                  return (
                    <button
                      key={k}
                      className={`vd-opt ${on ? "is-on" : ""}`}
                      style={{ minHeight: 96 }}
                      onClick={() => setPlan(k)}
                    >
                      <span className="vd-opt__top">
                        <span className="vd-opt__name" style={{ textTransform: "uppercase" }}>
                          {k === "yearly" ? "Yearly" : "Monthly"}
                        </span>
                        {on && <Check size={14} color="var(--vd-brass)" />}
                      </span>
                      <span className="vd-numeral" style={{ fontSize: 22, color: "var(--vd-brass)" }}>
                        {INR(price)}
                      </span>
                      <span className="vd-opt__desc">
                        {seats} seats · {k === "yearly" ? "365" : "30"} days
                        {k === "yearly" && (
                          <> · saves {INR(Math.max(0, config.monthlyInr * 12 - config.yearlyInr))}</>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="vd-page__section">
              <h2 className="vd-h2" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <QrCode size={16} /> Pay {INR(amount)}
              </h2>
              {config.qrImageUrl ? (
                <div className="vd-stack" style={{ alignItems: "center", textAlign: "center", marginTop: 16 }}>
                  <span className="vd-qr-frame">
                    <img src={config.qrImageUrl} alt="Payment QR code" style={{ display: "block", width: 220 }} />
                  </span>
                  <p className="vd-voice">Scan with any UPI app, then paste the reference below.</p>
                </div>
              ) : qr ? (
                <div className="vd-stack" style={{ alignItems: "center", textAlign: "center", marginTop: 16 }}>
                  <span className="vd-qr-frame">
                    <QRCodeSVG value={qr} size={188} level="M" includeMargin />
                  </span>
                  <p className="vd-voice">
                    Scan with any UPI app to pay <strong>{INR(amount)}</strong> to{" "}
                    <strong>{config.upiVpa}</strong>, then paste the transaction
                    reference below.
                  </p>
                  <a className="vd-textbtn" href={qr}>Open in a UPI app on this device</a>
                </div>
              ) : (
                <div className="vd-panel vd-panel--danger" style={{ marginTop: 16 }}>
                  <p className="vd-voice" style={{ margin: 0, color: "var(--vd-red-ink)" }}>
                    Payment is not configured yet. The admin needs to set{" "}
                    <code>UPI_VPA</code> (or <code>PAYMENT_QR_URL</code>) in the
                    Convex environment.
                  </p>
                </div>
              )}
            </section>

            <section className="vd-page__section">
              <h2 className="vd-h2" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={16} /> Who should it cover?
              </h2>
              <p className="vd-voice" style={{ margin: "8px 0 16px" }}>
                Your seat is included automatically:
              </p>
              <div className="vd-tile vd-tile--parchment" style={{ marginBottom: 16 }}>
                {viewer.email}
                <span className="vd-tile__meta" style={{ color: "inherit" }}>your seat</span>
              </div>
              <p className="vd-voice" style={{ margin: "0 0 12px" }}>
                List up to {seats - 1} teammates — they each need an account on
                that same email address to use it. You can change these later.
              </p>
              <div className="vd-grid2">
                {members.map((val, i) => (
                  <input
                    key={i}
                    className="vd-field"
                    placeholder={`teammate ${i + 1} — email (optional)`}
                    value={val}
                    onChange={(e) => {
                      const next = [...members];
                      next[i] = e.target.value;
                      setMembers(next);
                    }}
                  />
                ))}
              </div>

              <label className="vd-field__label" htmlFor="payref">
                UPI transaction reference / UTR
              </label>
              <input
                id="payref"
                className="vd-field"
                placeholder="e.g. 4179 1234 5678"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
              <label className="vd-field__label" htmlFor="paynote">
                Anything the admin should know (optional)
              </label>
              <input
                id="paynote"
                className="vd-field"
                placeholder="paid from a different number, etc."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <button
                className="vd-btn vd-btn--primary"
                disabled={busy || paymentRef.trim().length < 4}
                onClick={() =>
                  void run(
                    () =>
                      mSubmit({
                        plan,
                        memberEmails: members.map((e) => e.trim()).filter(Boolean),
                        paymentRef,
                        note: note.trim() || undefined,
                      }),
                    "Request submitted — an admin will verify your payment.",
                  )
                }
              >
                <span>I have paid — submit for approval</span>
                {busy ? <Loader2 size={15} className="vd-spin" /> : <Check size={15} />}
              </button>
            </section>
          </>
        )}

        {msg && <p className="vd-panel vd-panel--danger vd-errline" style={{ margin: "0 0 20px" }}>{msg}</p>}

        {/* --------------------------- order history ------------------------ */}
        {(orders ?? []).length > 0 && (
          <section className="vd-page__section">
            <h2 className="vd-h2" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <ScrollText size={16} /> Your requests
            </h2>
            <div className="vd-rowlist vd-rowlist--3col" style={{ marginTop: 16 }}>
              <div className="vd-rowlist__head">
                <span>Submitted</span><span>Plan</span><span>Status</span>
              </div>
              {(orders ?? []).map((o) => (
                <div key={o._id} className="vd-rowlist__row">
                  <span>{fmtDate(o.createdAt)}</span>
                  <span>{o.plan} · {INR(o.amountInr)}</span>
                  <span>
                    <span
                      className={`vd-pill ${
                        o.status === "approved" ? "vd-pill--parchment"
                        : o.status === "pending" ? "vd-pill--brass"
                        : "vd-pill--danger"
                      }`}
                    >
                      {o.status}
                    </span>
                    {o.adminNote && (
                      <span className="vd-voice" style={{ display: "block", marginTop: 4, fontSize: 12 }}>
                        &ldquo;{o.adminNote}&rdquo;
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <TierTable config={config} />
      </div>
    </div>
  );
}

/** What the two tiers actually contain. */
function TierTable({ config }: { config: any }) {
  return (
    <section className="vd-page__section">
      <h2 className="vd-h2" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
        <Sparkles size={16} /> What each tier includes
      </h2>
      <div className="vd-grid2" style={{ marginTop: 16 }}>
        <div className="vd-panel vd-panel--strong" style={{ padding: 18 }}>
          <ScrollText size={22} color="var(--vd-brass)" />
          <h3 style={{ font: "500 16px/1.2 var(--vd-display)", margin: "10px 0" }}>Free</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--vd-ink-soft)", lineHeight: 1.6 }}>
            <li>Merlin &amp; the Assassin</li>
            <li>Percival &amp; Morgana</li>
            <li>Loyal servants &amp; minions</li>
            <li>The Medieval board</li>
            <li>Tables of 5 to 18 — the full house rules above ten</li>
          </ul>
        </div>
        <div className="vd-panel vd-panel--strong" style={{ padding: 18, borderColor: "var(--vd-brass)" }}>
          <Crown size={22} color="var(--vd-brass)" />
          <h3 style={{ font: "500 16px/1.2 var(--vd-display)", margin: "10px 0" }}>
            Premium · covers {config?.seats ?? 7} people
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--vd-ink-soft)", lineHeight: 1.6 }}>
            {Object.entries(config?.premiumOptLabels ?? {}).map(([k, label]) => (
              <li key={k}>{label as string}</li>
            ))}
            <li>Every themed world (Mahabharata, Maratha, Greek, Egyptian)</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`
Expected: exits 0.

- [ ] **Step 3: Manual QA**

With `npm run dev` and `npx convex dev` running:
- Visit `/upgrade` signed out — confirm the sign-in card and tier table render.
- Sign in, confirm the free-tier status card, plan picker (click both cards, confirm `is-on` toggles), QR block (either the generated `QRCodeSVG` or `config.qrImageUrl` path, whichever your local env has configured), member-email grid, and that your own email shows as a fixed parchment tile rather than an editable field.
- Submit a test order (a `paymentRef` of at least 4 characters), confirm it moves into the "Awaiting approval" state and the plan-picker/QR sections disappear in favor of it.
- Confirm "Withdraw request" returns you to the plan picker.
- After an admin approves/rejects it (Task 2), reload and confirm order history shows the right status pill color (parchment for approved, red-outline for rejected).

- [ ] **Step 4: Commit**

```bash
git add src/UpgradePage.tsx
git commit -m "$(cat <<'EOF'
feat: rebuild the upgrade page on the Verdict design system

Same data, same mutations. The buyer's own seat is now a fixed
parchment tile instead of blending in with the editable teammate
fields, so "which of these do I need to fill in" stops being
ambiguous.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Rebuild Rules on Verdict, and retire the legacy shim

**Files:**
- Modify: `src/RulesPage.tsx` (full rewrite)
- Modify: `src/seal.css` (delete the now-dead legacy remap block, final step only)

**Interfaces:**
- Consumes: Task 1's CSS classes, plus every existing `vd-*` primitive.
- No change to any import from `convex/logic` or `convex/themes` — same constants, same computed values.

- [ ] **Step 1: Replace the full contents of `src/RulesPage.tsx`**

```tsx
import { useMemo, useState } from "react";
import {
  ArrowLeft, Check, Crown, Eye, EyeOff, Flame, ScrollText, Shield, Swords,
  Sun, Users, X,
} from "lucide-react";
import { THEMES, THEME_LIST, type ThemeConfig } from "../convex/themes";
import {
  doubleFailQuests, MAX_PLAYERS, QUEST_SIZES, TEAM_COUNTS, MAX_REJECTS,
  LADY_MIN_PLAYERS, PLOT_CARDS, plotCardsPerRound, NIGHT_ORDER,
} from "../convex/logic";

const BASE = THEMES.medieval;
const BASE_ROLE_IDS = [
  "merlin",
  "percival",
  "guinevere",
  "tristan",
  "isolde",
  "lancelot_good",
  "servant",
  "assassin",
  "morgana",
  "mordred",
  "oberon",
  "lancelot_evil",
  "minion",
] as const;

/** Roles that come as an inseparable pair. */
const PAIRED: Record<string, string> = {
  tristan: "Always with Isolde",
  isolde: "Always with Tristan",
  lancelot_good: "Always with the fallen Lancelot",
  lancelot_evil: "Always with the loyal Lancelot",
};

const PHASES = [
  { id: "lobby", title: "Council", detail: "5–10 warriors join. Host picks the theme, the optional roles, and any expansions." },
  { id: "reveal", title: "Night", detail: "Visions resolve in a fixed order. Each player sees only their own role and what that role is allowed to know." },
  { id: "plot", title: "Plots", detail: "Plot cards only. At the start of each round the leader deals the round's cards, face down, to other players." },
  { id: "propose", title: "Propose", detail: "3 minutes to discuss, then 1 extra minute for the leader to lock a war party of the size shown. With Excalibur, the leader also arms one party member." },
  { id: "vote", title: "Vote", detail: "Everyone supports or opposes the party. A strict majority sends them to battle; a tie turns them away." },
  { id: "quest", title: "Quest", detail: "Party members play Success or Fail in secret. Good may only play Success — unless the host turns on the house rule that lets the loyal sabotage. Then Excalibur, if drawn, may flip one card." },
  { id: "lady", title: "Lady", detail: "After quests 2–4 at 7+ players, the token holder learns one player's true allegiance and passes the token to them." },
  { id: "end", title: "Victory", detail: "Three successes trigger the Assassin's strike. Three fails, or five rejected parties, win for Evil." },
];

const SECTIONS = [
  { id: "how-it-plays", label: "How it plays" },
  { id: "winning", label: "Winning" },
  { id: "table-size", label: "Table size" },
  { id: "beyond-ten", label: "Beyond ten" },
  { id: "sight", label: "Who sees whom" },
  { id: "night", label: "The night" },
  { id: "lancelot", label: "The Lancelots" },
  { id: "expansions", label: "Expansions" },
  { id: "roles", label: "Roles" },
  { id: "themes", label: "Worlds" },
];

function roleOf(theme: ThemeConfig, id: string) {
  return theme.roles.find((r) => r.id === id);
}

function seesTargets(viewerId: string): { ids: string[]; note: string } {
  switch (viewerId) {
    case "merlin":
      return {
        ids: ["assassin", "morgana", "oberon", "lancelot_evil", "minion"],
        note: "Sees Evil — except Mordred, who is veiled. A Lancelot who later switches still reads as Evil to Merlin: the vision is a snapshot of the night.",
      };
    case "percival":
      return {
        ids: ["merlin", "morgana"],
        note: "Sees Merlin and Morgana, but cannot tell them apart.",
      };
    case "guinevere":
      return {
        ids: ["lancelot_good", "lancelot_evil"],
        note: "Sees both Lancelots, but not which of them is loyal and which has fallen.",
      };
    case "tristan":
      return { ids: ["isolde"], note: "Knows Isolde. If the Assassin names them both, they die together." };
    case "isolde":
      return { ids: ["tristan"], note: "Knows Tristan. If the Assassin names them both, they die together." };
    case "lancelot_good":
      return {
        ids: [],
        note: "Knows no one — not even the other Lancelot. Only Guinevere marks them. May play only Success.",
      };
    case "lancelot_evil":
      return {
        ids: [],
        note: "Cannot identify their allies, though the other Evil players recognise them. Merlin and Guinevere both see them. Must play Fail.",
      };
    case "assassin":
    case "morgana":
    case "mordred":
    case "minion":
      return {
        ids: ["assassin", "morgana", "mordred", "lancelot_evil", "minion"].filter(
          (id) => id !== viewerId,
        ),
        note: "Sees fellow Evil — except Oberon, who walks alone. The fallen Lancelot is recognised but does not recognise anyone back.",
      };
    case "oberon":
      return { ids: [], note: "Knows no other Evil. Merlin still sees Oberon." };
    default:
      return { ids: [], note: "No magical sight. Read the table and vote true." };
  }
}

export default function RulesPage() {
  const [themeId, setThemeId] = useState("medieval");
  const [players, setPlayers] = useState(7);
  const theme = THEMES[themeId] ?? BASE;
  const [good, evil] = TEAM_COUNTS[players];
  const quests = QUEST_SIZES[players];
  const evilSpecials = evil - 1;

  const roster = useMemo(
    () =>
      BASE_ROLE_IDS.map((id) => ({
        id,
        base: roleOf(BASE, id)!,
        themed: roleOf(theme, id)!,
      })),
    [theme],
  );

  return (
    <div className="vd-board">
      <div className="vd-content vd-page">
        <div className="vd-page__back">
          <a className="vd-pill" href="/learn"><ArrowLeft size={11} /> How to play</a>
          <a className="vd-pill" href="/play"><ArrowLeft size={11} /> Back to council</a>
        </div>

        <header className="vd-page__head">
          <span className="vd-label vd-label--brass"><ScrollText size={11} /> Laws of the Round Table</span>
          <h1 className="vd-h1">How the war is won</h1>
          <p className="vd-voice">
            Every theme is the same hidden-team game. The <strong>Medieval Kingdom</strong>{" "}
            (Merlin &amp; Arthur) is the rulebook. Other worlds only rename the faces.
          </p>
        </header>

        <nav className="vd-toc" aria-label="Jump to section">
          {SECTIONS.map((s) => (
            <a key={s.id} className="vd-pill" href={`#${s.id}`}>{s.label}</a>
          ))}
        </nav>

        <section id="how-it-plays" className="vd-page__section">
          <h2 className="vd-h2">How a round plays</h2>
          <ol className="vd-stack" style={{ marginTop: 16, listStyle: "none", padding: 0 }}>
            {PHASES.map((p, i) => (
              <li key={p.id} className="vd-row" style={{ alignItems: "flex-start", gap: 14 }}>
                <span className="vd-numeral" style={{ fontSize: 20, color: "var(--vd-rule-engraved)", minWidth: 24 }}>
                  {i + 1}
                </span>
                <div>
                  <strong style={{ display: "block", marginBottom: 2 }}>{p.title}</strong>
                  <p className="vd-voice" style={{ margin: 0 }}>{p.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="vd-grid3" style={{ marginTop: 24 }}>
            <div className="vd-panel">
              <Users size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Propose</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                The table gets 4 minutes to talk, then 1 extra minute for the
                leader to lock the party. Tap warriors until the count matches
                this quest's size, then put it to a vote. If time runs out the
                leader forfeits the turn: the seal passes to the next warrior and
                the same quest is proposed again. A skipped turn is not a
                rejection — the council never met — so the rejection track is
                untouched.
              </p>
            </div>
            <div className="vd-panel">
              <Shield size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Vote</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                Majority <em>Support</em> → the party rides. Majority{" "}
                <em>Oppose</em> (or a tie) → the party is turned away, the crown
                passes, and a reject pip fills.
              </p>
            </div>
            <div className="vd-panel">
              <Swords size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Quest cards</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                Knights of Arthur may play only <strong>Success</strong>. Minions
                of Mordred may play Success or Fail. Cards are secret until the
                quest resolves.
              </p>
            </div>
          </div>
        </section>

        <section id="winning" className="vd-page__section">
          <h2 className="vd-h2">How you win</h2>
          <div className="vd-grid2" style={{ marginTop: 16 }}>
            <div className="vd-panel vd-panel--strong">
              <Sun size={22} color="var(--vd-brass)" />
              <h3 style={{ font: "500 17px/1.3 var(--vd-display)", margin: "10px 0" }}>Good prevails</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                Three quests succeed, <em>and</em> the Assassin names the wrong soul (not Merlin).
              </p>
            </div>
            <div className="vd-panel vd-panel--danger">
              <Flame size={22} color="var(--vd-red-ink)" />
              <h3 style={{ font: "500 17px/1.3 var(--vd-display)", margin: "10px 0" }}>Evil triumphs</h3>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--vd-ink-soft)", lineHeight: 1.6 }}>
                <li>Three quests fail, or</li>
                <li>{MAX_REJECTS} parties are rejected in a row, or</li>
                <li>Three quests succeed but the Assassin correctly names Merlin.</li>
                <li>
                  With the lovers in play, the Assassin may instead name{" "}
                  <strong>both</strong> Tristan and Isolde. Both right wins for
                  Evil; either wrong wins for Good.
                </li>
              </ul>
            </div>
          </div>
          <p className="vd-voice" style={{ marginTop: 16 }}>
            The fourth quest needs <strong>two Fail cards</strong> to fail once there
            are 7 or more players; with 5–6, a single Fail still ruins it. Above ten
            the third quest needs two as well — see <em>Beyond ten</em> below.
          </p>
        </section>

        <section id="table-size" className="vd-page__section">
          <h2 className="vd-h2">Table size &amp; party counts</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Always in the deck: <strong>Merlin</strong> and the{" "}
            <strong>Assassin</strong>. Optional roles fill the remaining seats and
            can never exceed them — Percival, Guinevere and the loyal Lancelot take
            one Good seat each, the lovers take two, and Morgana, Mordred, Oberon
            and the fallen Lancelot take one Evil seat each. Because the Lancelots
            are a pair, enabling them costs one seat on <em>each</em> side.
          </p>

          <div style={{ marginTop: 20 }}>
            <span className="vd-label">Warriors at the table</span>
            <div className="vd-row" style={{ marginTop: 10 }}>
              {Array.from({ length: MAX_PLAYERS - 4 }, (_, i) => i + 5).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`vd-pill ${n === players ? "is-on" : ""}`}
                  onClick={() => setPlayers(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="vd-row" style={{ marginTop: 16 }}>
            <span className="vd-pill vd-pill--brass"><Sun size={13} /> {good} Good</span>
            <span className="vd-pill vd-pill--danger"><Flame size={13} /> {evil} Evil</span>
            <span className="vd-pill"><Crown size={13} /> {evilSpecials} evil special{evilSpecials === 1 ? "" : "s"} besides Assassin</span>
          </div>

          <div className="vd-row" style={{ marginTop: 16, alignItems: "stretch" }}>
            {quests.map((size, i) => {
              const dbl = doubleFailQuests(players).includes(i);
              return (
                <div
                  key={i}
                  className={`vd-panel ${dbl ? "vd-panel--danger" : ""}`}
                  style={{ flex: "1 0 84px", textAlign: "center" }}
                >
                  <span className="vd-label vd-label--dim">Q{i + 1}</span>
                  <div className="vd-numeral" style={{ fontSize: 26, color: "var(--vd-brass)", margin: "4px 0" }}>{size}</div>
                  <span className="vd-label vd-label--dim">on party</span>
                  {dbl && <div className="vd-label" style={{ color: "var(--vd-red-ink)", marginTop: 6 }}>2 fails to sink</div>}
                </div>
              );
            })}
          </div>
        </section>

        <section id="beyond-ten" className="vd-page__section">
          <h2 className="vd-h2">Beyond ten — a house rule</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Avalon is printed for 5–10 players and defines no team split or mission
            sizes above that. This table goes to <strong>{MAX_PLAYERS}</strong>, and
            rather than invent numbers both are extrapolated from the printed
            table's own arithmetic.
          </p>
          <div className="vd-grid3" style={{ marginTop: 20 }}>
            <div className="vd-panel">
              <Flame size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Evil count</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                <code>ceil(n / 3)</code>. That reproduces every official row exactly
                — 5→2, 6→2, 7→3, 8→3, 9→3, 10→4 — so above ten it simply keeps
                going. Good takes the rest.
              </p>
            </div>
            <div className="vd-panel">
              <Users size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Mission sizes</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                Flat at <code>3 4 4 5 5</code> across 8–10 players, so every
                further three players adds one to each mission. Eleven rides
                4/5/5/6/6; eighteen rides 6/7/7/8/8.
              </p>
            </div>
            <div className="vd-panel">
              <Shield size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Two-fail quests</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                The third quest joins the fourth in needing two Fails above ten.
                Parties grow with the head count, so a lone saboteur would
                otherwise be aboard nearly every mission.
              </p>
            </div>
          </div>
          <p className="vd-voice" style={{ marginTop: 16 }}>
            Everything at 5–10 players is unchanged and always takes the printed
            values. Note that the game is still five quests long: at the largest
            sizes many players never ride, which is worth knowing before you seat
            eighteen. Every table may seat all eighteen — the size of the council
            is not part of the paid tier.
          </p>
        </section>

        <section id="sight" className="vd-page__section">
          <h2 className="vd-h2">Who sees whom</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Knowledge is named in Medieval terms. In other themes the same arrows apply to the
            mapped characters.
          </p>
          <div className="vd-stack" style={{ marginTop: 16 }}>
            {BASE_ROLE_IDS.map((id) => {
              const viewer = roleOf(BASE, id)!;
              const { ids, note } = seesTargets(id);
              return (
                <div
                  key={id}
                  className="vd-panel"
                  style={{ borderLeft: `3px solid ${viewer.team === "good" ? "var(--vd-brass)" : "var(--vd-red)"}` }}
                >
                  <div className="vd-row" style={{ marginBottom: 6 }}>
                    {viewer.team === "good" ? <Sun size={14} color="var(--vd-brass)" /> : <Flame size={14} color="var(--vd-red-ink)" />}
                    <strong>{viewer.name}</strong>
                  </div>
                  <p className="vd-voice" style={{ margin: "0 0 10px" }}>{note}</p>
                  <div className="vd-row">
                    {ids.length === 0 ? (
                      <span className="vd-pill"><EyeOff size={12} /> no one</span>
                    ) : (
                      ids.map((tid) => (
                        <span key={tid} className="vd-pill vd-pill--brass">
                          <Eye size={12} /> {roleOf(BASE, tid)!.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="night" className="vd-page__section">
          <h2 className="vd-h2">The order of the night</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Visions always resolve in this sequence. Steps whose role is not in the
            game are simply skipped.
          </p>
          <ol className="vd-stack" style={{ marginTop: 16, listStyle: "none", padding: 0 }}>
            {NIGHT_ORDER.map((stp) => (
              <li key={stp.step} className="vd-row" style={{ gap: 14 }}>
                <span className="vd-numeral" style={{ fontSize: 18, color: "var(--vd-rule-engraved)", minWidth: 22 }}>
                  {stp.step}
                </span>
                <strong>{stp.label}</strong>
              </li>
            ))}
          </ol>
        </section>

        <section id="lancelot" className="vd-page__section">
          <h2 className="vd-h2">The Lancelots &amp; the loyalty deck</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Enabling Lancelot puts <strong>two</strong> players in the game: one
            Good, one Evil. Neither knows the other. They are the only roles whose
            mission card is <em>forced</em> — the Evil Lancelot must play{" "}
            <strong>Fail</strong> and the Good Lancelot must play{" "}
            <strong>Success</strong>, every single quest they ride on.
          </p>
          <div className="vd-grid3" style={{ marginTop: 20 }}>
            <div className="vd-panel">
              <Swords size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Five cards, two switches</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                The loyalty deck holds 5 cards: 2 switch allegiance, 3 do nothing.
                One is drawn at the start of every round from the{" "}
                <strong>third</strong> onward.
              </p>
            </div>
            <div className="vd-panel">
              <Eye size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>A switch flips both</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                When a switch is drawn, both Lancelots trade sides — and their
                forced mission cards trade with them. The draw is public; who
                switched is not a secret, but what it means for the table is.
              </p>
            </div>
            <div className="vd-panel">
              <EyeOff size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Merlin's vision does not update</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                Merlin saw the Evil Lancelot on night one and still reads them as
                Evil afterwards, even once they have turned Good. Guinevere has the
                same problem from the other direction: she knows <em>who</em> the
                Lancelots are and never which side either is on.
              </p>
            </div>
          </div>
        </section>

        <section id="expansions" className="vd-page__section">
          <h2 className="vd-h2">Expansions</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Each is an independent host toggle. Every world renames them — the
            rules below are the same underneath.
          </p>
          <div className="vd-grid3" style={{ marginTop: 20 }}>
            <div className="vd-panel">
              <Eye size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Lady of the Lake</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                Needs <strong>{LADY_MIN_PLAYERS}+ players</strong>. The token
                starts with the player to the first leader's right. After quests 2,
                3 and 4 the holder picks someone, learns their{" "}
                <strong>true current allegiance</strong> — Lancelot switches
                included — and then passes the token to that person. Anyone who has
                ever held the token can never be examined.
              </p>
            </div>
            <div className="vd-panel">
              <Swords size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Excalibur</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                When the leader proposes a party they must also hand Excalibur to
                one party member other than themselves. After every mission card is
                in, the holder may turn <strong>one</strong> companion's card to its
                opposite. The table learns <em>who</em> was struck; only the holder
                and the target ever learn what the card had been.
              </p>
            </div>
            <div className="vd-panel">
              <ScrollText size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Plot cards</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                At the start of each round the leader deals{" "}
                <strong>{plotCardsPerRound(players)}</strong> card
                {plotCardsPerRound(players) === 1 ? "" : "s"} at {players} players
                — face down, never to themselves. Who holds how many is public;
                which cards they are is not.
              </p>
            </div>
          </div>

          <div className="vd-rowlist vd-rowlist--3col" style={{ marginTop: 20 }}>
            <div className="vd-rowlist__head">
              <span>Plot card</span><span /><span>What it does</span>
            </div>
            {Object.values(PLOT_CARDS).map((c) => (
              <div key={c.id} className="vd-rowlist__row">
                <span>{c.name}</span>
                <span style={{ color: "var(--vd-ink-dim)" }}>{c.desc}</span>
                <span className="vd-label vd-label--dim">
                  {c.kind === "instant" ? "resolves at once" : c.kind === "effect" ? "lasts all game" : `play during ${c.window}`}
                </span>
              </div>
            ))}
          </div>
          <p className="vd-voice" style={{ marginTop: 16 }}>
            <strong>Ambush</strong> is the one plot card that leaves no public
            trace — the peek is never announced, and only the player who used it
            ever sees the result. Everything else appears in the plots log.
          </p>
        </section>

        <section id="roles" className="vd-page__section">
          <h2 className="vd-h2">Base characters (Medieval)</h2>
          <div className="vd-grid2" style={{ marginTop: 16 }}>
            {roster.map(({ id, base }) => (
              <div key={id} className={`vd-panel ${base.team === "evil" ? "vd-panel--danger" : ""}`}>
                <div className="vd-row" style={{ marginBottom: 6 }}>
                  {base.team === "good" ? <Sun size={16} color="var(--vd-brass)" /> : <Flame size={16} color="var(--vd-red-ink)" />}
                  <strong style={{ flex: 1 }}>{base.name}</strong>
                  <span className="vd-label vd-label--dim">{base.team === "good" ? "Good" : "Evil"}</span>
                </div>
                <p className="vd-voice" style={{ margin: "0 0 8px" }}>{base.desc}</p>
                {id === "merlin" || id === "assassin" ? (
                  <span className="vd-label vd-label--brass">Always in play</span>
                ) : id === "servant" || id === "minion" ? (
                  <span className="vd-label vd-label--dim">Fills remaining seats</span>
                ) : PAIRED[id] ? (
                  <span className="vd-label vd-label--dim">Optional — {PAIRED[id]}</span>
                ) : (
                  <span className="vd-label vd-label--dim">Optional — host toggle</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="themes" className="vd-page__section">
          <h2 className="vd-h2">The same roles, other worlds</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Pick a theme. The left name is the rulebook (Medieval). The right name is who you
            will see in that world.
          </p>
          <div className="vd-row" style={{ marginTop: 16 }}>
            {THEME_LIST.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`vd-pill ${t.id === themeId ? "is-on" : ""}`}
                onClick={() => setThemeId(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
          <p className="vd-voice" style={{ margin: "16px 0" }}>
            <strong>{theme.name}</strong> — {theme.goodTeamName} vs {theme.evilTeamName}. {theme.tagline}
          </p>
          <div className="vd-rowlist vd-rowlist--3col">
            <div className="vd-rowlist__head">
              <span>Medieval (rules)</span><span /><span>{theme.name}</span>
            </div>
            {roster.map(({ id, base, themed }) => (
              <div key={id} className="vd-rowlist__row">
                <span>{base.name}</span>
                <span style={{ color: "var(--vd-brass)" }}>{themed.name}</span>
                <span className={base.team === "good" ? "vd-pill vd-pill--brass" : "vd-pill vd-pill--danger"}>
                  {base.team === "good" ? <Check size={11} /> : <X size={11} />} {base.team}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`
Expected: exits 0.

- [ ] **Step 3: Verify no file still references the legacy classnames, before deleting anything**

Run:

```bash
cd "/Users/amber/Developer/Coding Practice/mahabharata" && grep -rn "rules-page\|rules-hero\|rules-kicker\|rules-lede\|rules-back\|rules-section\|rules-flow\|rules-callouts\|rules-win\|rules-map\|rules-sight\|rules-role\|rules-theme\|rules-gem\|rules-chip\|rules-pill\|rules-size-picker\|rules-split\|rules-always\|rules-note\|billing-\|admin-tile\|admin-order\|admin-tabs\|admin-approve\|admin-reject\|admin-btn\|admin-input\|field-input\|field-label\|opt-lock\|premium-bar" src/*.tsx src/table/*.tsx
```

Expected: **no output**. If anything matches, stop — do not proceed to Step 4 — and fix that file first (it means something other than the three files this plan touches still depends on the old classnames).

- [ ] **Step 4: Delete the now-dead legacy remap shim from `src/seal.css`**

This block existed only to reskin the `.rules-page`/`.billing-*`/`.admin-*` classnames onto the Verdict palette. Nothing emits those classnames anymore after Tasks 2–4, so it's dead. Remove exactly this span (the comment header through the QR-frame rule — stop before the `.app-root` rule that follows, which is unrelated and must stay):

```css
/* ============================================================================
   Rules / admin / upgrade — remapped onto the Council Seal palette.

   Those pages were authored against the older indigo-and-gold theme variables.
   Rather than rewrite their markup, remap the variables they read and flatten
   the two things the language forbids: rounded corners and shadows.
   ========================================================================== */

.rules-page {
  --theme-ink: var(--vd-bg);
  --theme-gold: var(--vd-brass);
  --theme-gold-dim: var(--vd-brass-edge);
  --theme-parch: var(--vd-ink);
  --theme-parch-dim: var(--vd-ink-muted);
  --theme-good: var(--vd-brass);
  --theme-evil: var(--vd-red-ink);
  --theme-line: var(--vd-rule-control);
  color: var(--vd-ink);
  font-family: var(--vd-ui);
}

/* Radius 0 and no shadows, everywhere on these pages. */
.rules-page *,
.rules-page *::before,
.rules-page *::after {
  border-radius: 0 !important;
  box-shadow: none !important;
  text-shadow: none !important;
}
/* The one exception the language allows: sigil / token discs. */
.rules-page .vd-seat__disc { border-radius: 50% !important; }

.rules-page h1 { font-family: var(--vd-display); font-weight: 500; letter-spacing: 0.02em; }
.rules-page h2 { font-family: var(--vd-display); font-weight: 500; }
.rules-page .rules-lede,
.rules-page .rules-note,
.rules-page .rules-section > p { font-family: var(--vd-voice); font-style: italic; }
.rules-page .rules-kicker { font-family: var(--vd-ui); letter-spacing: 0.26em; }

.rules-page .rules-section { border-top: 1px solid var(--vd-rule-container); }
/* The hero is a stack, not a line. `.rules-back` is inline-block and
   `.rules-kicker` is inline-flex, so left to themselves they share a row and
   run into each other — the back link's margin-bottom does nothing there.
   A flex column separates them and lets the link sit out at the left edge,
   where it reads as navigation rather than part of the title block. */
.rules-page .rules-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vd-3);
  text-align: center;
  border-bottom: 1px solid var(--vd-rule-container);
  padding-bottom: 24px;
}
.rules-page .rules-back {
  align-self: flex-start;
  margin: 0 0 var(--vd-2);
  font: 700 8.5px/1 var(--vd-ui);
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--vd-ink-muted);
}
.rules-page .rules-back:hover { color: var(--vd-brass); }
.rules-page .rules-kicker,
.rules-page .rules-hero h1,
.rules-page .rules-hero .rules-lede { margin: 0; }

/* Panels, cards and chips all become 1px containers on the board. */
.rules-page .rules-callouts > article,
.rules-page .rules-win__card,
.rules-page .rules-role,
.rules-page .rules-map,
.rules-page .rules-sight__row,
.rules-page .admin-order,
.rules-page .admin-tile,
.rules-page .billing-status,
.rules-page .billing-plan,
.rules-page .vd-panel {
  background: var(--vd-bg-raised);
  border: 1px solid var(--vd-rule-container);
}
.rules-page .rules-win__card--good { border-color: var(--vd-rule-strong); }
.rules-page .rules-win__card--evil { border-color: var(--vd-red-rule); background: rgba(158, 59, 40, 0.07); }
.rules-page .rules-chip,
.rules-page .rules-pill,
.rules-page .billing-badge,
.rules-page .rules-theme-btn { border: 1px solid var(--vd-rule-control); background: transparent; }
.rules-page .rules-theme-btn.is-on,
.rules-page .rules-size-picker__btns button.is-on { background: var(--vd-brass); color: #171410; }
.rules-page .billing-qr__frame { background: #fff; border: 2px solid var(--vd-brass); }
```

Leave everything from the `.app-root` rule onward untouched — that rule (and `body { background: var(--vd-bg); }`, the `.vd-shell` safe-area padding, `.vd-center`, and `.vd-gate__worlds .vd-worlds`) are general app-shell rules, not part of this shim, and stay regardless of what Rules/Upgrade/Admin do.

- [ ] **Step 5: Verify the build again**

Run: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`
Expected: exits 0 (CSS deletion can't break `tsc`, but this confirms nothing else regressed in the same commit).

- [ ] **Step 6: Manual QA**

With `npm run dev` running:
- Visit `/rules`. Confirm the jump-nav row appears under the header and every link scrolls to its section.
- Click through the player-count picker (5–18) and confirm the good/evil counts and quest-size tiles update, including the "2 fails to sink" tag at the right counts.
- Click through the theme picker at the bottom and confirm the role-mapping row list updates.
- Confirm the page still reads correctly at a phone width (390px) — the `.vd-rowlist--3col` rows should wrap into a flexible layout rather than being squeezed into unreadable columns.
- Reload `/upgrade` and `/admin` once more (from Tasks 2–3) to confirm the shim removal didn't visually affect them — it shouldn't, since they no longer read the deleted classnames either.

- [ ] **Step 7: Commit**

```bash
git add src/RulesPage.tsx src/seal.css
git commit -m "$(cat <<'EOF'
feat: rebuild the rules page on Verdict; retire the legacy shim

Same content, same order, same computed values from convex/logic and
convex/themes. Adds a jump-nav so the page's ten sections — which
already had anchor ids — are actually reachable without scrolling
past them. Deletes seal.css's .rules-page remap block: with all three
legacy pages migrated, nothing emits those classnames anymore.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Gate/onboarding fixes

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/LandingPage.tsx`

**Interfaces:** none — purely internal behavior/copy changes, no prop or export signature changes.

Fixes, per the spec's Part C: the landing page's "Join the council" CTA lands on the Create tab (finding 1); the world picker stays interactive and misleading on the Join tab (finding 2); there's no "How to play" link on the actual gate screen (finding 3); the gate's inputs don't submit on Enter (finding 7); and — found while reading the file for this task — a leftover `billing-spin` class from the pre-redesign system where `vd-spin` is what the rest of the app uses.

- [ ] **Step 1: `src/App.tsx` — add the `BookOpen` icon import**

Find:
```tsx
import {
  BadgeCheck,
  Check,
  Crown,
  LogIn,
  ScrollText,
  Sword,
  X,
  Sparkles,
  Loader2,
  User,
  Key,
  Timer,
  Lock,
  Shield,
} from "lucide-react";
```
Replace with:
```tsx
import {
  BadgeCheck,
  Check,
  Crown,
  LogIn,
  ScrollText,
  Sword,
  X,
  Sparkles,
  Loader2,
  User,
  Key,
  Timer,
  Lock,
  Shield,
  BookOpen,
} from "lucide-react";
```

- [ ] **Step 2: `src/App.tsx` — recognize `?tab=join` alongside the invite-code prefill**

Find:
```tsx
  // Prefill join from ?code=ABCD invite links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = (params.get("code") ?? "").trim().toUpperCase();
    if (invite.length === 4 && !sessionStorage.getItem("decevia.code")) {
      setCodeInput(invite);
      setActiveTab("join");
    }
  }, []);
```
Replace with:
```tsx
  // Prefill join from ?code=ABCD invite links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = (params.get("code") ?? "").trim().toUpperCase();
    if (invite.length === 4 && !sessionStorage.getItem("decevia.code")) {
      setCodeInput(invite);
      setActiveTab("join");
      return;
    }
    // The landing page's "Join the council" button has no code to prefill —
    // it links here with ?tab=join so the gate opens on the tab that click
    // actually meant, instead of defaulting to Convene.
    if (params.get("tab") === "join" && !sessionStorage.getItem("decevia.code")) {
      setActiveTab("join");
    }
  }, []);
```

- [ ] **Step 3: `src/App.tsx` — a submit helper the inputs and button share**

Find:
```tsx
  function Home() {
    return (
      <div className="vd-board">
```
Replace with:
```tsx
  function Home() {
    const gateSubmit = wrap(activeTab === "create" ? createRoom : () => joinRoom());
    return (
      <div className="vd-board">
```

- [ ] **Step 4: `src/App.tsx` — Enter submits from either field**

Find:
```tsx
            <input
              id="gate-name"
              className="vd-field"
              value={name}
              maxLength={16}
              onChange={(e) => { setName(e.target.value); setRejoinName(null); }}
              placeholder="unique per warrior"
              autoComplete="nickname"
            />

            {activeTab === "join" && (
              <>
                <label className="vd-field__label" htmlFor="gate-code">Council code</label>
                <input
                  id="gate-code"
                  className="vd-field vd-field--code"
                  value={codeInput}
                  maxLength={4}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
              </>
            )}
```
Replace with:
```tsx
            <input
              id="gate-name"
              className="vd-field"
              value={name}
              maxLength={16}
              onChange={(e) => { setName(e.target.value); setRejoinName(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") void gateSubmit(); }}
              placeholder="unique per warrior"
              autoComplete="nickname"
            />

            {activeTab === "join" && (
              <>
                <label className="vd-field__label" htmlFor="gate-code">Council code</label>
                <input
                  id="gate-code"
                  className="vd-field vd-field--code"
                  value={codeInput}
                  maxLength={4}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") void gateSubmit(); }}
                  placeholder="ABCD"
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
              </>
            )}
```

- [ ] **Step 5: `src/App.tsx` — the world picker is inert (and says so) on the Join tab**

Find:
```tsx
          <div className="vd-gate__worlds">
            <span className="vd-label">Choose a world</span>
            <div className="vd-worlds" style={{ marginTop: 10 }}>
              {THEME_LIST.map((t) => {
                const on = t.id === localThemeId;
                const paid = !premium && isPremiumTheme(t.id) && !on;
                return (
                  <button
                    key={t.id}
                    className={`vd-world ${on ? "is-on" : ""}`}
                    disabled={paid}
                    title={paid ? `${t.name} — premium world` : t.name}
                    onClick={() => setLocalThemeId(t.id)}
                  >
                    <span>
                      <span className="vd-world__name">{t.name}</span>
                      <span className="vd-world__sub">
                        {paid ? "premium world" : `${t.goodTeamName} vs ${t.evilTeamName}`}
                      </span>
                    </span>
                    {on && <Check size={13} color="var(--vd-brass)" style={{ marginLeft: "auto" }} />}
                    {paid && <Lock size={12} style={{ marginLeft: "auto" }} />}
                  </button>
                );
              })}
            </div>
          </div>
```
Replace with:
```tsx
          <div className="vd-gate__worlds">
            <span className="vd-label">Choose a world</span>
            {activeTab === "join" ? (
              // A joiner's pick here is discarded server-side — only the
              // host's world applies. Leaving the grid interactive implied
              // otherwise.
              <p className="vd-voice" style={{ marginTop: 10 }}>
                The world is set by the host — whatever they've chosen is
                what you'll see once you're seated.
              </p>
            ) : (
              <div className="vd-worlds" style={{ marginTop: 10 }}>
                {THEME_LIST.map((t) => {
                  const on = t.id === localThemeId;
                  const paid = !premium && isPremiumTheme(t.id) && !on;
                  return (
                    <button
                      key={t.id}
                      className={`vd-world ${on ? "is-on" : ""}`}
                      disabled={paid}
                      title={paid ? `${t.name} — premium world` : t.name}
                      onClick={() => setLocalThemeId(t.id)}
                    >
                      <span>
                        <span className="vd-world__name">{t.name}</span>
                        <span className="vd-world__sub">
                          {paid ? "premium world" : `${t.goodTeamName} vs ${t.evilTeamName}`}
                        </span>
                      </span>
                      {on && <Check size={13} color="var(--vd-brass)" style={{ marginLeft: "auto" }} />}
                      {paid && <Lock size={12} style={{ marginLeft: "auto" }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
```

- [ ] **Step 6: `src/App.tsx` — the button reuses `gateSubmit`**

Find:
```tsx
            <button
              className="vd-btn vd-btn--primary"
              onClick={wrap(activeTab === "create" ? createRoom : () => joinRoom())}
            >
              <span>{activeTab === "create" ? "Convene a council" : "Join the council"}</span>
              <Sparkles size={15} />
            </button>
```
Replace with:
```tsx
            <button className="vd-btn vd-btn--primary" onClick={gateSubmit}>
              <span>{activeTab === "create" ? "Convene a council" : "Join the council"}</span>
              <Sparkles size={15} />
            </button>
```

- [ ] **Step 7: `src/App.tsx` — a "How to play" link on the gate's own footer**

Find:
```tsx
          <footer className="vd-gate__foot">
            <a className="vd-pill" href="/rules"><ScrollText size={11} /> Rules</a>
```
Replace with:
```tsx
          <footer className="vd-gate__foot">
            <a className="vd-pill" href="/learn"><BookOpen size={11} /> How to play</a>
            <a className="vd-pill" href="/rules"><ScrollText size={11} /> Rules</a>
```

- [ ] **Step 8: `src/App.tsx` — swap the leftover `billing-spin` for `vd-spin`**

Find:
```tsx
            <Loader2 size={26} className="billing-spin" color="var(--vd-brass)" />
```
Replace with:
```tsx
            <Loader2 size={26} className="vd-spin" color="var(--vd-brass)" />
```

- [ ] **Step 9: `src/LandingPage.tsx` — the CTA passes `?tab=join`**

Find:
```tsx
          <a className="lp-act lp-act--primary" href="/play">
            Join the council <ArrowRight size={16} />
          </a>
```
Replace with:
```tsx
          <a className="lp-act lp-act--primary" href="/play?tab=join">
            Join the council <ArrowRight size={16} />
          </a>
```

- [ ] **Step 10: Verify the build**

Run: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`
Expected: exits 0.

- [ ] **Step 11: Manual QA**

With `npm run dev` running, and with no prior session (open a private/incognito window, or clear `sessionStorage` for the site):
- Visit `/` and click "Join the council" — confirm you land on `/play` with the **Join** tab active, not Create.
- On the Join tab, confirm the world picker is replaced by the "set by the host" note; switch to the Create tab and confirm the picker is back and interactive.
- Type a name and press Enter in the name field — confirm it submits (Create tab: attempts to convene; Join tab: attempts to join, which will show a validation message if the code field is empty, since `joinRoom` requires a 4-letter code — that's existing, correct behavior, not a regression).
- Confirm "How to play" appears in the gate's footer and links to `/learn`.
- Reload `/play` with no code in progress and confirm the loading spinner (visible only for an instant) still renders correctly.

- [ ] **Step 12: Commit**

```bash
git add src/App.tsx src/LandingPage.tsx
git commit -m "$(cat <<'EOF'
fix: onboarding friction on the gate and landing page

Join now lands on the join tab instead of Create; the world picker
no longer stays interactive (and misleading) once a joiner's choice
is discarded server-side; the gate's inputs submit on Enter, matching
sign-in; and the gate itself finally links to the walkthrough, which
previously only the marketing landing page did — the exact players
arriving by invite link never saw it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Lobby fixes — confirm before removing a player, inline disabled-reason

**Files:**
- Modify: `src/table/LobbyScreen.tsx`

**Interfaces:**
- Consumes: `Confirm` from `./TableShell` (Task 1).

- [ ] **Step 1: Import `Confirm`**

Find:
```tsx
import { ChronicleColumn, SeatRing } from "./Parts";
import { ActionLine } from "./TableShell";
```
Replace with:
```tsx
import { ChronicleColumn, SeatRing } from "./Parts";
import { ActionLine, Confirm } from "./TableShell";
```

- [ ] **Step 2: Confirm before removing a seated player**

Find:
```tsx
              {isHost && p.playerId !== pid && (
                <button
                  className="vd-tile__x"
                  title={`Remove ${p.name} — they can rejoin with the same code`}
                  aria-label={`Remove ${p.name}`}
                  onClick={act(() => onRemovePlayer(p.playerId))}
                >
                  <X size={12} />
                </button>
              )}
```
Replace with:
```tsx
              {isHost && p.playerId !== pid && (
                <Confirm
                  className="vd-tile__x"
                  compact
                  icon={<X size={12} />}
                  label="Remove"
                  ariaLabel={`Remove ${p.name}`}
                  ask={`Remove ${p.name}? They can rejoin with the same code.`}
                  onConfirm={act(() => onRemovePlayer(p.playerId))}
                />
              )}
```

- [ ] **Step 3: Confirm before removing a watcher**

Find:
```tsx
                        <button
                          className="vd-tile__x"
                          title={`Remove ${w.name} — they can rejoin with the same code`}
                          aria-label={`Remove ${w.name}`}
                          onClick={act(() => onRemovePlayer(w.playerId))}
                        >
                          <X size={12} />
                        </button>
```
Replace with:
```tsx
                        <Confirm
                          className="vd-tile__x"
                          compact
                          icon={<X size={12} />}
                          label="Remove"
                          ariaLabel={`Remove ${w.name}`}
                          ask={`Remove ${w.name}? They can rejoin with the same code.`}
                          onConfirm={act(() => onRemovePlayer(w.playerId))}
                        />
```

- [ ] **Step 4: Show the blocking reason inline, not only in a hover title**

Find:
```tsx
              <button
                key={o.key}
                className={`vd-opt vd-opt--${o.side} ${on ? "is-on" : ""}`}
                disabled={!isHost || lock || full}
                title={lock ? "Premium — upgrade to unlock" : full ? "No seat left on that side" : o.desc(rn)}
                onClick={act(() => toggle(o.key))}
              >
                <span className="vd-opt__top">
                  {o.side === "good"
                    ? <Sun size={12} color="var(--vd-brass)" />
                    : <Flame size={12} color="var(--vd-red-ink)" />}
                  <span className="vd-opt__name">{o.label(rn)}</span>
                  {lock ? <span className="vd-opt__lock"><Lock size={10} /> paid</span>
                    : on ? <Check size={13} color="var(--vd-brass)" /> : null}
                </span>
                <span className="vd-opt__desc">{o.desc(rn)}</span>
              </button>
```
Replace with:
```tsx
              <button
                key={o.key}
                className={`vd-opt vd-opt--${o.side} ${on ? "is-on" : ""}`}
                disabled={!isHost || lock || full}
                title={lock ? "Premium — upgrade to unlock" : full ? "No seat left on that side" : o.desc(rn)}
                onClick={act(() => toggle(o.key))}
              >
                <span className="vd-opt__top">
                  {o.side === "good"
                    ? <Sun size={12} color="var(--vd-brass)" />
                    : <Flame size={12} color="var(--vd-red-ink)" />}
                  <span className="vd-opt__name">{o.label(rn)}</span>
                  {lock ? <span className="vd-opt__lock"><Lock size={10} /> paid</span>
                    : on ? <Check size={13} color="var(--vd-brass)" /> : null}
                </span>
                {/* The blocking reason used to live only in `title`, invisible
                    on touch — this app's primary surface. It now replaces the
                    ability text whenever the option is actually blocked, so a
                    tap reveals the same thing a hover would. */}
                <span className="vd-opt__desc">
                  {lock ? "Premium — upgrade to unlock" : full ? "No seat left on that side" : o.desc(rn)}
                </span>
              </button>
```

- [ ] **Step 5: Verify the build**

Run: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`
Expected: exits 0.

- [ ] **Step 6: Manual QA**

With two browser tabs in the same room (one host, one guest):
- As host, click the remove control next to the guest's name — confirm the two-tap ask/Yes/No flow appears before anything happens, and "No" leaves them seated.
- On a touch device or DevTools mobile emulation, fill every good-side role slot, then tap a still-off good-side role — confirm "No seat left on that side" is now visible on the card itself, not only on long-press/hover.

- [ ] **Step 7: Commit**

```bash
git add src/table/LobbyScreen.tsx
git commit -m "$(cat <<'EOF'
fix: confirm before removing a lobby player; show blocked-option reason on touch

Every other destructive table action already goes through the app's
two-tap Confirm; removing a player from the lobby did not. Disabled
role/expansion options explained themselves only via a hover title,
which never fires on touch.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Keyboard-accessible role reveal

**Files:**
- Modify: `src/table/RoleReveal.tsx`
- Modify: `src/table/NightScreen.tsx`

**Interfaces:**
- `useHold(delay?)` (exported from `RoleReveal.tsx`, consumed by `NightScreen.tsx`) now returns `{ held, start, end, onKeyDown, onKeyUp }` instead of `{ held, start, end }`.

- [ ] **Step 1: `src/table/RoleReveal.tsx` — widen the `PointerEvent` import**

Find:
```tsx
import type { PointerEvent } from "react";
```
Replace with:
```tsx
import type { KeyboardEvent, PointerEvent } from "react";
```

- [ ] **Step 2: `src/table/RoleReveal.tsx` — add keyboard handlers to `useHold`**

Find:
```tsx
  // Letting go anywhere hides it, even if the finger drifted off.
  useEffect(() => {
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      clear();
    };
  }, [end, clear]);

  return { held, start, end };
}
```
Replace with:
```tsx
  // Letting go anywhere hides it, even if the finger drifted off.
  useEffect(() => {
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      clear();
    };
  }, [end, clear]);

  /**
   * A keyboard-activated button fires `click`, never `pointerdown`/`pointerup`
   * — so a keyboard-only or switch-access user could never trigger the hold
   * at all, meaning they could never see their own role. Enter/Space now
   * start and end the same hold; `e.repeat` (the browser auto-repeating a
   * held key) is ignored so the timer doesn't keep resetting.
   */
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (e.repeat) return;
      clear();
      timer.current = window.setTimeout(() => setHeld(true), delay);
    },
    [clear, delay],
  );
  const onKeyUp = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      end();
    },
    [end],
  );

  return { held, start, end, onKeyDown, onKeyUp };
}
```

- [ ] **Step 3: `src/table/RoleReveal.tsx` — wire the handlers onto the button**

Find:
```tsx
  const { held, start, end } = useHold();
  const me = room.me;
```
Replace with:
```tsx
  const { held, start, end, onKeyDown, onKeyUp } = useHold();
  const me = room.me;
```

Find:
```tsx
      <button
        className={`vd-mylot ${held ? "is-holding" : ""}`}
        type="button"
        onPointerDown={start}
        onPointerUp={end}
        onPointerCancel={end}
        onContextMenu={(e) => e.preventDefault()}
      >
```
Replace with:
```tsx
      <button
        className={`vd-mylot ${held ? "is-holding" : ""}`}
        type="button"
        onPointerDown={start}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onContextMenu={(e) => e.preventDefault()}
      >
```

- [ ] **Step 4: `src/table/NightScreen.tsx` — wire the same handlers onto the night card's hold button**

Find:
```tsx
  const { held, start, end } = useHold();
  const me = room.me;
```
Replace with:
```tsx
  const { held, start, end, onKeyDown, onKeyUp } = useHold();
  const me = room.me;
```

Find:
```tsx
              <button
                className={`vd-hold ${held ? "is-holding" : ""}`}
                type="button"
                onPointerDown={start}
                onPointerUp={end}
                onPointerCancel={end}
                onContextMenu={(e) => e.preventDefault()}
              >
```
Replace with:
```tsx
              <button
                className={`vd-hold ${held ? "is-holding" : ""}`}
                type="button"
                onPointerDown={start}
                onPointerUp={end}
                onPointerCancel={end}
                onKeyDown={onKeyDown}
                onKeyUp={onKeyUp}
                onContextMenu={(e) => e.preventDefault()}
              >
```

- [ ] **Step 5: Verify the build**

Run: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`
Expected: exits 0.

- [ ] **Step 6: Manual QA**

In a running game, Tab to the "Hold to see your lot" shell-bar control (or the night screen's "Hold to reveal" button) using only the keyboard, then press and hold Space (or Enter) — confirm the role reveals while held and hides on release, exactly like the pointer version. Confirm holding the key down doesn't repeatedly restart the timer (it should reveal once, ~400ms after the first press, and stay revealed until released).

- [ ] **Step 7: Commit**

```bash
git add src/table/RoleReveal.tsx src/table/NightScreen.tsx
git commit -m "$(cat <<'EOF'
fix: make hold-to-reveal reachable by keyboard

The reveal only listened for pointer events, so a keyboard-only or
switch-access player could never see their own role at all — not on
the shell bar, not on the night card.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `Plate` overlay focus trap

**Files:**
- Modify: `src/TableParts.tsx`

**Interfaces:** none — `Plate`'s props are unchanged; this is internal to the component.

Deliberately **not** adding Escape-to-dismiss (see the spec's finding 6): several screens built on `Plate` (Excalibur, King Returns) are a forced game decision with no single safe "cancel" action, unlike `RevealCeremony`'s genuinely dismissable announcement.

- [ ] **Step 1: Widen the React import**

Find:
```tsx
import { useEffect, useState } from "react";
```
Replace with:
```tsx
import { useEffect, useRef, useState } from "react";
```

- [ ] **Step 2: Add the focus trap to `Plate`**

Find:
```tsx
export function Plate({
  eyebrow, title, danger, children, action,
}: {
  eyebrow: string;
  title: string;
  danger?: boolean;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="vd-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`vd-plate vd-studded ${danger ? "vd-plate--danger" : ""}`}>
        <span className="vd-stud-b" aria-hidden />
        <div className="vd-label" style={{ textAlign: "center", letterSpacing: ".32em" }}>{eyebrow}</div>
        <h2 className="vd-h1" style={{ marginTop: 14, textAlign: "center", fontSize: 30 }}>{title}</h2>
        {children}
        {action && <div style={{ marginTop: 20 }}>{action}</div>}
      </div>
    </div>
  );
}
```
Replace with:
```tsx
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Plate({
  eyebrow, title, danger, children, action,
}: {
  eyebrow: string;
  title: string;
  danger?: boolean;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  /**
   * WAI-ARIA modal-dialog basics: move focus in on mount, and keep Tab from
   * leaving the dialog. Deliberately NOT adding Escape-to-dismiss here —
   * unlike `RevealCeremony` (a dismissable announcement, where Escape already
   * exists and is correct), several screens built on `Plate` — Excalibur,
   * King Returns — are a forced, non-skippable game decision. There's no
   * single action that's safe to bind Escape to across all of them.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = () =>
      Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => !n.hasAttribute("disabled"),
      );
    (items()[0] ?? el).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = items();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="vd-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div
        ref={ref}
        tabIndex={-1}
        className={`vd-plate vd-studded ${danger ? "vd-plate--danger" : ""}`}
      >
        <span className="vd-stud-b" aria-hidden />
        <div className="vd-label" style={{ textAlign: "center", letterSpacing: ".32em" }}>{eyebrow}</div>
        <h2 className="vd-h1" style={{ marginTop: 14, textAlign: "center", fontSize: 30 }}>{title}</h2>
        {children}
        {action && <div style={{ marginTop: 20 }}>{action}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the build**

Run: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`
Expected: exits 0.

- [ ] **Step 4: Manual QA**

Trigger a screen built on `Plate` (easiest: the King Returns window, or the quest-result plate at the end of a quest) and, using only the keyboard:
- Confirm focus lands inside the plate as soon as it appears (a visible focus ring should already be on the first button/link inside it — check `vd-btn:focus-visible`'s existing outline).
- Press Tab repeatedly and confirm focus cycles only among the plate's own buttons, never escaping to the board behind it; Shift+Tab from the first item should wrap to the last.
- Confirm Escape does **not** dismiss a forced-decision plate (Excalibur/King Returns) — only the plate's own action button should.

- [ ] **Step 5: Commit**

```bash
git add src/TableParts.tsx
git commit -m "$(cat <<'EOF'
fix: trap focus inside the shared Plate overlay

Plate claimed aria-modal without moving focus into it or keeping Tab
from leaving it — every overlay built on it (King Returns, Excalibur,
the quest result) inherited the gap. Deliberately not adding
Escape-to-dismiss: several of those screens are a forced game
decision, not a dismissable notice.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Differentiate Restart / New council / Close council

**Files:**
- Modify: `src/table/TableShell.tsx`

**Interfaces:** none.

- [ ] **Step 1: Add a grouping rule between Restart and the room-ending actions**

Find:
```tsx
        <div className="vd-shellbar">
          {isHost && room.phase !== "lobby" && (
            <Confirm
              label="Restart"
              icon={<RotateCcw size={11} />}
              ask="Restart — everyone back to the lobby?"
              onConfirm={onRestart}
            />
          )}
          {isHost && (
            <Confirm
              label="New council"
              icon={<Sparkles size={11} />}
              ask="Close this one and open a fresh council under a new code?"
              onConfirm={onStartFresh}
            />
          )}
```
Replace with:
```tsx
        <div className="vd-shellbar">
          {/* Restart keeps this room and its code; New council and Close both
              end it (into a fresh one, or for good). A rule between them
              groups by consequence, so the three no longer read as one
              undifferentiated row under time pressure. */}
          {isHost && room.phase !== "lobby" && (
            <Confirm
              label="Restart"
              icon={<RotateCcw size={11} />}
              ask="Restart — everyone back to the lobby?"
              onConfirm={onRestart}
            />
          )}
          {isHost && room.phase !== "lobby" && (
            <span
              className="vd-rule"
              style={{ width: 1, height: 14, background: "var(--vd-rule-control)" }}
              aria-hidden
            />
          )}
          {isHost && (
            <Confirm
              label="New council"
              icon={<Sparkles size={11} />}
              ask="Close this one and open a fresh council under a new code?"
              onConfirm={onStartFresh}
            />
          )}
```

- [ ] **Step 2: Verify the build**

Run: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`
Expected: exits 0.

- [ ] **Step 3: Manual QA**

As host, mid-game, confirm a thin vertical rule now separates "Restart" from "New council"/"Close council" in the shell bar, and that it only appears when Restart itself is visible (i.e. not in the lobby, where Restart is hidden).

- [ ] **Step 4: Commit**

```bash
git add src/table/TableShell.tsx
git commit -m "$(cat <<'EOF'
fix: visually group Restart apart from New council / Close council

The three sat in one undifferentiated row, distinguished only by
label text read under time pressure. A rule now separates the action
that keeps this room from the two that end it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Night-phase readiness reminder

**Files:**
- Modify: `src/table/NightScreen.tsx`

**Interfaces:** none.

A true "X of Y have read their card" count needs a new server field and mutation — every other progress count in the app (`voteProgress`, `questProgress`) is computed server-side from a real submission, and this pass is frontend-only (see the spec's Non-goals). This is the frontend-only version: a reminder, not a count.

- [ ] **Step 1: Add the reminder above the host's Begin button**

Find:
```tsx
        <div className="vd-centre__wide vd-actionbar">
          {isHost ? (
            <button className="vd-btn vd-btn--primary" onClick={act(onBegin)}>
              <span>All have read their lot — begin</span>
              <Sword size={16} />
            </button>
          ) : (
```
Replace with:
```tsx
        <div className="vd-centre__wide vd-actionbar">
          {isHost ? (
            <>
              {/* There's no way to tell who has actually held their card yet
                  — unlike Vote and Quest, which both count a real
                  submission, that would need a new server field this pass
                  doesn't add. A reminder in place of a live count still sets
                  the right expectation before a screen that can't be replayed. */}
              <p className="vd-voice" style={{ marginBottom: 10 }}>
                Make sure everyone at the table has held their card and read
                it — there's no way to replay this screen for someone who missed it.
              </p>
              <button className="vd-btn vd-btn--primary" onClick={act(onBegin)}>
                <span>All have read their lot — begin</span>
                <Sword size={16} />
              </button>
            </>
          ) : (
```

- [ ] **Step 2: Verify the build**

Run: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`
Expected: exits 0.

- [ ] **Step 3: Manual QA**

Start a game and reach the night screen as host — confirm the reminder line appears directly above "All have read their lot — begin," and that non-host players still see their existing "study it" panel unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/table/NightScreen.tsx
git commit -m "$(cat <<'EOF'
fix: remind the host to check readiness before beginning

Vote and Quest both show a live "X of Y have acted" count; Night has
no equivalent because doing that honestly needs a new server field
this pass doesn't add. A static reminder sets the same expectation
without claiming a count the app can't back up.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: `/learn` fixes — reduced motion, and a missing jump-nav entry

**Files:**
- Modify: `src/learn/Stage.tsx`
- Modify: `src/LearnPage.tsx`

**Interfaces:** none.

`Cards`' flip needs special handling: `.lx-card__in`'s `rotateY` is set entirely by the GSAP call (`.lx-card__face--front`'s own `rotateY(180deg)` in `learn.css` is static and combines with it) — simply skipping the animation under reduced motion would leave an "is-up" card stuck showing its back face. The fix sets the same end state instantly instead.

- [ ] **Step 1: `src/learn/Stage.tsx` — gate `Caption`'s animation**

Find:
```tsx
function Caption({ beat }: { beat: Beat }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".lx-say", { y: 10, opacity: 0, duration: 0.4, ease: "power3.out" });
      gsap.from(".lx-note", { opacity: 0, duration: 0.4, delay: 0.15 });
    }, root);
    return () => ctx.revert();
  }, []);
```
Replace with:
```tsx
function Caption({ beat }: { beat: Beat }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".lx-say", { y: 10, opacity: 0, duration: 0.4, ease: "power3.out" });
      gsap.from(".lx-note", { opacity: 0, duration: 0.4, delay: 0.15 });
    }, root);
    return () => ctx.revert();
  }, []);
```

- [ ] **Step 2: `src/learn/Stage.tsx` — gate `Cards`' animation, but keep its end state correct**

Find:
```tsx
function Cards({ cards }: { cards: Array<"back" | "success" | "fail"> }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".lx-card", { y: 18, opacity: 0, stagger: 0.07, duration: 0.35 });
      const faces = gsap.utils.toArray<HTMLElement>(".lx-card.is-up .lx-card__in");
      if (faces.length) {
        gsap.fromTo(
          faces,
          { rotateY: 0 },
          { rotateY: 180, stagger: 0.22, duration: 0.5, delay: 0.35, ease: "power2.inOut" },
        );
      }
    }, root);
    return () => ctx.revert();
  }, []);
```
Replace with:
```tsx
function Cards({ cards }: { cards: Array<"back" | "success" | "fail"> }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const faces = gsap.utils.toArray<HTMLElement>(".lx-card.is-up .lx-card__in");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Skip the animated entrance/flip, but an "is-up" card's rotateY is set
      // entirely by this call (learn.css's own rotateY(180deg) is on the
      // FRONT FACE, not this wrapper) — so it still needs setting, instantly,
      // or the card stays stuck showing its back.
      if (faces.length) gsap.set(faces, { rotateY: 180 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.from(".lx-card", { y: 18, opacity: 0, stagger: 0.07, duration: 0.35 });
      if (faces.length) {
        gsap.fromTo(
          faces,
          { rotateY: 0 },
          { rotateY: 180, stagger: 0.22, duration: 0.5, delay: 0.35, ease: "power2.inOut" },
        );
      }
    }, root);
    return () => ctx.revert();
  }, []);
```

- [ ] **Step 3: `src/LearnPage.tsx` — add the missing jump-nav entry**

Find:
```tsx
        <div className="lx-jump">
          <a href="#watch"><Users size={12} /> Watch a round</a>
          <a href="#cast"><Moon size={12} /> The cast</a>
          <a href="#expansions"><Sparkles size={12} /> Expansions</a>
          <a href="#plots"><Zap size={12} /> Plot cards</a>
        </div>
```
Replace with:
```tsx
        <div className="lx-jump">
          <a href="#watch"><Users size={12} /> Watch a round</a>
          <a href="#table"><Swords size={12} /> How the table splits</a>
          <a href="#cast"><Moon size={12} /> The cast</a>
          <a href="#expansions"><Sparkles size={12} /> Expansions</a>
          <a href="#plots"><Zap size={12} /> Plot cards</a>
        </div>
```

(`Swords` is already imported in this file — used by the Excalibur feature card — so no import change is needed.)

- [ ] **Step 4: Verify the build**

Run: `cd "/Users/amber/Developer/Coding Practice/mahabharata" && npx tsc -b`
Expected: exits 0.

- [ ] **Step 5: Manual QA**

- In DevTools, enable "Emulate CSS prefers-reduced-motion: reduce" (or your OS's reduce-motion setting), then visit `/learn` and step through a scenario that includes a quest-card reveal (e.g. the round-start-to-finish scenario). Confirm cards that should show as revealed (Success/Fail) render face-up immediately, not stuck on their backs, and that nothing animates.
- Turn reduced-motion back off, replay the same scenario, and confirm the flip animation still plays normally — this task must not have changed anything for users who haven't asked for reduced motion.
- Confirm the jump-nav now has five entries and "How the table splits" scrolls to the team-size/quest-size matrix section.

- [ ] **Step 6: Commit**

```bash
git add src/learn/Stage.tsx src/LearnPage.tsx
git commit -m "$(cat <<'EOF'
fix: respect reduced motion in the walkthrough's stage, add missing jump link

Stage.tsx was the one place in the app with autoplaying, repeating
motion (every 4.2s) that didn't check prefers-reduced-motion, even
though the page's own load-in animation does. The card-flip fix sets
the revealed state instantly rather than just skipping the tween,
since the flip is how a card's result becomes readable, not just
decoration.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Post-plan: what this deliberately leaves out

- **Host-disconnect recovery** (no player can advance the game if the host's tab dies mid-game) — needs a new server-side host-transfer mechanism, out of scope for a UI/UX pass. Worth its own spec.
- **A broader dead-CSS sweep of `styles.css`** — this plan only removes the one shim block in `seal.css` it can prove is dead as a direct consequence of Tasks 2–4. `styles.css` itself (the pre-Verdict `.home__*`, `.scepter-btn`, `.war-timer*`, etc.) wasn't audited for live usage as part of this plan and may contain more dead code, but confirming that safely is a separate investigation.

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
  const [msgKind, setMsgKind] = useState<"ok" | "error">("ok");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      if (ok) { setMsg(ok); setMsgKind("ok"); }
    } catch (e: any) {
      setMsg(e?.message ?? "Something went wrong.");
      setMsgKind("error");
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
          <p
            className={`vd-panel ${msgKind === "error" ? "vd-panel--danger vd-errline" : "vd-panel--strong"}`}
            style={{ margin: "0 0 20px" }}
          >
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

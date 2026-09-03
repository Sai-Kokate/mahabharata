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
          <p className="vd-loading" role="status">
            <Loader2 size={26} className="vd-spin" color="var(--vd-brass)" />
            <span>Loading the admin console…</span>
          </p>
        </div>
      </div>
    );
  }

  if (!viewer.signedIn) {
    return (
      <div className="vd-board">
        <div className="vd-content vd-page">
          <div className="vd-page__back">
            <a className="vd-pill" href="/play"><ArrowLeft size={13} /> Back to the game</a>
          </div>
          <header className="vd-page__head">
            <span className="vd-label vd-label--brass"><Shield size={13} /> Admin</span>
            <h1 className="vd-hero">Admin console</h1>
            <p className="vd-voice">
              Sign in with an admin account to manage plans and payments.
            </p>
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
            <a className="vd-pill" href="/play"><ArrowLeft size={13} /> Back to the game</a>
          </div>
          <header className="vd-page__head">
            <span className="vd-label vd-label--brass"><Shield size={13} /> Admin</span>
            <h1 className="vd-hero">You don't have access to this</h1>
            <p className="vd-voice">
              <strong>{viewer.email}</strong> isn't an admin account, so there's
              nothing for you here. If you were expecting access, whoever runs
              this deployment can add your email to the{" "}
              <code>ADMIN_EMAILS</code> setting.
            </p>
          </header>
          <button className="vd-pill vd-pill--action" onClick={() => void signOut()}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vd-board">
      <div className="vd-content vd-page">
        <div className="vd-page__back">
          <a className="vd-pill" href="/play"><ArrowLeft size={13} /> Back to the game</a>
        </div>
        <header className="vd-page__head">
          <span className="vd-label vd-label--brass"><Shield size={13} /> Admin</span>
          <h1 className="vd-hero">Admin console</h1>
          <p className="vd-voice">
            Signed in as <strong>{viewer.email}</strong>. Approve payments, edit
            plans, and see who is covered.
          </p>
          <button className="vd-textbtn" onClick={() => void signOut()}>
            <LogOut size={13} /> Sign out
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
            ["orders", "Payments to check", Clock],
            ["subs", "Active plans", Crown],
            ["users", "Accounts", Users],
            ["grant", "Give a plan", Gift],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "is-active" : undefined}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              onClick={() => setTab(id)}
            >
              <Icon size={14} />
              <span className="vd-seg__label">{label}</span>
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
    ["To check", String(o.pendingOrders)],
    ["Active plans", String(o.liveSubscriptions)],
    ["People covered", String(o.seatsCovered)],
    ["Approved", String(o.approvedOrders)],
    ["Money in", INR(o.revenueInr)],
    ["Accounts", String(o.users)],
    ["Games open now", String(o.openRooms)],
  ];
  return (
    <div className="vd-stats">
      {tiles.map(([label, value]) => (
        <div key={label} className="vd-studded vd-panel vd-panel--strong">
          <span className="vd-stud-b" aria-hidden />
          <div className="vd-numeral" style={{ fontSize: 28 }}>{value}</div>
          <div className="vd-label" style={{ marginTop: 6 }}>{label}</div>
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
        <h2 className="vd-h2 vd-h2--icon">
          <Clock size={18} /> Payments to check ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Nothing waiting. New payment requests will appear here.
          </p>
        )}
        <div className="vd-stack" style={{ marginTop: 16 }}>
          {pending.map((o) => (
            <div key={o._id} className="vd-studded vd-panel vd-panel--strong vd-stack">
              <span className="vd-stud-b" aria-hidden />
              <div className="vd-row" style={{ justifyContent: "space-between" }}>
                <strong className="vd-h3">{o.name}</strong>
                <span className="vd-pill vd-pill--brass">
                  {o.plan === "yearly" ? "Yearly" : "Monthly"} · {INR(o.amountInr)}
                </span>
              </div>
              <span className="vd-label vd-label--dim">{o.email}</span>

              <div className="vd-row" style={{ gap: 20, marginTop: 4 }}>
                <div>
                  <div className="vd-label">Payment reference</div>
                  <code style={{ fontSize: 13 }}>{o.paymentRef}</code>
                </div>
                <div>
                  <div className="vd-label">Submitted</div>
                  <span style={{ fontSize: 13 }}>{fmtWhen(o.createdAt)}</span>
                </div>
                <div>
                  <div className="vd-label">People covered</div>
                  <span style={{ fontSize: 13 }}>{o.seats}</span>
                </div>
              </div>

              <div className="vd-row" style={{ marginTop: 4 }}>
                <span className="vd-label">Covers these emails</span>
                {o.memberEmails.map((e: string) => (
                  <span key={e} className="vd-pill">{e}</span>
                ))}
              </div>

              {o.note && (
                <p className="vd-voice" style={{ margin: 0 }}>They added: &ldquo;{o.note}&rdquo;</p>
              )}

              <div className="vd-row" style={{ marginTop: 8 }}>
                <input
                  className="vd-field"
                  style={{ maxWidth: 200, marginBottom: 0 }}
                  inputMode="numeric"
                  placeholder="Days (leave blank for the full plan)"
                  value={days[o._id] ?? ""}
                  onChange={(e) => setDays({ ...days, [o._id]: e.target.value })}
                />
                <input
                  className="vd-field"
                  style={{ maxWidth: 220, marginBottom: 0 }}
                  placeholder="Note for them (optional)"
                  value={notes[o._id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [o._id]: e.target.value })}
                />
                <button
                  className="vd-pill vd-pill--parchment vd-pill--action"
                  disabled={busy}
                  onClick={() =>
                    void run(() => {
                      const d = Number.parseInt(days[o._id] ?? "", 10);
                      return approve({
                        orderId: o._id,
                        days: Number.isFinite(d) && d > 0 ? d : undefined,
                        adminNote: notes[o._id]?.trim() || undefined,
                      });
                    }, `Done — ${o.seats} people on ${o.email}'s plan now have the paid features.`)
                  }
                >
                  <Check size={14} /> Approve and switch it on
                </button>
                <Confirm
                  className="vd-pill vd-pill--danger vd-pill--action"
                  icon={<X size={14} />}
                  label="Reject"
                  ask={`Reject ${o.email}'s payment request? They'll be able to submit a new one.`}
                  disabled={busy}
                  danger
                  onConfirm={() =>
                    run(
                      () =>
                        reject({
                          orderId: o._id,
                          adminNote: notes[o._id]?.trim() || undefined,
                        }),
                      `Rejected. ${o.email} can submit a new request.`,
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
          <h2 className="vd-h2 vd-h2--icon">
            <ScrollText size={18} /> Already dealt with
          </h2>
          <div className="vd-rowlist vd-rowlist--3col" style={{ marginTop: 16 }}>
            <div className="vd-rowlist__head">
              <span>When</span><span>Who</span><span>Status</span>
            </div>
            {done.map((o) => (
              <div key={o._id} className="vd-rowlist__row">
                <span>{fmtDate(o.createdAt)}</span>
                <span>{o.email} · {o.plan === "yearly" ? "Yearly" : "Monthly"} · {INR(o.amountInr)}</span>
                <span
                  className={`vd-pill ${o.status === "approved" ? "vd-pill--parchment" : "vd-pill--danger"}`}
                >
                  {o.status === "approved" ? "Approved" : "Rejected"}
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
        <p className="vd-voice">
          No plans yet. Once you approve a payment, or give someone a plan, it
          will show up here.
        </p>
      </section>
    );
  }

  return (
    <section className="vd-page__section">
      <h2 className="vd-h2 vd-h2--icon">
        <Crown size={18} /> Active plans ({subs.length})
      </h2>
      <div className="vd-stack" style={{ marginTop: 16 }}>
        {subs.map((s) => {
          const draft = drafts[s._id] ?? s.members.join(", ");
          return (
            <div key={s._id} className="vd-studded vd-panel vd-panel--strong vd-stack">
              <span className="vd-stud-b" aria-hidden />
              <div className="vd-row" style={{ justifyContent: "space-between" }}>
                <strong className="vd-h3">{s.ownerEmail}</strong>
                <span className={`vd-pill ${s.live ? "vd-pill--parchment" : "vd-pill--danger"}`}>
                  {s.live ? "Active" : s.status === "revoked" ? "Revoked" : "Expired"}
                </span>
              </div>
              <span className="vd-label">
                {s.plan === "yearly" ? "Yearly" : "Monthly"} · covers {s.seats} people ·
                runs out {fmtDate(s.expiresAt)}
              </span>
              {s.adminNote && (
                <p className="vd-voice" style={{ margin: 0 }}>Your note: &ldquo;{s.adminNote}&rdquo;</p>
              )}
              <div className="vd-row">
                <span className="vd-label">{s.members.length} of {s.seats} places used</span>
                {s.members.map((e: string) => (
                  <span key={e} className="vd-pill">{e}</span>
                ))}
              </div>
              <label className="vd-field__label">Who this plan covers</label>
              <input
                className="vd-field"
                value={draft}
                aria-describedby={`members-help-${s._id}`}
                onChange={(e) => setDrafts({ ...drafts, [s._id]: e.target.value })}
              />
              <span className="vd-hint" id={`members-help-${s._id}`}>
                Email addresses, separated by commas.
              </span>
              <div className="vd-row">
                <button
                  className="vd-pill vd-pill--action"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        setSeats({
                          subscriptionId: s._id,
                          emails: draft.split(",").map((e) => e.trim()).filter(Boolean),
                        }),
                      "Saved.",
                    )
                  }
                >
                  <Check size={14} /> Save this list
                </button>
                <button
                  className="vd-pill vd-pill--action"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        setStatus({
                          subscriptionId: s._id,
                          status: "active",
                          expiresAt: Math.max(Date.now(), s.expiresAt) + 30 * 86400_000,
                        }),
                      "Added 30 days to this plan.",
                    )
                  }
                >
                  <RefreshCw size={14} /> Add 30 days
                </button>
                {s.status === "active" ? (
                  <Confirm
                    className="vd-pill vd-pill--danger vd-pill--action"
                    icon={<Ban size={14} />}
                    label="Turn off"
                    ask={`Turn off ${s.ownerEmail}'s plan now? Everyone on it loses the paid features immediately. You can switch it back on afterwards.`}
                    disabled={busy}
                    danger
                    onConfirm={() =>
                      run(
                        () => setStatus({ subscriptionId: s._id, status: "revoked" }),
                        "Turned off. You can switch it back on from this page.",
                      )
                    }
                  />
                ) : (
                  <button
                    className="vd-pill vd-pill--parchment vd-pill--action"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => setStatus({ subscriptionId: s._id, status: "active" }),
                        "Turned back on.",
                      )
                    }
                  >
                    <BadgeCheck size={14} /> Turn back on
                  </button>
                )}
                <Confirm
                  className="vd-pill vd-pill--danger vd-pill--action"
                  icon={<Trash2 size={14} />}
                  label="Delete for good"
                  ask={`Permanently delete ${s.ownerEmail}'s plan and everyone on it? This cannot be undone — use "Turn off" if you might want it back.`}
                  disabled={busy}
                  danger
                  onConfirm={() =>
                    run(() => del({ subscriptionId: s._id }), "Deleted.")
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
      <h2 className="vd-h2 vd-h2--icon">
        <Users size={18} /> Accounts ({users.length})
      </h2>
      <div className="vd-rowlist vd-rowlist--3col" style={{ marginTop: 16 }}>
        <div className="vd-rowlist__head">
          <span>Signed up</span><span>Account</span><span>Plan</span>
        </div>
        {users.map((u) => (
          <div key={u._id} className="vd-rowlist__row">
            <span>{fmtDate(u.joinedAt)}</span>
            <span>
              {u.name ? `${u.name} · ` : ""}{u.email ?? "no email"}
              {u.isAdmin && " · admin"}
            </span>
            <span className={`vd-pill ${u.premium ? "vd-pill--parchment" : ""}`}>
              {u.premium ? "Paid" : "Free"}
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
      <h2 className="vd-h2 vd-h2--icon">
        <Gift size={18} /> Give someone a plan
      </h2>
      <p className="vd-voice" style={{ marginTop: 8 }}>
        Use this for free plans, testing, or a payment you took some other way.
        The person needs to have signed up at least once, so their account
        already exists.
      </p>

      <label className="vd-field__label" style={{ marginTop: 20, display: "block" }} htmlFor="grant-owner">
        Whose plan is it?
      </label>
      <input
        id="grant-owner"
        className="vd-field"
        placeholder="someone@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="vd-field__label" style={{ display: "block" }} htmlFor="grant-others">
        Anyone else it should cover (optional)
      </label>
      <input
        id="grant-others"
        className="vd-field"
        placeholder="a@example.com, b@example.com"
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        aria-describedby="grant-others-help"
      />
      <span className="vd-hint" id="grant-others-help">
        Email addresses, separated by commas.
      </span>

      <div className="vd-row">
        <select
          className="vd-field"
          style={{ maxWidth: 160 }}
          value={plan}
          onChange={(e) => setPlan(e.target.value as "monthly" | "yearly")}
        >
          <option value="monthly">Monthly plan</option>
          <option value="yearly">Yearly plan</option>
        </select>
        <input
          className="vd-field"
          style={{ maxWidth: 160 }}
          inputMode="numeric"
          placeholder="Days (optional)"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
        <input
          className="vd-field"
          style={{ maxWidth: 160 }}
          inputMode="numeric"
          placeholder="People (optional)"
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
        />
      </div>

      <label className="vd-field__label" style={{ display: "block" }} htmlFor="grant-note">
        Note to yourself (optional)
      </label>
      <input
        id="grant-note"
        className="vd-field"
        placeholder="e.g. competition winner"
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
          }, `Done — ${email.trim()} now has a ${plan} plan.`)
        }
      >
        <span>
          {email.trim().length < 5 ? "Enter an email address first" : "Give them the plan"}
        </span>
        <Gift size={16} />
      </button>
    </section>
  );
}

function Loading({ what = "Loading\u2026" }: { what?: string }) {
  return (
    <div className="vd-center" style={{ minHeight: 200 }}>
      <p className="vd-loading" role="status">
        <Loader2 size={22} className="vd-spin" color="var(--vd-brass)" />
        <span>{what}</span>
      </p>
    </div>
  );
}

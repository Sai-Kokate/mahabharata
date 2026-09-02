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

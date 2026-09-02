/* ============================================================================
   Shared pieces: the clock fuse, the quest ladder, the rejection track, the
   chronicle, and the overlay plate. All flat — no animation, no glow.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";

/* ---------------------------------------------------------------- clock --- */

/**
 * The clock is a number plus a fuse of flat ticks. It never animates: it
 * re-renders once a second and ticks go dark in whole steps, which reads as
 * urgency without motion.
 */
export function ClockFuse({
  endsAt,
  totalMs,
  ticks = 15,
  caption = "then one minute to name the party",
}: { endsAt: number; totalMs: number; ticks?: number; caption?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, endsAt - now);
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const lit = Math.ceil((remaining / totalMs) * ticks);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div className="vd-clock" role="timer" aria-live="off">
          {mm}:{String(ss).padStart(2, "0")}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="vd-label">To decide</div>
          {caption && (
            <div style={{ marginTop: 7, font: "italic 400 13px/1 var(--vd-voice)", color: "var(--vd-ink-dim)" }}>
              {caption}
            </div>
          )}
        </div>
      </div>
      <div className="vd-fuse" style={{ marginTop: 13 }} aria-hidden>
        {Array.from({ length: ticks }, (_, i) => (
          <i key={i} className={i < lit ? "is-lit" : undefined} />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------- quest ladder --- */

const ROMAN = ["I", "II", "III", "IV", "V"];

export function QuestLadder({
  sizes,
  questIndex,
  results,
  doubleFail = [],
  log = [],
}: {
  sizes: number[];                                  // QUEST_SIZES[playerCount]
  questIndex: number;
  results: (("success" | "fail") | null)[];
  /** Quests needing two fails: Q4 at 7+, and Q3 as well above ten. */
  doubleFail?: number[];
  /**
   * Counts for quests already ridden. A ridden rung swaps its party size for
   * what actually came back, so the history is legible from every screen
   * without opening the ledger.
   */
  log?: Array<{ questIndex: number; successes: number; fails: number }>;
}) {
  return (
    <div>
      <div className="vd-label vd-label--dim">The five quests</div>
      <div className="vd-seg" style={{ marginTop: 12 }}>
        {sizes.map((size, i) => {
          const result = results[i];
          const active = i === questIndex;
          const tally = log.find((q) => q.questIndex === i);
          return (
            <div key={i} className={active ? "is-active" : undefined} style={{ position: "relative" }}>
              <div className="vd-numeral" style={{
                fontSize: 16,
                color: active ? "#171410" : result === "fail" ? "var(--vd-red-ink)" : result ? "var(--vd-ink)" : "var(--vd-ink-muted)",
              }}>
                {ROMAN[i]}
              </div>
              <div
                style={{
                  marginTop: 5, font: "700 9px/1 var(--vd-ui)",
                  color: active ? "rgba(23,20,16,.6)" : "var(--vd-ink-dim)",
                }}
                title={
                  tally
                    ? `${tally.successes} success, ${tally.fails} fail of ${tally.successes + tally.fails}`
                    : `${size} ride`
                }
              >
                {tally ? (
                  <>
                    <span style={{ color: "var(--vd-ink)" }}>{tally.successes}</span>
                    <span style={{ opacity: 0.5 }}>–</span>
                    <span style={{ color: tally.fails > 0 ? "var(--vd-red-ink)" : "inherit" }}>
                      {tally.fails}
                    </span>
                  </>
                ) : (
                  size
                )}
              </div>
              {doubleFail.includes(i) && (
                <span style={{ position: "absolute", top: 4, right: 4, width: 5, height: 5, background: "var(--vd-red)" }} />
              )}
            </div>
          );
        })}
      </div>
      {doubleFail.length > 0 && (
        <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 5, height: 5, background: "var(--vd-red)" }} />
          <span style={{ font: "400 12px/1.4 var(--vd-voice)", color: "var(--vd-ink-dim)" }}>
            {doubleFail.length === 1
              ? `the ${ROMAN[doubleFail[0]]} quest needs two fails`
              : `quests ${doubleFail.map((i) => ROMAN[i]).join(" and ")} need two fails`}
          </span>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------- rejection track --- */

export function RejectionTrack({ used, max = 5 }: { used: number; max?: number }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="vd-label vd-label--dim">Rejections</span>
        <span style={{ font: "600 10px/1 var(--vd-ui)", letterSpacing: ".08em", color: "var(--vd-red-ink)" }}>
          {used} of {max}
        </span>
      </div>
      <div className="vd-track" style={{ marginTop: 11 }} aria-label={`${used} of ${max} rejections used`}>
        {Array.from({ length: max }, (_, i) => (
          <i key={i} className={i < used ? "is-used" : undefined} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ chronicle --- */

export type ChronicleEntry = {
  n: number;
  text: string;
  outcome?: { label: string; detail?: string; held?: boolean };
  /** Named sides of a vote. The unveil is a moment; this is the record. */
  sides?: { for: string[]; against: string[] };
  /**
   * How a quest actually came back. The unveil shows this once and closes; the
   * table then spends the next round arguing about what the count was, so the
   * ledger keeps it.
   */
  tally?: { successes: number; fails: number; size: number; failsNeeded: number };
};

export function Chronicle({ entries }: { entries: ChronicleEntry[] }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="vd-label">The chronicle</span>
        <span className="vd-rule vd-rule--brass" style={{ flex: 1 }} />
      </div>
      <div style={{ marginTop: 16 }}>
        {entries.map((e) => (
          <div className="vd-chron__entry" key={e.n}>
            <span className="vd-chron__n">{String(e.n).padStart(2, "0")}</span>
            <div style={{ flex: 1 }}>
              <p className="vd-chron__text">{e.text}</p>
              {e.sides && (
                <dl className="vd-chron__sides">
                  <dt>For</dt>
                  <dd>{e.sides.for.length ? e.sides.for.join(", ") : "no one"}</dd>
                  <dt>Against</dt>
                  <dd>{e.sides.against.length ? e.sides.against.join(", ") : "no one"}</dd>
                </dl>
              )}
              {e.tally && (
                <div className="vd-chron__tally">
                  <span className="vd-chron__tally-part">
                    <b>{e.tally.successes}</b> success{e.tally.successes === 1 ? "" : "es"}
                  </span>
                  <span
                    className={`vd-chron__tally-part ${e.tally.fails > 0 ? "is-fail" : ""}`}
                  >
                    <b>{e.tally.fails}</b> fail{e.tally.fails === 1 ? "" : "s"}
                  </span>
                  <span className="vd-chron__tally-of">
                    of {e.tally.size}
                    {e.tally.failsNeeded > 1 ? ` · needed ${e.tally.failsNeeded}` : ""}
                  </span>
                </div>
              )}
              {e.outcome && (
                <div className={`vd-chron__outcome ${e.outcome.held ? "vd-chron__outcome--held" : ""}`}>
                  <span>{e.outcome.label}</span>
                  {e.outcome.detail && (
                    <span style={{ font: "600 9px/1 var(--vd-ui)", color: "var(--vd-ink-dim)" }}>{e.outcome.detail}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- plate ---- */

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
    // Focus the plate itself, not its first focusable descendant. `children`
    // render before `action`, so "first focusable" is often the riskiest
    // option on screen — Excalibur's "Flip", King Returns' "Overturn" — not
    // the safe default. `el` (tabIndex={-1} below) is a neutral landing spot
    // a screen reader still announces via aria-label.
    el.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = items();
      if (focusable.length === 0) {
        // Nothing inside to cycle to — hold focus here rather than letting
        // Tab reach the board behind the overlay, which is not inert.
        e.preventDefault();
        el.focus();
        return;
      }
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

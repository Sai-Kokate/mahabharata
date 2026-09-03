/* ============================================================================
   The stage: one seat ring, one caption, and a transport.

   It renders a `Beat` and knows nothing else — no scenario is named here, no
   rule is written here. Everything it shows comes from the beat it was handed,
   which is what lets `scenarios.ts` stay the only place the walkthrough is
   authored.

   The ring is the real `CouncilSeal`, so what you learn on this page is what
   you will be looking at during a game.
   ========================================================================== */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Check, Pause, Play, RotateCcw, X } from "lucide-react";
import { CouncilSeal, type Seat } from "../CouncilSeal";
import { CAST, type Beat, type Scenario } from "./scenarios";
import { prefersReducedMotion, settleWhenUnwatched } from "../motion";
import emblemSrc from "../assets/mark.svg";

/** How long a beat holds before the next one, when playing. */
const BEAT_MS = 4200;

export function Stage({ scenario }: { scenario: Scenario }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const beat = scenario.beats[i];
  const last = i === scenario.beats.length - 1;

  // A new scenario always starts from the top, playing.
  useEffect(() => {
    setI(0);
    setPlaying(true);
  }, [scenario.id]);

  useEffect(() => {
    if (!playing || last) return;
    const t = setTimeout(() => setI((n) => n + 1), BEAT_MS);
    return () => clearTimeout(t);
  }, [playing, i, last]);

  const go = useCallback((n: number) => {
    setPlaying(false);
    setI(n);
  }, []);

  const seats: Seat[] = CAST.map((name, seat) => ({
    playerId: `s${seat}`,
    name,
    sigil: seat,
    state: beat.states?.[seat] ?? "idle",
    note: beat.notes?.[seat],
  }));

  return (
    <div className="lx-stage">
      <div className="lx-stage__ring">
        <CouncilSeal seats={seats} emblemSrc={emblemSrc} />
        {beat.cards && <Cards key={`c${i}`} cards={beat.cards} />}
      </div>

      <div className="lx-stage__side">
        <Caption key={i} beat={beat} />

        {beat.tally && <Tally key={`t${i}`} yes={beat.tally.yes} no={beat.tally.no} />}
        {beat.track && <Track track={beat.track} />}
        {beat.rejects !== undefined && <Rejects used={beat.rejects} />}
        {beat.stamp && (
          <div key={`s${i}`} className={`vd-stamp lx-stamp ${beat.danger ? "vd-stamp--fallen" : ""}`}>
            {beat.stamp}
          </div>
        )}

        <Transport
          i={i}
          total={scenario.beats.length}
          playing={playing}
          last={last}
          onGo={go}
          onToggle={() => (last ? (setI(0), setPlaying(true)) : setPlaying((p) => !p))}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ parts -- */

function Caption({ beat }: { beat: Beat }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      /* The caption is the whole lesson — the one sentence a beat exists to
         say. It must never be left invisible because the tab was hidden. */
      const tl = gsap.timeline();
      tl.from(".lx-say", { y: 10, opacity: 0, duration: 0.4, ease: "power3.out" })
        .from(".lx-note", { opacity: 0, duration: 0.4 }, 0.15);
      return settleWhenUnwatched(tl);
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <div ref={root}>
      <p className="lx-say">{beat.say}</p>
      {beat.note && <p className="lx-note">{beat.note}</p>}
    </div>
  );
}

/** Face-down cards that turn over when the beat says what they were. */
function Cards({ cards }: { cards: Array<"back" | "success" | "fail"> }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const faces = gsap.utils.toArray<HTMLElement>(".lx-card.is-up .lx-card__in");
    if (prefersReducedMotion()) {
      // Skip the animated entrance/flip, but an "is-up" card's rotateY is set
      // entirely by this call (learn.css's own rotateY(180deg) is on the
      // FRONT FACE, not this wrapper) — so it still needs setting, instantly,
      // or the card stays stuck showing its back.
      if (faces.length) gsap.set(faces, { rotateY: 180 });
      return;
    }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.from(".lx-card", { y: 18, opacity: 0, stagger: 0.07, duration: 0.35 }, 0);
      if (faces.length) {
        tl.fromTo(
          faces,
          { rotateY: 0 },
          { rotateY: 180, stagger: 0.22, duration: 0.5, ease: "power2.inOut" },
          0.35,
        );
      }
      return settleWhenUnwatched(tl);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div className="lx-cards" ref={root}>
      {cards.map((c, n) => (
        <div key={n} className={`lx-card ${c === "back" ? "" : "is-up"}`}>
          <div className="lx-card__in">
            <span className="lx-card__face lx-card__face--back" aria-hidden />
            <span className={`lx-card__face lx-card__face--front is-${c}`}>
              {c === "fail" ? "Fail" : "Success"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Tally({ yes, no }: { yes: number; no: number }) {
  return (
    <div className="lx-tally">
      <div className="lx-tally__side">
        <span className="vd-label"><Check size={13} strokeWidth={2.5} /> Voted yes</span>
        <strong>{yes}</strong>
      </div>
      <div className="lx-tally__side lx-tally__side--no">
        <span className="vd-label"><X size={13} strokeWidth={2.5} /> Voted no</span>
        <strong>{no}</strong>
      </div>
    </div>
  );
}

function Track({ track }: { track: Array<"success" | "fail" | null> }) {
  return (
    <div className="lx-track" aria-label="The five missions">
      {track.map((r, n) => (
        <span key={n} className={`lx-track__q ${r ? `is-${r}` : ""}`}>
          {n + 1}
        </span>
      ))}
    </div>
  );
}

function Rejects({ used }: { used: number }) {
  return (
    <div className="lx-rejects">
      <span className="vd-label">Teams voted down</span>
      <span className="lx-rejects__pips" aria-label={`${used} of 5`}>
        {Array.from({ length: 5 }, (_, n) => (
          <i key={n} className={n < used ? "is-on" : undefined} />
        ))}
      </span>
    </div>
  );
}

function Transport({
  i, total, playing, last, onGo, onToggle,
}: {
  i: number; total: number; playing: boolean; last: boolean;
  onGo: (n: number) => void;
  onToggle: () => void;
}) {
  return (
    <div className="lx-transport">
      <button
        className="lx-play"
        onClick={onToggle}
        aria-label={last ? "Play again" : playing ? "Pause" : "Play"}
      >
        {last ? <RotateCcw size={14} /> : playing ? <Pause size={14} /> : <Play size={14} />}
        <span>{last ? "Again" : playing ? "Pause" : "Play"}</span>
      </button>

      {/* Every beat is reachable directly — nobody should have to wait out an
          animation to re-read the step they missed. */}
      <div className="lx-beats" role="tablist" aria-label="Steps">
        {Array.from({ length: total }, (_, n) => (
          <button
            key={n}
            role="tab"
            aria-selected={n === i}
            aria-label={`Step ${n + 1}`}
            className={`lx-beat ${n === i ? "is-on" : ""} ${n < i ? "is-done" : ""}`}
            onClick={() => onGo(n)}
          />
        ))}
      </div>

      <span className="vd-label">Step {i + 1} of {total}</span>
    </div>
  );
}

/* ============================================================================
   The front door. The doors are open: two ways in, and no holding state.

   The animation earns its place by saying what the product is: the mark turns
   once and its two counter-dots trade sides, which is the whole premise —
   friends become foes. Everything else rises and settles. No glow, no bounce,
   nothing that contradicts the flat engraved board it sits on.
   ========================================================================== */

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight, Sparkles } from "lucide-react";
import markSrc from "./assets/mark.svg";

const WORDMARK = "DECEVIA";

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Anyone who has asked for less motion gets the finished frame, not a
    // slower version of the show.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".lp-mark", { scale: 0.7, opacity: 0, duration: 0.7 })
        // Half a turn: the light side becomes the dark one.
        .from(".lp-mark", { rotate: -180, duration: 1.1, ease: "power2.inOut" }, "<")
        .from(
          ".lp-letter",
          { y: 22, opacity: 0, stagger: 0.055, duration: 0.5 },
          "-=0.45",
        )
        // The promise arrives by spreading apart, not by fading.
        .from(
          ".lp-promise",
          { letterSpacing: "0em", opacity: 0, duration: 0.7 },
          "-=0.15",
        )
        .from(".lp-line", { scaleX: 0, duration: 0.6 }, "-=0.4")
        .from(".lp-lede", { y: 12, opacity: 0, duration: 0.5 }, "-=0.3")
        .from(
          ".lp-act",
          { y: 14, opacity: 0, stagger: 0.09, duration: 0.5 },
          "-=0.25",
        )
        .from(".lp-foot", { opacity: 0, duration: 0.5 }, "-=0.2");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div className="vd-board lp" ref={root}>
      <div className="vd-content lp__inner">
        <img className="lp-mark" src={markSrc} alt="" width={64} height={64} />

        <h1 className="lp-wordmark" aria-label={WORDMARK}>
          {WORDMARK.split("").map((ch, i) => (
            <span className="lp-letter" key={i} aria-hidden>
              {ch}
            </span>
          ))}
        </h1>

        <p className="lp-promise">Where friends become foes</p>

        <hr className="lp-line" />

        <p className="lp-lede">
          A council of five to eighteen. Some of you are sworn to the realm, and
          some of you are lying about it. Five worlds to find out in.
        </p>

        {/* Two doors, weighted. Joining is what most arrivals came to do and
            needs no account; signing up is what unlocks the paid worlds, so it
            stands beside rather than in front. */}
        <div className="lp-acts">
          <a className="lp-act lp-act--primary" href="/play">
            Join the council <ArrowRight size={16} />
          </a>
          <a className="lp-act" href="/signin">
            Sign up <Sparkles size={15} />
          </a>
        </div>

        <div className="lp-foot">
          <a className="vd-textbtn" href="/rules">
            Read the laws
          </a>
        </div>
      </div>
    </div>
  );
}

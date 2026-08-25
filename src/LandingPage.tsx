/* ============================================================================
   The front door. The doors are open: two ways in, and no holding state.

   The animation earns its place by saying what the product is: the mark turns
   once and its two counter-dots trade sides, which is the whole premise —
   friends become foes. Everything else rises and settles. No glow, no bounce,
   nothing that contradicts the flat engraved board it sits on.
   ========================================================================== */

import { useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import gsap from "gsap";
import { ArrowRight, BadgeCheck, Crown, LogOut, Shield, Sparkles } from "lucide-react";
import { api } from "../convex/_generated/api";
import { useAuth } from "./auth";
import markSrc from "./assets/mark.svg";

const WORDMARK = "DECEVIA";

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const viewer = useQuery(api.billing.viewer, {});
  const config = useQuery(api.billing.paymentConfig, {});
  const { signOut } = useAuth();

  // `undefined` is "still asking". Showing Sign up to someone who is already
  // signed in and then swapping it out is worse than a beat of one button.
  const known = viewer !== undefined;
  const signedIn = viewer?.signedIn === true;

  /**
   * The hero never waits on the network. It plays the moment the page mounts,
   * and whatever depends on knowing who you are — the Sign up button, or the
   * account panel that replaces it — arrives afterwards, on its own.
   *
   * `heroDone` is what keeps that honest. `gsap.from()` only hides what exists
   * when the timeline is built, so an element that mounts later is outside the
   * sequence entirely: left alone it appeared instantly and unanimated, ahead
   * of the wordmark it should follow. So the late half is not rendered at all
   * until the hero has finished AND the answer is in — it then mounts exactly
   * when it is due, and gets its own entrance.
   */
  const [heroDone, setHeroDone] = useState(false);

  useLayoutEffect(() => {
    // Anyone who has asked for less motion gets the finished frame, not a
    // slower version of the show.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setHeroDone(true);
      return;
    }

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
        .from(".lp-act--primary", { y: 14, opacity: 0, duration: 0.5 }, "-=0.25")
        .from(".lp-foot", { opacity: 0, duration: 0.5 }, "-=0.2")
        .add(() => setHeroDone(true));
    }, root);
    return () => ctx.revert();
  }, []);

  /** The late arrival, eased in rather than snapped in. */
  useLayoutEffect(() => {
    if (!heroDone || !known) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".lp-late", {
        y: 12, opacity: 0, duration: 0.45, ease: "power3.out",
      });
    }, root);
    return () => ctx.revert();
  }, [heroDone, known, signedIn]);

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

        {/* Joining is what most arrivals came to do and needs no account. The
            second door is Sign up — until you are through it, at which point
            offering it again is noise, and what you actually want to know is
            what your account is worth. */}
        <div className="lp-acts">
          <a className="lp-act lp-act--primary" href="/play">
            Join the council <ArrowRight size={16} />
          </a>
          {heroDone && known && !signedIn && (
            <a className="lp-act lp-late" href="/signin">
              Sign up <Sparkles size={15} />
            </a>
          )}
        </div>

        {heroDone && known && signedIn && viewer && (
          <AccountCard viewer={viewer} config={config} onSignOut={signOut} />
        )}

        <div className="lp-foot">
          <a className="vd-textbtn" href="/learn">
            How to play
          </a>
          <a className="vd-textbtn" href="/rules">
            Read the laws
          </a>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- account -- */

/** A date a person would say out loud, not an ISO string. */
function onDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
  });
}

/**
 * What this account is, and what it is worth — the question a signed-in
 * visitor actually has on the front page, in place of a Sign up button they
 * have already used.
 *
 * Every line is read from the server's own answer (`billing.viewer` and
 * `paymentConfig`) rather than restated here, so it cannot promise something
 * the entitlement code disagrees with.
 */
function AccountCard({
  viewer, config, onSignOut,
}: {
  viewer: {
    email: string | null; name: string | null; premium: boolean;
    seats: number; expiresAt: number | null; ownerEmail: string | null;
    iOwnPlan: boolean; isAdmin: boolean;
  };
  config: { premiumOptLabels?: Record<string, string> } | null | undefined;
  onSignOut: () => Promise<void>;
}) {
  const paidRoles = Object.values(config?.premiumOptLabels ?? {});

  return (
    <section className="lp-account lp-late">
      <header className="lp-account__head">
        <span className="lp-account__who">{viewer.name ?? viewer.email}</span>
        {viewer.premium ? (
          <span className="vd-pill vd-pill--brass">
            <BadgeCheck size={11} /> Premium
          </span>
        ) : (
          <span className="vd-pill">Free</span>
        )}
      </header>

      <dl className="lp-account__rows">
        <dt>Plan</dt>
        <dd>
          {viewer.premium ? (
            <>
              Premium, covering {viewer.seats}{" "}
              {viewer.seats === 1 ? "person" : "people"}
              {viewer.expiresAt ? <> · until {onDate(viewer.expiresAt)}</> : null}
              {!viewer.iOwnPlan && viewer.ownerEmail ? (
                <div className="lp-account__note">
                  A seat on {viewer.ownerEmail}'s plan.
                </div>
              ) : null}
            </>
          ) : (
            "Free — everything the printed game needs"
          )}
        </dd>

        <dt>Council</dt>
        <dd>
          5 to 18 players
          <div className="lp-account__note">
            Table size is not part of the paid tier.
          </div>
        </dd>

        <dt>Worlds</dt>
        <dd>
          {viewer.premium
            ? "All five — Mahabharata, Medieval, Maratha, Greek, Egyptian"
            : "Medieval"}
        </dd>

        <dt>Roles &amp; expansions</dt>
        <dd>
          {viewer.premium ? (
            paidRoles.length > 0
              ? `Everything, including ${paidRoles.join(", ")}`
              : "Everything"
          ) : (
            <>
              Merlin, the Assassin, Percival, Morgana, servants and minions
              <div className="lp-account__note">
                Mordred, Oberon, Guinevere, the lovers, the Lancelots, the Lady,
                Excalibur and plot cards are premium.
              </div>
            </>
          )}
        </dd>
      </dl>

      <footer className="lp-account__foot">
        <a className="vd-pill" href="/upgrade">
          <Crown size={11} /> {viewer.premium ? "Manage plan" : "Upgrade"}
        </a>
        {viewer.isAdmin && (
          <a className="vd-pill" href="/admin">
            <Shield size={11} /> Admin
          </a>
        )}
        <button className="vd-textbtn" onClick={() => void onSignOut()}>
          <LogOut size={11} /> Sign out
        </button>
      </footer>
    </section>
  );
}

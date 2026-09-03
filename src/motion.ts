/* ============================================================================
   One rule for every entrance animation in the app.

   Every animated surface here is built with `gsap.from(...)`, which works by
   hiding the element on frame one and revealing it as the timeline plays. That
   is fine while someone is watching, and a trap when nobody is:

   - `requestAnimationFrame` does not fire in a background tab, so a timeline
     that starts there freezes at frame one and its content stays invisible.
     A link opened in a background tab, or a phone put down for a second, was
     enough to leave the front page completely blank, or a quest result
     unreadable behind a Continue button.
   - `prefers-reduced-motion` was honoured in some places and not others, so
     the same request produced a static landing page and a full card-flip
     sequence on the quest reveal.

   `settleWhenUnwatched` answers both the same way: show the finished frame.
   Scrubbing a timeline forward still fires its own callbacks, so anything the
   animation was supposed to trigger on the way (a colour landing, a "done"
   flag) still happens.

   Call it with the timeline, from inside `gsap.context(...)`, and return its
   result so the context tears the listener down with everything else.
   ========================================================================== */

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** `gsap` here is the global namespace gsap's own types declare — no import
 *  is needed for the type, and importing one only pulls the library into a
 *  module that never calls it. */
export function settleWhenUnwatched(tl: gsap.core.Timeline): () => void {
  if (prefersReducedMotion()) {
    tl.progress(1);
    return () => {};
  }
  if (document.visibilityState === "hidden") tl.progress(1);
  const onHide = () => {
    if (document.visibilityState === "hidden") tl.progress(1);
  };
  document.addEventListener("visibilitychange", onHide);
  return () => document.removeEventListener("visibilitychange", onHide);
}

/* ============================================================================
   Routing, with real paths.

   The app used to live behind `#/play`. A hash is invisible to the server, so
   it needed no configuration — but it also reads as a fragment rather than a
   page, cannot be linked to cleanly, and shares the URL bar with the invite
   code. This is the smallest thing that replaces it: pushState, a popstate
   listener, and one document-level click handler that turns every in-app
   `<a href="/rules">` into a navigation instead of a page load.

   Nothing here is a router in the react-router sense — there are six routes and
   no nesting. `vercel.json` rewrites every path to index.html so a refresh on
   /rules still serves the app.
   ========================================================================== */

import { useEffect, useState } from "react";

/** Fired on every pushState so `useLocation` can hear our own navigations. */
const NAV_EVENT = "decevia:navigate";

function snapshot() {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

function href() {
  return window.location.pathname + window.location.search + window.location.hash;
}

/** Go somewhere. Same-document, so React re-renders instead of the page. */
export function navigate(to: string, { replace = false } = {}) {
  const url = new URL(to, window.location.origin);
  const next = url.pathname + url.search + url.hash;
  if (next === href()) return;
  window.history[replace ? "replaceState" : "pushState"]({}, "", next);
  window.dispatchEvent(new Event(NAV_EVENT));
  // A new page should start at the top; a replaced URL is the same page.
  if (!replace) window.scrollTo(0, 0);
}

/**
 * Links to `#/play` and friends were handed round before the switch to paths,
 * and a hash is invisible to the rewrite — the server would serve the app and
 * the app would read `/` and show the holding page. Translate them once, on
 * boot, before anything renders.
 */
export function adoptLegacyHashRoute() {
  const hash = window.location.hash;
  if (!hash.startsWith("#/")) return;
  const rest = hash.slice(1); // "/play", "/rules?x=1"
  const url = new URL(rest, window.location.origin);
  // Any query already on the real URL (an invite ?code=) outranks the hash's.
  const search = new URLSearchParams(window.location.search);
  url.searchParams.forEach((v, k) => {
    if (!search.has(k)) search.set(k, v);
  });
  const qs = search.toString();
  window.history.replaceState({}, "", url.pathname + (qs ? `?${qs}` : ""));
}

/** The current path and query, re-read on back/forward and on `navigate`. */
export function useLocation() {
  const [loc, setLoc] = useState(snapshot);
  useEffect(() => {
    const onChange = () => setLoc(snapshot());
    window.addEventListener("popstate", onChange);
    window.addEventListener(NAV_EVENT, onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener(NAV_EVENT, onChange);
    };
  }, []);
  return loc;
}

/**
 * One listener for every in-app link, so no screen has to import anything to
 * navigate: a plain `<a href="/rules">` keeps working and stops reloading.
 * Anything that is not a plain left-click on a same-origin path — a new tab, a
 * modified click, an external href, a download — is left to the browser.
 */
export function useLinkInterception() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as Element | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const to = anchor.getAttribute("href");
      // Only our own absolute paths. Leaves //host, https:, mailto:, #frag.
      if (!to || !to.startsWith("/") || to.startsWith("//")) return;
      const how = anchor.getAttribute("target");
      if ((how && how !== "_self") || anchor.hasAttribute("download")) return;
      e.preventDefault();
      navigate(to);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}

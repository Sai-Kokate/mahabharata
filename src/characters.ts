/* ============================================================================
   The cast, in plain words.

   `convex/themes.ts` owns what a character IS to the engine — its id, its
   themed name, its side, its portrait and a line of lore. What it does not own
   is an explanation a first-time player can act on: the lore is deliberately
   flowery ("The divine charioteer. You perceive the Kauravas…"), and there is
   one of it per world, so plain-English copy written there would be sixty-five
   strings to keep in sync with the rules.

   It lives here instead, keyed by ENGINE ROLE ID and written once — because the
   mechanics are identical in every world. `/learn` already says as much:
   "Krishna is shown exactly what Merlin is shown." What changes between worlds
   is only which NAMES appear in the sentence, so every line is a function of a
   nameset and gets the right ones substituted in. That is the same `rn()`
   trick the lobby already uses for its option labels.

   Add a role to the engine and it renders with its lore and no brief; add it
   here and every character surface in the app picks the brief up at once.
   ========================================================================== */

import { useEffect } from "react";
import { THEME_ART } from "../convex/themes";

/** The names a brief is allowed to mention, resolved for one world. */
export type Nameset = {
  /** A role's name in this world, e.g. rn("merlin") → "Krishna". */
  rn: (roleId: string) => string;
  /** What this world calls the good team, e.g. "Pandavas". */
  good: string;
  /** What this world calls the evil team, e.g. "Kauravas". */
  evil: string;
};

/**
 * How a character gets into a game. Shown as the one line of small print on
 * the front of the card, because "can I even play this?" is the first thing
 * someone reading the cast wants to know.
 */
export type Availability = "always" | "fills" | "optional" | "paired";

type Brief = {
  /**
   * The character's whole point, on the front of every card at every size.
   * Keep it under about 24 characters: at two lines it starts pushing the
   * portrait out of its own card.
   */
  tagline: (n: Nameset) => string;
  /** What they are. One sentence, no jargon. */
  what: (n: Nameset) => string;
  /** What you are trying to do while playing them. */
  job: (n: Nameset) => string;
  /** What you get told at the start of the game. */
  shown: (n: Nameset) => string;
  /** The one thing that catches people out. Omitted where there isn't one. */
  watch?: (n: Nameset) => string;
  availability: Availability;
  /** Only for `paired`: who they always arrive with. */
  pairedWith?: (n: Nameset) => string;
};

/* ----------------------------------------------------------------- the good -- */

/* Every line below is written to FIT. The back of a card is about 290x170 of
   readable space on a phone, which is roughly four labels and eight lines of
   text — so `what` is a phrase, `job` is one instruction, and anything that
   needed a third sentence belongs on /rules instead. Copy that overflows is
   copy nobody reads: it ends up behind a scrollbar inside a card. */

const GOOD: Record<string, Brief> = {
  merlin: {
    tagline: () => "Sees the traitors",
    what: () => "The one good player who knows who the traitors are.",
    job: () => "Steer teams away from them — without giving away that you know.",
    shown: (n) => `Every traitor except ${n.rn("mordred")}.`,
    watch: () => "If the traitors name you at the end, they win.",
    availability: "always",
  },
  percival: {
    tagline: () => "Given one clue",
    what: () => "A good player who has been handed a single clue.",
    job: (n) => `Work out which of your two names is really ${n.rn("merlin")}, and protect them.`,
    shown: (n) => `${n.rn("merlin")} and ${n.rn("morgana")} — but not which is which.`,
    watch: () => "Guard the wrong one and you protect a traitor all game.",
    availability: "optional",
  },
  servant: {
    tagline: () => "No special sight",
    what: (n) => `An ordinary member of the ${n.good}.`,
    job: () => "Work out who is lying, and get three missions to succeed.",
    shown: () => "Nothing. You have only the conversation to go on.",
    availability: "fills",
  },
  guinevere: {
    tagline: () => "Knows both Lancelots",
    what: () => "A good player who can see the two who are able to switch.",
    job: () => "Work out which of the two Lancelots is on your side.",
    shown: () => "Both Lancelots — but not which side each is on.",
    watch: () => "Their sides can swap, so what you know can go stale.",
    availability: "optional",
  },
  tristan: {
    tagline: (n) => `Trusts ${n.rn("isolde")}`,
    what: () => "A good player with one person they can trust completely.",
    job: (n) => `Work with ${n.rn("isolde")} — quietly. Always agreeing looks like a pair.`,
    shown: (n) => `${n.rn("isolde")}, and nobody else.`,
    watch: () => "If the traitors name you both at the end, they win.",
    availability: "paired",
    pairedWith: (n) => n.rn("isolde"),
  },
  isolde: {
    tagline: (n) => `Trusts ${n.rn("tristan")}`,
    what: () => "A good player with one person they can trust completely.",
    job: (n) => `Work with ${n.rn("tristan")} — quietly. Always agreeing looks like a pair.`,
    shown: (n) => `${n.rn("tristan")}, and nobody else.`,
    watch: () => "If the traitors name you both at the end, they win.",
    availability: "paired",
    pairedWith: (n) => n.rn("tristan"),
  },
  lancelot_good: {
    tagline: () => "Can switch sides",
    what: () => "A good player with no choice of mission card.",
    job: () => "Win missions the normal way. You could not sabotage one.",
    shown: () => "Nobody — not even the other Lancelot.",
    watch: () => "From round 3 a card can flip you to the traitors' side.",
    availability: "paired",
    pairedWith: (n) => n.rn("lancelot_evil"),
  },
};

/* ----------------------------------------------------------------- the evil -- */

const EVIL: Record<string, Brief> = {
  assassin: {
    tagline: () => "Takes the final shot",
    what: () => "The traitor who gets the last word in the game.",
    job: (n) => `Fail missions, and work out who ${n.rn("merlin")} is while you do.`,
    shown: (n) => `Your fellow traitors, except ${n.rn("oberon")}.`,
    watch: (n) => `Win three missions against you and you name ${n.rn("merlin")}. Right, and evil wins anyway.`,
    availability: "always",
  },
  morgana: {
    tagline: (n) => `Poses as ${n.rn("merlin")}`,
    what: (n) => `A traitor posing as the ${n.good}' guide.`,
    job: (n) => `Convince ${n.rn("percival")} that you are ${n.rn("merlin")}.`,
    shown: (n) => `Your fellow traitors, except ${n.rn("oberon")}.`,
    availability: "optional",
  },
  mordred: {
    tagline: (n) => `Invisible to ${n.rn("merlin")}`,
    what: (n) => `A traitor ${n.rn("merlin")} cannot see.`,
    job: () => "Play as the most trustworthy person at the table.",
    shown: (n) => `Your fellow traitors, except ${n.rn("oberon")}.`,
    availability: "optional",
  },
  oberon: {
    tagline: () => "Works alone",
    what: () => "A traitor who works entirely alone.",
    job: () => "Fail missions with no help from your own side.",
    shown: () => "Nobody. The other traitors are not shown you either.",
    watch: (n) => `${n.rn("merlin")} can still see you.`,
    availability: "optional",
  },
  lancelot_evil: {
    tagline: () => "Must always fail",
    what: () => "A traitor with no choice of mission card.",
    job: () => "Get picked for missions. Every one you go on, you fail.",
    shown: () => "Nobody — but the other traitors are shown you.",
    watch: () => "From round 3 a card can flip you to the good side.",
    availability: "paired",
    pairedWith: (n) => n.rn("lancelot_good"),
  },
  minion: {
    tagline: () => "Knows the traitors",
    what: (n) => `An ordinary member of the ${n.evil}.`,
    job: () => "Fail missions and keep your own name clean.",
    shown: (n) => `Your fellow traitors, except ${n.rn("oberon")}.`,
    availability: "fills",
  },
};

const BRIEFS: Record<string, Brief> = { ...GOOD, ...EVIL };

/**
 * Reading order for the whole cast: the good side first, then the evil side,
 * each roughly in the order the night runs. Shared by every screen that lists
 * characters so they cannot drift apart.
 */
export const CAST_ORDER = [
  "merlin", "percival", "guinevere", "tristan", "isolde", "lancelot_good", "servant",
  "assassin", "morgana", "mordred", "oberon", "lancelot_evil", "minion",
] as const;

/* ------------------------------------------------------------- resolution -- */

/**
 * The shape a world has to have for a card to be drawn from it. Structural on
 * purpose: it is satisfied both by a `ThemeConfig` imported straight from
 * `convex/themes.ts` (the rules and how-to-play pages) and by the `room.theme`
 * that `getRoom` ships to the table — without either of them importing the
 * other's types.
 */
export type CharacterSource = {
  /** Theme id — what selects this world's artwork. */
  id: string;
  goodTeamName: string;
  evilTeamName: string;
  roles: ReadonlyArray<{
    id: string;
    name: string;
    team: "good" | "evil";
    desc: string;
  }>;
};

/** Everything a `CharacterCard` draws. One object, whatever the screen. */
export type Character = {
  id: string;
  name: string;
  team: "good" | "evil";
  /** Absent when this world has no art for the character — not an error. */
  image?: string;
  tagline: string;
  what: string;
  job: string;
  shown: string;
  watch?: string;
  /** The world's own flavour line. Read last, never instead of the above. */
  lore: string;
  /** One line of small print for the front of the card. */
  availabilityNote: string;
  /** Drawn in place of a missing portrait. */
  monogram: string;
};

export function namesetFor(source: CharacterSource): Nameset {
  return {
    rn: (roleId) =>
      source.roles.find((r) => r.id === roleId)?.name ?? FALLBACK_NAMES[roleId] ?? roleId,
    good: source.goodTeamName,
    evil: source.evilTeamName,
  };
}

/**
 * Last-resort names, for the one case that can actually happen: a brief
 * mentions a character the current world happens not to define. Better a real
 * medieval name in the sentence than a raw engine id.
 */
const FALLBACK_NAMES: Record<string, string> = {
  merlin: "Merlin", percival: "Percival", servant: "Loyal Knight",
  guinevere: "Guinevere", tristan: "Tristan", isolde: "Isolde",
  lancelot_good: "Lancelot the Loyal", assassin: "the Assassin",
  morgana: "Morgana", mordred: "Mordred", oberon: "Oberon",
  lancelot_evil: "Lancelot the Fallen", minion: "Minion of Mordred",
};

const AVAILABILITY_NOTE: Record<Availability, string> = {
  always: "Always in the game",
  fills: "Fills spare places",
  optional: "Optional role",
  paired: "Optional · a pair",
};

/**
 * Build one character for one world. Returns null for a role the world does not
 * have, so a caller can map over ids without guarding each one.
 */
export function characterFor(
  source: CharacterSource,
  roleId: string,
): Character | null {
  const role = source.roles.find((r) => r.id === roleId);
  if (!role) return null;

  const n = namesetFor(source);
  const brief = BRIEFS[roleId];

  return {
    id: role.id,
    name: role.name,
    team: role.team,
    image: THEME_ART[source.id]?.[roleId],
    lore: role.desc,
    monogram: role.name.trim().charAt(0).toUpperCase() || "?",
    // A role with no brief still draws — it just has nothing plain to say
    // beyond its side, which is better than an empty screen.
    tagline: brief?.tagline(n) ?? (role.team === "good" ? "On the good side" : "On the evil side"),
    what: brief?.what(n) ?? "",
    job: brief?.job(n) ?? "",
    shown: brief?.shown(n) ?? "",
    watch: brief?.watch?.(n),
    availabilityNote: AVAILABILITY_NOTE[brief?.availability ?? "optional"],
  };
}

/** The whole cast of a world, in reading order. */
export function castOf(source: CharacterSource): Character[] {
  return CAST_ORDER.map((id) => characterFor(source, id)).filter(
    (c): c is Character => c !== null,
  );
}

/* ------------------------------------------------------------- preloading -- */

/**
 * Which characters can be in a game with this setup.
 *
 * Used to warm the portraits before the night reveal, so holding your card
 * shows a painting rather than its stand-in. It returns the whole in-play SET
 * on purpose, never just your own role: the set is public — the lobby lists it
 * — whereas a request for one portrait would name your role to anyone watching
 * the network tab.
 */
export function rolesInPlay(opts: Record<string, boolean | undefined>): string[] {
  const ids = ["merlin", "assassin", "servant", "minion"];
  if (opts.percival) ids.push("percival");
  if (opts.guinevere) ids.push("guinevere");
  if (opts.morgana) ids.push("morgana");
  if (opts.mordred) ids.push("mordred");
  if (opts.oberon) ids.push("oberon");
  if (opts.lovers) ids.push("tristan", "isolde");
  if (opts.lancelot) ids.push("lancelot_good", "lancelot_evil");
  return ids;
}

/**
 * Warm a set of portraits so a card that appears later appears complete.
 * Fire-and-forget: nothing waits on it and a failure is invisible, because the
 * card already draws its own stand-in when a portrait is missing.
 */
export function usePreloadArt(urls: Array<string | undefined>) {
  // Joined into one string so that a fresh array of the SAME urls does not
  // re-fire the effect on every render. NUL cannot occur in a url, so it is
  // safe to split back apart inside.
  const key = urls.filter(Boolean).join("\u0000");
  useEffect(() => {
    if (!key) return;
    for (const url of key.split("\u0000")) {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }
  }, [key]);
}

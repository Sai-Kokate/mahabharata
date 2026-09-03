/* ============================================================================
   The scripts the walkthrough plays.

   Every scenario is DATA — a cast, and a list of beats. A beat says what each
   seat looks like, what to show beside the ring, and what to say about it. The
   stage in `LearnPage.tsx` knows how to render a beat and nothing else, so a
   new scenario is an entry in this file and no new code.

   Nothing here touches the game. It is a story about the rules, not a run of
   them — no room, no query, no mutation. That is deliberate: this page has to
   keep working while the engine is being changed underneath it.
   ========================================================================== */

import type { SeatState } from "../CouncilSeal";

/** Seven short names, so the ring reads at a glance on a phone. */
export const CAST = ["Ada", "Bran", "Cyn", "Dev", "Esa", "Fen", "Gil"] as const;

export type Beat = {
  /** The sentence under the ring. The whole point of the beat. */
  say: string;
  /** Optional second line, for a rule that needs saying once. */
  note?: string;
  /** Seat index → how that seat should read. Anything unlisted is idle. */
  states?: Partial<Record<number, SeatState>>;
  /** Seat index → the word under the name. */
  notes?: Partial<Record<number, string>>;
  /** Quest cards, face down until turned. */
  cards?: Array<"back" | "success" | "fail">;
  /** The vote count, once it is public. */
  tally?: { yes: number; no: number };
  /** A struck outcome line. `danger` turns it red. */
  stamp?: string;
  danger?: boolean;
  /** Fills the quest track: one entry per finished quest. */
  track?: Array<"success" | "fail" | null>;
  /** Lights the rejection track. */
  rejects?: number;
};

export type Scenario = {
  id: string;
  name: string;
  /** One line, shown on the chooser. */
  blurb: string;
  /** Which part of the game this belongs to, for grouping the chooser. */
  group: "basics" | "expansions" | "endings";
  beats: Beat[];
};

const LEADER: Partial<Record<number, SeatState>> = { 0: "leader" };

export const SCENARIOS: Scenario[] = [
  /* ------------------------------------------------------------------ */
  {
    id: "round",
    name: "A round, start to finish",
    blurb: "The loop the whole game is made of.",
    group: "basics",
    beats: [
      {
        say: "Seven people play. Five are on the good team; two are evil, and they know who each other are.",
        note: "Only the evil pair know anything for certain. Everybody else is guessing from here on.",
        states: { 1: "spent", 4: "spent" },
        notes: { 1: "evil", 4: "evil" },
      },
      {
        say: "Ada is this round's leader, so Ada picks the team.",
        states: LEADER,
        notes: { 0: "leader" },
      },
      {
        say: "This mission needs three people. Ada picks herself, Cyn and Esa.",
        states: { 0: "named", 2: "named", 4: "named" },
        notes: { 0: "on team", 2: "on team", 4: "on team" },
      },
      {
        say: "Now everybody votes yes or no on that team — not just the three on it.",
        note: "Once counted, everyone can see who voted which way. A tie counts as no.",
        states: { 0: "voted", 1: "voted", 2: "voted", 3: "voted", 4: "voted", 5: "voted", 6: "voted" },
      },
      {
        say: "Four yes, three no. The team goes on the mission.",
        tally: { yes: 4, no: 3 },
        states: { 0: "named", 2: "named", 4: "named" },
        stamp: "Mission goes ahead",
      },
      {
        say: "Only those three play a card, face down.",
        note: "Good players can only play Succeed. Evil players can play either one.",
        states: { 0: "named", 2: "named", 4: "named" },
        cards: ["back", "back", "back"],
      },
      {
        say: "The cards are shuffled, then turned over. One Fail is enough to sink this mission.",
        cards: ["success", "fail", "success"],
        states: { 0: "named", 2: "named", 4: "named" },
        stamp: "Mission failed · 1 Fail",
        danger: true,
        track: ["fail", null, null, null, null],
      },
      {
        say: "Nobody finds out who played the Fail. Arguing about it is the whole game.",
        note: "Esa was the evil one on the team — but all anyone else knows is that it was one of the three.",
        track: ["fail", null, null, null, null],
      },
      {
        say: "Bran becomes the next leader and picks a team for mission 2.",
        states: { 1: "leader" },
        notes: { 1: "leader" },
        track: ["fail", null, null, null, null],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "rejections",
    name: "Five teams voted down",
    blurb: "Saying no to everything is its own way to lose.",
    group: "basics",
    beats: [
      {
        say: "A team is picked, and the table votes it down.",
        states: { 0: "named", 2: "named", 4: "named" },
        tally: { yes: 3, no: 4 },
        stamp: "Team voted down",
        danger: true,
        rejects: 1,
      },
      {
        say: "The next player becomes leader, picks a team, and is voted down too.",
        states: { 1: "leader" },
        notes: { 1: "leader" },
        rejects: 2,
      },
      {
        say: "And again. Three of the five markers are full.",
        rejects: 3,
      },
      {
        say: "Four in a row. One more and the game ends with nobody having gone anywhere.",
        note: "This is the evil team's other route to winning: never let a safe team through.",
        rejects: 4,
      },
      {
        say: "Five in a row. The evil team wins outright.",
        rejects: 5,
        stamp: "Evil wins",
        danger: true,
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "lady",
    name: "The Lady of the Lake",
    blurb: "One honest answer that you are free to lie about.",
    group: "expansions",
    beats: [
      {
        say: "After mission 2, whoever holds the Lady picks one person to inspect.",
        note: "Needs seven or more players. It starts with the person to the first leader's right.",
        states: { 6: "leader" },
        notes: { 6: "has the Lady" },
        track: ["success", "fail", null, null, null],
      },
      {
        say: "Gil picks Dev and is told the truth: Dev is good.",
        note: "It is the side Dev is on right now, which matters once a Lancelot can swap sides.",
        states: { 6: "leader", 3: "named" },
        notes: { 6: "inspects", 3: "good" },
        track: ["success", "fail", null, null, null],
      },
      {
        say: "Only Gil is told. Gil can say whatever they like about it, including nothing.",
        note: "An evil player holding the Lady will cheerfully call a good player evil.",
        states: { 6: "leader", 3: "named" },
      },
      {
        say: "The Lady passes to Dev, who gets the next inspection.",
        note: "Anyone who has ever held it can never be inspected.",
        states: { 3: "leader" },
        notes: { 3: "has the Lady" },
        track: ["success", "fail", null, null, null],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "excalibur",
    name: "Excalibur",
    blurb: "One mission card can be flipped after it has been played.",
    group: "expansions",
    beats: [
      {
        say: "When the leader picks a team, they also give Excalibur to one person on it.",
        note: "Never to themselves.",
        states: { 0: "named", 2: "named", 4: "named" },
        notes: { 0: "leader", 4: "has Excalibur" },
      },
      {
        say: "The mission happens and the cards go down face down as usual.",
        cards: ["back", "back", "back"],
        states: { 0: "named", 2: "named", 4: "named" },
      },
      {
        say: "Before they are turned over, Esa may flip one other team member's card — without seeing it.",
        states: { 4: "named", 2: "named" },
        notes: { 4: "has Excalibur", 2: "flipped" },
        cards: ["back", "back", "back"],
      },
      {
        say: "Cyn had played Succeed. Excalibur turns it into a Fail.",
        note: "Everyone sees WHO was flipped. Only those two ever learn which card it had been.",
        cards: ["success", "fail", "success"],
        stamp: "Mission failed · 1 Fail",
        danger: true,
      },
      {
        say: "So a good holder can rescue a mission, and an evil one can wreck a clean one.",
        note: "Handing out Excalibur is as risky as handing out a place on the team.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "lancelot",
    name: "The two Lancelots",
    blurb: "One good, one evil — and their sides can swap over.",
    group: "expansions",
    beats: [
      {
        say: "Two Lancelots are in the game: one good, one evil. Neither knows who the other is.",
        states: { 2: "named", 5: "spent" },
        notes: { 2: "Lancelot", 5: "Lancelot" },
      },
      {
        say: "Neither gets a choice of card: the evil one must play Fail, the good one must play Succeed.",
        note: "They are the only two players who never decide anything on a mission.",
        states: { 2: "named", 5: "spent" },
        cards: ["success", "fail", "back"],
      },
      {
        say: "From round 3, a card is drawn each round. Two of the five swap their sides over.",
        note: "A swap moves BOTH of them at once.",
        track: ["success", "fail", null, null, null],
      },
      {
        say: "A swap comes up. The good Lancelot is now evil, and the evil one is now good.",
        states: { 2: "spent", 5: "named" },
        notes: { 2: "now evil", 5: "now good" },
        stamp: "Sides swapped",
        danger: true,
      },
      {
        say: "What Merlin was shown at the start never updates, so a swapped Lancelot still looks evil to them.",
        note: "That doubt is the entire point of the add-on.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "assassin",
    name: "Three missions won — the final guess",
    blurb: "Winning three missions is not the same as winning.",
    group: "endings",
    beats: [
      {
        say: "The good team gets a third mission through. That is not the end of it.",
        track: ["success", "fail", "success", "success", null],
        stamp: "Three missions succeeded",
      },
      {
        say: "Everything stops. The Assassin now guesses who Merlin is.",
        note: "The evil players can discuss it openly. This is their last move of the game.",
        states: { 4: "leader" },
        notes: { 4: "Assassin" },
      },
      {
        say: "The Assassin guesses Bran.",
        states: { 4: "leader", 1: "named" },
        notes: { 4: "guessing", 1: "guessed" },
      },
      {
        say: "Bran was not Merlin — Cyn was. The good team wins.",
        states: { 2: "named" },
        notes: { 2: "Merlin" },
        stamp: "Good wins",
      },
      {
        say: "Had they guessed right, evil would have taken the game at the last second.",
        note: "Which is why Merlin spends the game trying to be quietly useful rather than obviously right.",
      },
    ],
  },
];

export const SCENARIO_GROUPS: Array<{ id: Scenario["group"]; label: string }> = [
  { id: "basics", label: "The basics" },
  { id: "expansions", label: "With the add-ons" },
  { id: "endings", label: "How a game ends" },
];

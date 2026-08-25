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
        say: "Seven sit down. Five are loyal; two are traitors who know each other.",
        note: "Only the traitors know who is who. Everyone else is guessing from here on.",
        states: { 1: "spent", 4: "spent" },
        notes: { 1: "traitor", 4: "traitor" },
      },
      {
        say: "Ada holds the seal, so Ada names the party.",
        states: LEADER,
        notes: { 0: "leader" },
      },
      {
        say: "This quest needs three. Ada names herself, Cyn and Esa.",
        states: { 0: "named", 2: "named", 4: "named" },
        notes: { 0: "rides", 2: "rides", 4: "rides" },
      },
      {
        say: "Now everyone votes — the whole table, not just the party.",
        note: "Votes are public once counted. A tie is a rejection.",
        states: { 0: "voted", 1: "voted", 2: "voted", 3: "voted", 4: "voted", 5: "voted", 6: "voted" },
      },
      {
        say: "Four approve, three reject. The party rides.",
        tally: { yes: 4, no: 3 },
        states: { 0: "named", 2: "named", 4: "named" },
        stamp: "Party rides",
      },
      {
        say: "Only the three riders play a card, face down.",
        note: "The loyal may only succeed. A traitor may succeed or fail.",
        states: { 0: "named", 2: "named", 4: "named" },
        cards: ["back", "back", "back"],
      },
      {
        say: "The cards are shuffled, then turned. One Fail sinks this quest.",
        cards: ["success", "fail", "success"],
        states: { 0: "named", 2: "named", 4: "named" },
        stamp: "Quest falls — 1 fail",
        danger: true,
        track: ["fail", null, null, null, null],
      },
      {
        say: "Nobody learns who played it. That argument is the game.",
        note: "Esa was the traitor aboard — but the table only knows one of those three.",
        track: ["fail", null, null, null, null],
      },
      {
        say: "The seal passes to Bran, and the next quest is named.",
        states: { 1: "leader" },
        notes: { 1: "leader" },
        track: ["fail", null, null, null, null],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "rejections",
    name: "Five parties turned away",
    blurb: "Refusing everything is its own way to lose.",
    group: "basics",
    beats: [
      {
        say: "A party is named, and the table rejects it.",
        states: { 0: "named", 2: "named", 4: "named" },
        tally: { yes: 3, no: 4 },
        stamp: "Party turned away",
        danger: true,
        rejects: 1,
      },
      {
        say: "The seal passes on. The next leader tries, and is refused too.",
        states: { 1: "leader" },
        notes: { 1: "leader" },
        rejects: 2,
      },
      {
        say: "And again. The track is filling.",
        rejects: 3,
      },
      {
        say: "Four in a row. One more and the quest is lost without being ridden.",
        note: "This is the traitors' other route: never let a clean party through.",
        rejects: 4,
      },
      {
        say: "Five rejections in a row. Evil wins outright.",
        rejects: 5,
        stamp: "The realm falls",
        danger: true,
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "lady",
    name: "The Lady of the Lake",
    blurb: "One true answer, and a token that keeps moving.",
    group: "expansions",
    beats: [
      {
        say: "After the second quest, whoever holds the Lady may look into one loyalty.",
        note: "Seven players or more. The token starts to the first leader's right.",
        states: { 6: "leader" },
        notes: { 6: "holds the Lady" },
        track: ["success", "fail", null, null, null],
      },
      {
        say: "Gil chooses Dev, and is told the truth: Dev is loyal.",
        note: "It is the CURRENT allegiance, which matters once a Lancelot can switch sides.",
        states: { 6: "leader", 3: "named" },
        notes: { 6: "asks", 3: "loyal" },
        track: ["success", "fail", null, null, null],
      },
      {
        say: "Only Gil is told. Gil may say anything about it — including a lie.",
        note: "A traitor holding the Lady will happily call a loyal player a traitor.",
        states: { 6: "leader", 3: "named" },
      },
      {
        say: "The token passes to Dev, who will ask the next question.",
        note: "Nobody who has already held it can ever be examined.",
        states: { 3: "leader" },
        notes: { 3: "holds the Lady" },
        track: ["success", "fail", null, null, null],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "excalibur",
    name: "Excalibur",
    blurb: "One card can still be turned over, after the fact.",
    group: "expansions",
    beats: [
      {
        say: "When the leader names a party, they also arm one rider with Excalibur.",
        note: "Never themselves.",
        states: { 0: "named", 2: "named", 4: "named" },
        notes: { 0: "leader", 4: "Excalibur" },
      },
      {
        say: "The party rides and the cards go down as usual.",
        cards: ["back", "back", "back"],
        states: { 0: "named", 2: "named", 4: "named" },
      },
      {
        say: "Before the count, Esa may flip one other rider's card — sight unseen.",
        states: { 4: "named", 2: "named" },
        notes: { 4: "bearer", 2: "struck" },
        cards: ["back", "back", "back"],
      },
      {
        say: "Cyn played Success. Excalibur turns it into a Fail.",
        note: "The table sees WHO was struck. Only those two ever learn what the card had been.",
        cards: ["success", "fail", "success"],
        stamp: "Quest falls — 1 fail",
        danger: true,
      },
      {
        say: "So a loyal bearer can save a quest, and a traitor can sink a clean one.",
        note: "Handing out the sword is as dangerous as handing out a seat on the party.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "lancelot",
    name: "The two Lancelots",
    blurb: "One good, one evil — and their sides can trade.",
    group: "expansions",
    beats: [
      {
        say: "Two Lancelots sit down: one loyal, one fallen. Neither knows the other.",
        states: { 2: "named", 5: "spent" },
        notes: { 2: "Lancelot", 5: "Lancelot" },
      },
      {
        say: "Their card is forced. The fallen one must Fail; the loyal one must Succeed.",
        note: "They are the only players who never choose.",
        states: { 2: "named", 5: "spent" },
        cards: ["success", "fail", "back"],
      },
      {
        say: "From the third round, a loyalty card is drawn each round. Two of five switch.",
        note: "A switch trades BOTH their sides at once.",
        track: ["success", "fail", null, null, null],
      },
      {
        say: "A switch lands. The loyal Lancelot is now a traitor, and the traitor is loyal.",
        states: { 2: "spent", 5: "named" },
        notes: { 2: "now fallen", 5: "now loyal" },
        stamp: "Loyalties traded",
        danger: true,
      },
      {
        say: "Merlin's night vision was a snapshot, so a switched Lancelot still reads as evil to him.",
        note: "Which is exactly the doubt the expansion is for.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: "assassin",
    name: "Three quests held — the strike",
    blurb: "Winning three is not the same as winning.",
    group: "endings",
    beats: [
      {
        say: "The loyal take a third quest. That is not the end of it.",
        track: ["success", "fail", "success", "success", null],
        stamp: "Three quests held",
      },
      {
        say: "Everything stops. The Assassin now names who they believe Merlin to be.",
        note: "The traitors may talk it over in the open. This is their last move.",
        states: { 4: "leader" },
        notes: { 4: "the Assassin" },
      },
      {
        say: "The Assassin names Bran.",
        states: { 4: "leader", 1: "named" },
        notes: { 4: "strikes", 1: "named" },
      },
      {
        say: "Bran was not Merlin. Cyn was. The realm stands.",
        states: { 2: "named" },
        notes: { 2: "Merlin" },
        stamp: "The realm holds",
      },
      {
        say: "Had they found Merlin, evil would have taken the game at the last breath.",
        note: "Which is why Merlin spends the whole game trying to be quietly useful, not obviously right.",
      },
    ],
  },
];

export const SCENARIO_GROUPS: Array<{ id: Scenario["group"]; label: string }> = [
  { id: "basics", label: "The basics" },
  { id: "expansions", label: "With expansions" },
  { id: "endings", label: "How it ends" },
];

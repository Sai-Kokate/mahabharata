/* ============================================================================
   Shared types for the Council Seal table.

   The room shape is DERIVED from the Convex query rather than hand-declared, so
   the screens can never drift from `convex/avalon.ts:getRoom`. The design
   handoff's `ProposeScreen` used a hand-written `RoomView`; this replaces it.
   ========================================================================== */

import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { QUEST_SIZES } from "../../convex/logic";

export type Room = NonNullable<FunctionReturnType<typeof api.avalon.getRoom>>;

/** Someone at the table. Up to `MAX_PLAYERS`. */
export type TablePlayer = Room["players"][number];
/** Someone in the room but not in the game. */
export type Watcher = Room["watchers"][number];

/** The signed-in account, or the free/anonymous state. */
export type Account = {
  signedIn: boolean;
  isAdmin: boolean;
  premium: boolean;
  email: string | null;
  signIn: () => void;
};

/** A selectable world. Themes now supply names and lore, not colours. */
export type World = {
  id: string;
  name: string;
  goodTeamName: string;
  evilTeamName: string;
};

/** Everything every screen needs. Screens stay presentational; App owns the actions. */
export type TableProps = {
  room: Room;
  /** My anonymous per-tab player id. */
  pid: string;
  /** Themed role names / lore. The palette is fixed — themes no longer colour the board. */
  theme: { name: string; goodTeamName: string; evilTeamName: string };
  emblemSrc: string;
  account: Account;
  worlds: World[];
  /** Wraps a mutation so errors surface in one place. */
  act: (fn: () => Promise<unknown>) => () => void;
  error: string;
};

export const ROMAN = ["I", "II", "III", "IV", "V"];

/**
 * Names are stored folded to lower case (see `normalizeName` on the server), so
 * presenting one is the UI's job. Every word gets its initial back, which is
 * right for "ravi" and for "mary jane" alike.
 *
 * Used wherever a name lands inside a sentence. Somewhere it stands alone — a
 * seat, a roster row, a vote list — `text-transform` in seal.css does the same
 * job without a round trip through JS.
 */
export function displayName(name: string): string {
  return name.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** Sigils are dealt from playerId, so they are stable without any schema change. */
export function nameOf(room: Room, playerId: string | null | undefined): string {
  if (!playerId) return "—";
  const found =
    room.players.find((p) => p.playerId === playerId)?.name ??
    room.watchers.find((p) => p.playerId === playerId)?.name;
  return found ? displayName(found) : "—";
}

/** The player holding the seal this round, or null before the game starts. */
export function leaderOf(room: Room): TablePlayer | null {
  return room.players[room.leaderIndex] ?? null;
}

export function isLeader(room: Room, pid: string): boolean {
  return leaderOf(room)?.playerId === pid;
}

/**
 * How many riders this quest needs. Read from the engine's own matrix rather
 * than a copy: the copy stopped at ten players and answered 0 above it, which
 * now matters because a premium table seats eighteen.
 */
export function partySize(room: Room): number {
  return QUEST_SIZES[room.players.length]?.[room.questIndex] ?? 0;
}

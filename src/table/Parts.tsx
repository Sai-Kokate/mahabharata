/* ============================================================================
   Pieces shared by more than one phase: the room → CouncilSeal seat mapping,
   what you are trying to do, and a parchment name plate.

   The two columns that used to live here are gone. `QuestColumn` was 288px of
   mission plate, ladder, rejection track and win conditions, three of them
   under a sentence explaining them — it is now one row, `StatusStrip`.
   `ChronicleColumn` was a permanent 274px ledger nobody reads mid-turn; it is
   the second half of the ⓘ sheet, `GameInfo`.
   ========================================================================== */

import { useMemo } from "react";
import { CouncilSeal, type Seat, type SeatState } from "../CouncilSeal";
import { dealSigils } from "../sigils";
import { type Room, displayName } from "./types";

/**
 * Map the room onto the seal. `stateFor` decides each seat's state so one
 * component serves every phase, exactly as the design intends.
 */
export function SeatRing({
  room,
  emblemSrc,
  stateFor,
  noteFor,
  onSelect,
  isDisabled,
}: {
  room: Room;
  emblemSrc: string;
  stateFor: (p: Room["players"][number]) => SeatState;
  noteFor?: (p: Room["players"][number]) => string | undefined;
  onSelect?: (playerId: string) => void;
  isDisabled?: (seat: Seat) => boolean;
}) {
  const sigils = useMemo(
    () => dealSigils(room.players.map((p) => p.playerId)),
    [room.players.map((p) => p.playerId).join(",")], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const seats: Seat[] = room.players.map((p) => ({
    playerId: p.playerId,
    // Names are stored folded to lower case. The visible label gets its
    // capitals back from CSS, but a seat's aria-label is read out as-is —
    // "Add amber" — so the fold has to be undone here too.
    name: displayName(p.name),
    sigil: sigils[p.playerId] ?? 0,
    state: stateFor(p),
    note: noteFor?.(p),
  }));

  return (
    <CouncilSeal
      seats={seats}
      emblemSrc={emblemSrc}
      onSelect={onSelect}
      isDisabled={isDisabled}
    />
  );
}

/**
 * What you are actually trying to do, in plain words.
 *
 * Derived from your side and from `allowedCards` — not from theme copy — so
 * it stays correct across all five settings without another 65 strings to
 * write and keep in sync with the engine.
 */
export function RoleBrief({ room }: { room: Room }) {
  const me = room.me;
  if (!me || me.isWatcher || !me.role) return null;
  const evil = me.team === "evil";
  const allowed = me.allowedCards ?? [];
  const forcedFail = allowed.length === 1 && allowed[0] === "fail";
  const forcedSuccess = allowed.length === 1 && allowed[0] === "success";

  return (
    <div className="vd-brief">
      <span className="vd-label">Your job</span>
      <p className="vd-brief__text">
        {evil
          ? "Make missions FAIL — and don't get found out. Try to get picked for teams, and lie about who you are."
          : "Make missions SUCCEED. Work out who is lying and keep them off the teams."}
      </p>
      <p className="vd-hint">
        {forcedFail
          ? "Your role gives you no choice on a mission: you must always play Fail."
          : forcedSuccess
            ? "On a mission you can only ever play Succeed."
            : evil
              ? "On a mission you may play Succeed or Fail, whichever suits you."
              : "You can only play Succeed on a mission."}
      </p>
    </div>
  );
}

/** A parchment name plate. The design never shows a learned name as plain text. */
export function NamePlate({ children }: { children: React.ReactNode }) {
  return <span className="vd-tile vd-tile--parchment" style={{ width: "auto" }}>{children}</span>;
}

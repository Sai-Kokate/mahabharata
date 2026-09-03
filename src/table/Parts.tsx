/* ============================================================================
   Pieces shared by more than one phase: the left-hand quest column, the
   chronicle, and the room → CouncilSeal seat mapping.
   ========================================================================== */

import { useMemo } from "react";
import { CouncilSeal, type Seat, type SeatState } from "../CouncilSeal";
import { QuestLadder, RejectionTrack, Chronicle, type ChronicleEntry } from "../TableParts";
import { dealSigils } from "../sigils";
import { QUEST_SIZES, doubleFailQuests } from "../../convex/logic";
import { type Room, displayName, partySize } from "./types";

/** Quest numeral + ladder + rejection track + the oath. */
export function QuestColumn({ room }: { room: Room }) {
  const n = room.players.length;
  const sizes = QUEST_SIZES[n] ?? [];
  const doubleFail = doubleFailQuests(n);

  return (
    <div className="vd-stack">
      <div className="vd-studded vd-panel vd-panel--strong">
        <span className="vd-stud-b" aria-hidden />
        <div className="vd-label">Mission</div>
        <div className="vd-numeral" style={{ fontSize: 44, marginTop: 6 }}>
          {room.questIndex >= 0 ? `${room.questIndex + 1} of 5` : "—"}
        </div>
        <div className="vd-label" style={{ marginTop: 8 }}>
          {partySize(room)} people go
        </div>
        <p className="vd-hint" style={{ marginTop: 6 }}>
          {room.failsNeeded === 1
            ? "One Fail card is enough to fail this mission."
            : `${room.failsNeeded} Fail cards are needed to fail this one.`}
        </p>
      </div>

      <QuestLadder
        sizes={sizes}
        questIndex={room.questIndex}
        results={room.questResults}
        doubleFail={doubleFail}
        log={room.questLog ?? []}
      />

      <RejectionTrack used={room.rejectCount} max={room.maxRejects} />

      <p className="vd-voice">
        <b>Good wins</b> if three missions succeed. <b>Evil wins</b> if three
        fail — or if five teams in a row get voted down.
      </p>
    </div>
  );
}

/** The ledger. Built from what the table publicly knows — never from roles. */
export function ChronicleColumn({ room }: { room: Room }) {
  const entries = useMemo<ChronicleEntry[]>(() => {
    const out: ChronicleEntry[] = [];
    room.questResults.forEach((r, i) => {
      if (!r) return;
      // The count for this quest, if it was ridden since the log was added.
      // `?? []` guards the window where the client is live but the Convex
      // functions carrying `questLog` have not been deployed yet.
      const q = (room.questLog ?? []).find((x) => x.questIndex === i);
      out.push({
        n: i + 1,
        text: `Mission ${i + 1} ${r === "success" ? "succeeded" : "failed"}.`,
        // How many of each card came back, which is what the table argues over
        // afterwards. `questResults` only ever said held or fell.
        tally: q
          ? { successes: q.successes, fails: q.fails, size: q.size, failsNeeded: q.failsNeeded }
          : undefined,
        outcome: {
          label: r === "success" ? "Succeeded" : "Failed",
          detail: q ? `${q.successes}–${q.fails}` : undefined,
          held: r === "success",
        },
      });
    });
    if (room.lastVote) {
      const nameOfId = (id: string) =>
        room.players.find((p) => p.playerId === id)?.name ?? "someone";
      out.push({
        n: out.length + 1,
        sides: {
          for: room.lastVote.approvers.map(nameOfId),
          against: room.lastVote.rejecters.map(nameOfId),
        },
        text: room.lastVote.overturnedBy
          ? "The table approved the team, then a plot card cancelled it."
          : room.lastVote.approved
            ? "The table approved the team."
            : "The table voted the team down.",
        outcome: {
          label: room.lastVote.approved && !room.lastVote.overturnedBy ? "Approved" : "Voted down",
          detail: `${room.lastVote.approvers.length}–${room.lastVote.rejecters.length}`,
          held: room.lastVote.approved && !room.lastVote.overturnedBy,
        },
      });
    }
    if (out.length === 0) {
      out.push({ n: 1, text: "Nothing has happened yet — the first team hasn't been picked." });
    }
    return out;
  }, [room.questResults, room.questLog, room.lastVote, room.players]);

  return <Chronicle entries={entries} />;
}

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

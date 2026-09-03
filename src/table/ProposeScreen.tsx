/* ============================================================================
   03 · Propose — the reference screen.

   Left: quest plate, ladder, rejection track. Centre: clock fuse, the seal, the
   NAMED line, the primary button. Right: chronicle. Tapping a seat toggles it;
   the button enables only at exactly QUEST_SIZES[n][questIndex].
   ========================================================================== */

import { useEffect, useState } from "react";
import { Sword } from "lucide-react";
import { ClockFuse } from "../TableParts";
import { DISCUSS_MS, SELECT_MS } from "../../convex/logic";
import { QuestColumn, ChronicleColumn, SeatRing } from "./Parts";
import { ActionLine, Waiting } from "./TableShell";
import {
  type Room, type TableProps, displayName, isLeader, leaderOf, partySize,
} from "./types";

export function ProposeScreen({
  room, pid, emblemSrc, act, onPropose,
}: Pick<TableProps, "room" | "pid" | "emblemSrc" | "act"> & {
  onPropose: (team: string[], excaliburId?: string) => Promise<unknown>;
}) {
  const leader = leaderOf(room);
  const mine = isLeader(room, pid);
  const needed = partySize(room);
  const needsSword = room.opts.excalibur === true;

  const [picked, setPicked] = useState<string[]>([]);
  const [sword, setSword] = useState<string | null>(null);

  // A new round (or a party the server already locked) clears the local pick.
  useEffect(() => {
    setPicked([]);
    setSword(null);
  }, [room.roundId, room.questIndex]);

  const swordable = picked.filter((id) => id !== pid);
  const swordOk = !needsSword || (sword !== null && swordable.includes(sword));
  const ready = picked.length === needed && swordOk;

  const toggle = (playerId: string) => {
    setPicked((q) =>
      q.includes(playerId)
        ? q.filter((x) => x !== playerId)
        : q.length < needed
          ? [...q, playerId]
          : q, // over-selection is prevented, never silently swapped
    );
  };

  return (
    <div className="vd-table vd-table-layout">
      <QuestColumn room={room} />

      <div className="vd-centre">
        <div className="vd-centre__wide">
          <ClockFuse
            endsAt={room.selectEndsAt ?? room.discussEndsAt ?? Date.now()}
            totalMs={DISCUSS_MS + SELECT_MS}
            caption={
              room.discussEndsAt && Date.now() < room.discussEndsAt
                ? "talk it over — then 1 minute to pick"
                : "if this runs out, the next player picks instead"
            }
          />
        </div>

        <SeatRing
          room={room}
          emblemSrc={emblemSrc}
          stateFor={(p) =>
            picked.includes(p.playerId)
              ? "named"
              : p.playerId === leader?.playerId
                ? "leader"
                : "idle"
          }
          noteFor={(p) =>
            picked.includes(p.playerId)
              ? "On the team"
              : p.playerId === leader?.playerId
                ? mine ? "Leader · you" : "Leader"
                : undefined
          }
          onSelect={mine ? toggle : undefined}
          isDisabled={(s) =>
            !mine || (picked.length >= needed && s.state !== "named")
          }
        />

        <div className="vd-centre__wide vd-actionbar">
          {mine ? (
            <>
              {needsSword && picked.length === needed && (
                <div className="vd-stack vd-stack--tight" style={{ marginBottom: 14 }}>
                  <ActionLine label="Now pick who carries Excalibur" />
                  <p className="vd-hint" style={{ margin: "0 0 6px" }}>
                    They'll be able to secretly flip one other team member's
                    card. It can't be you.
                  </p>
                  <div className="vd-grid2">
                    {swordable.map((id) => {
                      const nm = room.players.find((p) => p.playerId === id)?.name ?? id;
                      const on = sword === id;
                      return (
                        <button
                          key={id}
                          className={`vd-tile vd-tile--btn ${on ? "vd-tile--brass" : ""}`}
                          onClick={() => setSword(on ? null : id)}
                        >
                          <Sword size={13} color={on ? "var(--vd-brass)" : "var(--vd-ink-dim)"} />
                          {nm}
                          {on && <span className="vd-tile__meta">Carries it</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* The count used to read "II of III" — Roman numerals on a
                  progress counter you are meant to check at a glance. */}
              <ActionLine
                label="Chosen"
                value={`${picked.length} of ${needed}`}
              />
              <button
                className="vd-btn vd-btn--primary"
                disabled={!ready}
                onClick={act(async () => {
                  await onPropose(picked, needsSword ? sword ?? undefined : undefined);
                  setPicked([]);
                  setSword(null);
                })}
              >
                <span>
                  {picked.length < needed
                    ? `Pick ${needed - picked.length} more ${needed - picked.length === 1 ? "person" : "people"}`
                    : !swordOk
                      ? "Choose who carries Excalibur"
                      : "Send this team to a vote"}
                </span>
                <span className="vd-btn__meta">{picked.length}/{needed}</span>
              </button>
              <span className="vd-hint">
                {ready
                  ? "Everyone then votes yes or no. You can change your picks until you send it."
                  : "Tap names on the circle above to add or remove them."}
              </span>
            </>
          ) : (
            <>
              <ActionLine label="Waiting for" value={leader ? displayName(leader.name) : "the leader"} />
              <Waiting>
                {leader ? displayName(leader.name) : "The leader"} is choosing{" "}
                {needed} {needed === 1 ? "person" : "people"} to send on this
                mission. Use this time to talk about who you trust — you'll
                vote on their team next.
              </Waiting>
            </>
          )}
        </div>
      </div>

      <ChronicleColumn room={room} />
    </div>
  );
}

/** Shared by vote/quest/lady: who is riding, as parchment plates. */
export function Riders({ room }: { room: Room }) {
  return (
    <div className="vd-stack vd-stack--tight">
      <ActionLine label={`On this mission (${room.proposedTeam.length})`} />
      {room.proposedTeam.map((id) => {
        const p = room.players.find((x) => x.playerId === id);
        const sword = room.excalibur?.holderId === id;
        const calledOut = (room.plots?.calledOutIds ?? []).includes(id);
        return (
          <div key={id} className="vd-tile vd-tile--parchment">
            {p?.name ?? id}
            {(sword || calledOut) && (
              <span className="vd-tile__meta" style={{ color: "#171410", opacity: 0.7 }}>
                {sword ? "Has Excalibur" : ""}{sword && calledOut ? " · " : ""}{calledOut ? "Card revealed" : ""}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

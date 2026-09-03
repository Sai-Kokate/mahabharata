/* ============================================================================
   05 · On the quest, and what came back.

   Only riders see the choice, and the engine clamps it (`allowedQuestCards`):
   good may only succeed — unless the room turned on the `goodMayFail` house
   rule — and the Evil Lancelot may only fail. The result is anonymous by
   design — the count of fails, never the hands.
   ========================================================================== */

import { Check, Eye, Sword, X } from "lucide-react";
import { Plate } from "../TableParts";
import { QuestColumn, ChronicleColumn, SeatRing } from "./Parts";
import { ActionLine, Waiting } from "./TableShell";
import { Riders } from "./ProposeScreen";
import { type TableProps, nameOf } from "./types";

export function QuestScreen({
  room, pid, emblemSrc, act, onCard,
}: Pick<TableProps, "room" | "pid" | "emblemSrc" | "act"> & {
  onCard: (card: "success" | "fail") => Promise<unknown>;
}) {
  const onTeam = room.proposedTeam.includes(pid);
  const played = room.questProgress.iSubmitted;
  const allowed = room.me?.allowedCards ?? ["success"];
  const canSucceed = allowed.includes("success");
  const canFail = allowed.includes("fail");
  const forced = allowed.length === 1;

  return (
    <div className="vd-table vd-table-layout">
      <QuestColumn room={room} />

      <div className="vd-centre">
        <div className="vd-centre__wide">
          <Riders room={room} />
        </div>

        <SeatRing
          room={room}
          emblemSrc={emblemSrc}
          stateFor={(p) => (room.proposedTeam.includes(p.playerId) ? "named" : "idle")}
          noteFor={(p) => (room.proposedTeam.includes(p.playerId) ? "On the team" : undefined)}
        />

        <div className="vd-centre__wide vd-actionbar">
          {room.failsNeeded > 1 && (
            <div className="vd-panel vd-panel--danger" style={{ marginBottom: 12 }}>
              <p className="vd-voice" style={{ margin: 0, color: "var(--vd-red-ink)" }}>
                Mission {room.questIndex + 1} needs <b>two Fail cards</b> to
                fail. A single Fail is not enough this round.
              </p>
            </div>
          )}

          {!onTeam ? (
            <>
              <ActionLine
                label="The team is playing their cards"
                value={`${room.questProgress.submitted} of ${room.questProgress.total} in`}
              />
              <Waiting>
                You're not on this mission, so you have no card to play. You'll
                see how many Fails came back — never who played them.
              </Waiting>
            </>
          ) : played ? (
            <>
              <ActionLine label="Your card is in" value={`${room.questProgress.submitted} of ${room.questProgress.total} in`} />
              <Waiting>
                Your card is face down with the rest. Waiting for{" "}
                {room.questProgress.total - room.questProgress.submitted}{" "}
                {room.questProgress.total - room.questProgress.submitted === 1 ? "other" : "others"}.
              </Waiting>
            </>
          ) : (
            <>
              <ActionLine label="Play one card" />
              <div className="vd-cards">
                <button
                  className="vd-card vd-card--success"
                  disabled={!canSucceed}
                  onClick={act(() => onCard("success"))}
                >
                  <Check size={20} />
                  <span className="vd-card__name">Succeed</span>
                  <span className="vd-card__note">Help this mission work</span>
                </button>
                <button
                  className="vd-card vd-card--fail"
                  disabled={!canFail}
                  onClick={act(() => onCard("fail"))}
                >
                  <X size={20} />
                  <span className="vd-card__name">Fail</span>
                  <span className="vd-card__note">Secretly sabotage it</span>
                </button>
              </div>
              {forced ? (
                <p className="vd-hint">
                  {canFail
                    ? "Your role gives you no choice — you must play Fail."
                    : "Good players can only play Succeed, so Fail is greyed out for you."}
                </p>
              ) : room.opts.goodMayFail ? (
                <p className="vd-hint">
                  House rule is on: good players may play Fail too, so a Fail
                  card doesn't prove anyone is evil.
                </p>
              ) : (
                <p className="vd-hint">
                  Nobody ever learns which card came from which person — only
                  how many Fails there were.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <ChronicleColumn room={room} />
    </div>
  );
}

/**
 * 05b · Excalibur / the sealed-cards window. Every card is in but not yet
 * turned over: the bearer may flip one, and an Ambush can still peek.
 */
export function ExcaliburScreen({
  room, pid, act, onUse, onSeal,
}: Pick<TableProps, "room" | "pid" | "act"> & {
  onUse: (targetId?: string) => Promise<unknown>;
  onSeal: () => Promise<unknown>;
}) {
  const holderId = room.excalibur?.holderId ?? null;
  const armed =
    room.opts.excalibur === true && holderId != null && room.proposedTeam.includes(holderId);
  const mine = armed && holderId === pid;

  if (!armed) {
    return (
      <Plate
        eyebrow="All cards are in"
        title="Ready to reveal"
        action={
          <button className="vd-btn vd-btn--primary" onClick={act(onSeal)}>
            <span>Turn the cards over</span>
          </button>
        }
      >
        <p className="vd-voice" style={{ marginTop: 14, textAlign: "center" }}>
          Every card is face down. This is the last moment to play an Ambush
          card, if you're holding one.
        </p>
      </Plate>
    );
  }

  if (!mine) {
    return (
      <Plate eyebrow="Excalibur" title={nameOf(room, holderId)}>
        <p className="vd-voice" style={{ marginTop: 14, textAlign: "center" }}>
          {nameOf(room, holderId)} is deciding whether to flip one team
          member's card. Nothing for you to do — this only takes a moment.
        </p>
      </Plate>
    );
  }

  return (
    <Plate
      eyebrow="You have Excalibur"
      title="Flip somebody's card?"
      action={
        <button className="vd-btn" onClick={act(() => onUse(undefined))}>
          <span>Don't use it — leave every card as it is</span>
        </button>
      }
    >
      <p className="vd-voice" style={{ marginTop: 14, textAlign: "center" }}>
        Pick a team member to turn their Succeed into a Fail, or their Fail into
        a Succeed.
      </p>
      <div className="vd-stack vd-stack--tight" style={{ marginTop: 16 }}>
        {room.proposedTeam
          .filter((id) => id !== pid)
          .map((id) => (
            <button key={id} className="vd-tile vd-tile--btn" onClick={act(() => onUse(id))}>
              <Sword size={14} color="var(--vd-brass)" /> Flip {nameOf(room, id)}'s card
            </button>
          ))}
      </div>
      <p className="vd-hint" style={{ textAlign: "center" }}>
        Everyone will see <b>who</b> you picked. Only you and they will ever
        know which card it was.
      </p>
    </Plate>
  );
}

/** The quest result: card backs, never hands. Failed slots filled red. */
export function QuestResultPlate({
  room, onDismiss,
}: { room: Room2; onDismiss: () => void }) {
  const q = room.lastQuest;
  if (!q) return null;
  const backs = Array.from({ length: q.size }, (_, i) => i < q.fails);

  return (
    <Plate
      eyebrow={`Mission ${q.questIndex + 1} of 5`}
      title={q.success ? "Mission succeeded" : "Mission failed"}
      danger={!q.success}
      action={
        <button className="vd-btn vd-btn--primary" onClick={onDismiss}>
          <span>Continue</span>
        </button>
      }
    >
      <div className="vd-backs" style={{ marginTop: 18 }}>
        {backs.map((failed, i) => (
          <span key={i} className={`vd-back ${failed ? "is-fail" : ""}`} />
        ))}
      </div>
      <p className="vd-voice" style={{ marginTop: 16, textAlign: "center" }}>
        {q.fails === 0
          ? "Every card played was a Succeed."
          : `${q.fails} Fail card${q.fails === 1 ? "" : "s"} came back out of ${q.size}. Who played ${q.fails === 1 ? "it" : "them"} stays secret.`}
      </p>
      {(q.revealed ?? []).length > 0 && (
        <div className="vd-stack vd-stack--tight" style={{ marginTop: 14 }}>
          <span className="vd-label">Revealed by a "We Found You" card</span>
          {(q.revealed ?? []).map((r) => (
            <div key={r.playerId} className="vd-tile">
              <Eye size={13} color="var(--vd-brass)" /> {nameOf(room, r.playerId)}
              <span className="vd-tile__meta" style={{ color: r.card === "fail" ? "var(--vd-red-ink)" : "var(--vd-brass)" }}>
                {r.card === "fail" ? "Fail" : "Success"}
              </span>
            </div>
          ))}
        </div>
      )}
    </Plate>
  );
}

// Local alias so this file does not need the full TableProps for one plate.
type Room2 = TableProps["room"];

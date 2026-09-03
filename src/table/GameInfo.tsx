/* ============================================================================
   Everything the board used to say out loud, in a sheet you can open.

   The gameplay screens carried ~130 words of explanation each — win
   conditions, what the ladder means, what a rejection costs, which add-ons are
   on — permanently, on every round. None of it changes what you press this
   turn, and all of it competed with the thing that does. It lives here now,
   one tap away, behind the ⓘ in the bar.

   Two sections, in the order people ask for them:
     This game       the numbers and rules of THIS table's setup
     What's happened the ledger — the thing the next round argues about

   Nothing was cut from the record: `Chronicle` renders exactly what it did in
   the old right-hand column.
   ========================================================================== */

import { useEffect, useMemo, useRef } from "react";
import { ScrollText, X } from "lucide-react";
import { Chronicle, type ChronicleEntry } from "../TableParts";
import {
  MAX_REJECTS, QUEST_SIZES, TEAM_COUNTS, doubleFailQuests,
} from "../../convex/logic";
import { type Room, displayName } from "./types";

export function GameInfo({
  room, theme, onClose,
}: {
  room: Room;
  theme: { goodTeamName: string; evilTeamName: string };
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<Element | null>(null);

  /* Dismissable, unlike `Plate`: this sheet is never a decision the game is
     waiting on, so Escape and a tap outside both close it, and focus goes back
     to the control that opened it. */
  useEffect(() => {
    returnTo.current = document.activeElement;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  const n = room.players.length;
  const [good, evil] = TEAM_COUNTS[Math.max(n, 5)] ?? [0, 0];
  const sizes = QUEST_SIZES[n] ?? [];
  const doubleFail = doubleFailQuests(n).map((i) => i + 1);

  const addOns = [
    room.opts.lady === true && (room.theme.expansions?.lady?.name ?? "Lady of the Lake"),
    room.opts.excalibur === true && (room.theme.expansions?.excalibur?.name ?? "Excalibur"),
    room.opts.plots === true && (room.theme.expansions?.plots?.name ?? "Plot cards"),
    room.opts.goodMayFail === true && "Good players may sabotage",
  ].filter(Boolean) as string[];

  const entries = useChronicle(room);

  return (
    <div className="vd-sheet" onClick={onClose}>
      <div
        ref={panel}
        tabIndex={-1}
        className="vd-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label="This game"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="vd-sheet__head">
          <span className="vd-label">This game</span>
          <button className="vd-sheet__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="vd-sheet__body">
          <dl className="vd-facts">
            <dt>Players</dt>
            <dd>{n} · {good} {theme.goodTeamName}, {evil} {theme.evilTeamName}</dd>
            <dt>Missions</dt>
            <dd>
              {sizes.join(" · ")} people
              {doubleFail.length > 0 && (
                <> — mission {doubleFail.join(" and ")} need
                  {doubleFail.length === 1 ? "s" : ""} two fails</>
              )}
            </dd>
            <dt>Teams voted down</dt>
            <dd>{room.rejectCount} of {MAX_REJECTS}</dd>
            {addOns.length > 0 && (
              <>
                <dt>Add-ons on</dt>
                <dd>{addOns.join(" · ")}</dd>
              </>
            )}
          </dl>

          <p className="vd-voice vd-sheet__rule">
            <b>{theme.goodTeamName}</b> win if three missions succeed — unless
            the other side then guesses who the guide is.{" "}
            <b>{theme.evilTeamName}</b> win if three missions fail, or if{" "}
            {MAX_REJECTS} teams in a row are voted down.
          </p>

          <a className="vd-pill" href="/rules">
            <ScrollText size={13} /> Full rules
          </a>

          <header className="vd-sheet__head" style={{ marginTop: "var(--vd-6)" }}>
            <span className="vd-label">What's happened</span>
          </header>
          <Chronicle entries={entries} />
        </div>
      </div>
    </div>
  );
}

/**
 * The ledger, built from what the table PUBLICLY knows — never from roles.
 * Lifted here verbatim from the old `ChronicleColumn`.
 */
function useChronicle(room: Room): ChronicleEntry[] {
  return useMemo<ChronicleEntry[]>(() => {
    const out: ChronicleEntry[] = [];
    room.questResults.forEach((r, i) => {
      if (!r) return;
      // `?? []` guards the window where the client is live but the Convex
      // functions carrying `questLog` have not been deployed yet.
      const q = (room.questLog ?? []).find((x) => x.questIndex === i);
      out.push({
        n: i + 1,
        text: `Mission ${i + 1} ${r === "success" ? "succeeded" : "failed"}.`,
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
        displayName(room.players.find((p) => p.playerId === id)?.name ?? "someone");
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
      out.push({ n: 1, text: "Nothing yet — the first team hasn't been picked." });
    }
    return out;
  }, [room.questResults, room.questLog, room.lastVote, room.players]);
}

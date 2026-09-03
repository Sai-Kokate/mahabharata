/* ============================================================================
   07 · The last word — the assassination.

   Three quests held means good has almost won. The assassin still names Merlin,
   and if the lovers are in play may name the pair instead.

   One column, and one job: the face you are hunting, the names, the button.
   Gone: a second copy of the mission ladder, the ledger column, a paragraph
   restating what the bar says, "Tap a name to choose them" for a grid of
   names, and "Get it right and evil wins" under a button that already reads
   "Lock in Bee".
   ========================================================================== */

import { useState } from "react";
import { Flame } from "lucide-react";
import { CharacterCard } from "../CharacterCard";
import { characterFor } from "../characters";
import { StatusStrip } from "./StatusStrip";
import { ActionLine } from "./TableShell";
import type { TableProps } from "./types";

export function AssassinScreen({
  room, pid, theme, act, onStrike,
}: Pick<TableProps, "room" | "pid" | "theme" | "act"> & {
  onStrike: (mode: "merlin" | "lovers", targetId: string, targetId2?: string) => Promise<unknown>;
}) {
  const amAssassin = room.me?.role === "assassin";
  const loversInPlay = room.opts.lovers === true;
  const [mode, setMode] = useState<"merlin" | "lovers">("merlin");
  const [picks, setPicks] = useState<string[]>([]);

  const roleName = (id: string) =>
    room.theme.roles.find((r) => r.id === id)?.name ?? id;
  const merlin = characterFor(room.theme, "merlin");
  const teams = { good: room.theme.goodTeamName, evil: room.theme.evilTeamName };

  const candidates = room.players.filter((p) => p.playerId !== pid);
  const needTwo = mode === "lovers" && loversInPlay;
  const ready = needTwo ? picks.length === 2 : picks.length === 1;

  const toggle = (id: string) => {
    const limit = needTwo ? 2 : 1;
    setPicks((q) =>
      q.includes(id) ? q.filter((x) => x !== id) : q.length < limit ? [...q, id] : q,
    );
  };

  return (
    <div className="vd-play">
      <StatusStrip room={room} />

      {!amAssassin ? (
        <div className="vd-panel vd-panel--danger">
          <span className="vd-label" style={{ color: "var(--vd-red-ink)" }}>
            The evil team is guessing
          </span>
          <p className="vd-hint" style={{ marginTop: 6 }}>
            Nothing you do now changes the outcome.
          </p>
        </div>
      ) : (
        <>
          {/* Who you are hunting, with a face on it. */}
          <div className="cc-row">
            {merlin && (
              <div className="cc-row__card">
                <CharacterCard
                  character={merlin}
                  size="sm"
                  mode="static"
                  teams={teams}
                  hideNote
                />
              </div>
            )}
            <div className="cc-row__body">
              <span className="vd-label">Your target</span>
              <p className="vd-voice" style={{ margin: "4px 0 0" }}>
                Name the player you think is {roleName("merlin")}. Get it right
                and the {theme.evilTeamName} win.
              </p>
            </div>
          </div>

          {loversInPlay && (
            <div className="vd-seg">
              <button
                className={mode === "merlin" ? "is-active" : undefined}
                onClick={() => { setMode("merlin"); setPicks([]); }}
              >
                <span className="vd-seg__label">Guess {roleName("merlin")}</span>
              </button>
              <button
                className={mode === "lovers" ? "is-active" : undefined}
                onClick={() => { setMode("lovers"); setPicks([]); }}
              >
                <span className="vd-seg__label">Guess the two lovers</span>
              </button>
            </div>
          )}

          {/* Only in lovers mode, where the button's label cannot carry the
              count on its own. */}
          {needTwo && <ActionLine label="Pick both" value={`${picks.length} of 2`} />}

          <div className="vd-grid3">
            {candidates.map((p) => {
              const on = picks.includes(p.playerId);
              return (
                <button
                  key={p.playerId}
                  className={`vd-tile vd-tile--btn ${on ? "vd-tile--evil" : ""}`}
                  onClick={() => toggle(p.playerId)}
                >
                  <span className="vd-tile__seat">{p.seat + 1}</span>
                  {p.name}
                </button>
              );
            })}
          </div>

          <div className="vd-actionbar">
            <button
              className="vd-btn vd-btn--danger"
              disabled={!ready}
              onClick={act(() =>
                onStrike(needTwo ? "lovers" : "merlin", picks[0], picks[1]),
              )}
            >
              <span>
                {!ready
                  ? `Choose ${needTwo ? 2 - picks.length : 1} more`
                  : needTwo
                    ? "Lock in both names"
                    : `Lock in ${room.players.find((p) => p.playerId === picks[0])?.name ?? "this name"}`}
              </span>
              <Flame size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

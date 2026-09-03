/* ============================================================================
   06 · The Lady of the Lake (7+ players).

   A grid of eligible targets; anyone who has already held the Lady is rendered
   at half strength and disabled, with the reason named. The result is private —
   the table only ever learns that you looked.
   ========================================================================== */

import { Eye } from "lucide-react";
import { Plate } from "../TableParts";
import { type TableProps, nameOf } from "./types";

export function LadyScreen({
  room, pid, act, onUse,
}: Pick<TableProps, "room" | "pid" | "act"> & {
  onUse: (targetId: string) => Promise<unknown>;
}) {
  const holderId = room.lady?.holderId ?? null;
  const history = room.lady?.history ?? [];
  const mine = holderId === pid;
  const ladyName = room.theme.expansions?.lady?.name ?? "The Lady of the Lake";

  if (!mine) {
    return (
      <Plate eyebrow={ladyName} title={nameOf(room, holderId)}>
        <p className="vd-voice" style={{ marginTop: 14, textAlign: "center" }}>
          {nameOf(room, holderId)} is picking one player to inspect. Only they
          will be told the answer — and they're free to lie about it
          afterwards.
        </p>
      </Plate>
    );
  }

  return (
    <Plate eyebrow={ladyName} title="Choose someone to inspect">
      <p className="vd-voice" style={{ marginTop: 14, textAlign: "center" }}>
        You'll privately learn whether they're good or evil. Nobody else is
        told. The power then passes to whoever you pick.
      </p>
      <div className="vd-grid2" style={{ marginTop: 18 }}>
        {room.players
          .filter((p) => p.playerId !== pid)
          .map((p) => {
            const spent = history.includes(p.playerId);
            return (
              <button
                key={p.playerId}
                className="vd-tile vd-tile--btn"
                disabled={spent}
                title={spent ? `${p.name} has already had this power, so cannot be inspected` : `Inspect ${p.name}`}
                onClick={act(() => onUse(p.playerId))}
              >
                <Eye size={14} color={spent ? "var(--vd-ink-dim)" : "var(--vd-brass)"} />
                {p.name}
                {spent && <span className="vd-tile__meta">Can't be picked</span>}
              </button>
            );
          })}
      </div>
      <p className="vd-hint" style={{ textAlign: "center" }}>
        Greyed-out names have held this power before, so they can never be
        inspected.
      </p>
    </Plate>
  );
}

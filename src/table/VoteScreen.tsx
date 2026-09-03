/* ============================================================================
   04 · The vote, and the verdict.

   Votes are simultaneous and hidden: a brass stud on a seat means that player
   has voted, never how. The verdict arrives as a studded plate.
   ========================================================================== */

import { Check, Crown, X } from "lucide-react";
import { Plate } from "../TableParts";
import { QuestColumn, ChronicleColumn, SeatRing } from "./Parts";
import { ActionLine, Waiting } from "./TableShell";
import { Riders } from "./ProposeScreen";
import { type TableProps, nameOf } from "./types";

export function VoteScreen({
  room, pid, emblemSrc, act, onVote,
}: Pick<TableProps, "room" | "pid" | "emblemSrc" | "act"> & {
  onVote: (choice: "approve" | "reject") => Promise<unknown>;
}) {
  const voted = room.voteProgress.iVoted;
  const open = room.voteProgress.openVotes ?? [];
  const iAmWatching = room.seating.iAmWatching;

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
          // A brass ring means a vote is in. It never says which way.
          stateFor={(p) => {
            if (room.proposedTeam.includes(p.playerId)) return "named";
            const cast = open.find((o) => o.playerId === p.playerId);
            if (cast) return "voted";
            return p.playerId === room.players[room.leaderIndex]?.playerId ? "leader" : "idle";
          }}
          noteFor={(p) => {
            const cast = open.find((o) => o.playerId === p.playerId);
            // Only a Charge plot card makes a vote public before the count.
            if (cast) return cast.choice === "approve" ? "Voted yes" : "Voted no";
            return room.proposedTeam.includes(p.playerId) ? "On the team" : undefined;
          }}
        />

        <div className="vd-centre__wide vd-actionbar">
          {iAmWatching ? (
            <Waiting>
              You're watching this round, so you don't get a vote. You'll see
              the result along with everyone else.
            </Waiting>
          ) : !voted ? (
            <>
              <ActionLine
                label="Should this team go?"
                value={`${room.voteProgress.voted} of ${room.voteProgress.total} voted`}
              />
              <div className="vd-cards">
                <button className="vd-card vd-card--success" onClick={act(() => onVote("approve"))}>
                  <Check size={20} />
                  <span className="vd-card__name">Yes</span>
                  <span className="vd-card__note">Send this team on the mission</span>
                </button>
                <button className="vd-card vd-card--fail" onClick={act(() => onVote("reject"))}>
                  <X size={20} />
                  <span className="vd-card__name">No</span>
                  <span className="vd-card__note">Make someone else pick a team</span>
                </button>
              </div>
              <span className="vd-hint">
                More yes votes than no and the team goes. A tie counts as no.
                You can't change your vote afterwards.
              </span>
            </>
          ) : (
            <>
              <ActionLine label="Your vote is in" value={`${room.voteProgress.voted} of ${room.voteProgress.total} voted`} />
              <Waiting>
                Waiting for{" "}
                {room.voteProgress.total - room.voteProgress.voted}{" "}
                {room.voteProgress.total - room.voteProgress.voted === 1 ? "person" : "people"}.
                Nobody sees any vote until the last one lands.
              </Waiting>
            </>
          )}
        </div>
      </div>

      <ChronicleColumn room={room} />
    </div>
  );
}

/**
 * 04b · The King Returns window — an approved party can still be overturned by
 * whoever holds that plot card.
 */
export function KingReturnsScreen({
  room, pid, emblemSrc, act, onPlay, onPass,
}: Pick<TableProps, "room" | "pid" | "emblemSrc" | "act"> & {
  onPlay: () => Promise<unknown>;
  onPass: () => Promise<unknown>;
}) {
  const holders = room.plots?.kingReturnsHolders ?? [];
  const passed = room.plots?.kingReturnsPassed ?? [];
  const mine = holders.includes(pid) && !passed.includes(pid);

  return (
    <Plate
      eyebrow="The team was approved"
      title={mine ? "You can cancel this team" : "Waiting on a plot card"}
      action={
        mine ? (
          <div className="vd-cards">
            <button className="vd-card vd-card--fail" onClick={act(onPlay)}>
              <Crown size={18} />
              <span className="vd-card__name">Cancel it</span>
              <span className="vd-card__note">Counts as the team being rejected</span>
            </button>
            <button className="vd-card vd-card--success" onClick={act(onPass)}>
              <Check size={18} />
              <span className="vd-card__name">Let it go ahead</span>
              <span className="vd-card__note">Keep your card for later</span>
            </button>
          </div>
        ) : (
          <p className="vd-waiting" style={{ justifyContent: "center" }}>
            <span>
              {passed.length} of {holders.length} have decided to let it go
              ahead.
            </span>
          </p>
        )
      }
    >
      <p className="vd-voice" style={{ marginTop: 14, textAlign: "center" }}>
        Going on the mission:{" "}
        {room.proposedTeam.map((id) => nameOf(room, id)).join(", ")}
      </p>
      {mine && (
        <p className="vd-hint" style={{ textAlign: "center" }}>
          You hold the card that can overrule this vote. Using it burns the
          card.
        </p>
      )}
    </Plate>
  );
}

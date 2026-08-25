/* ============================================================================
   The board every phase sits on: grain, watermark, header, and the
   288 | 1fr | 274 column grid that collapses to one column under 1100px.
   ========================================================================== */

import { useState } from "react";
import type { ReactNode } from "react";
import {
  BadgeCheck, Crown, LogIn, LogOut, RotateCcw, ScrollText, Shield, Sparkles,
  XCircle,
} from "lucide-react";
import type { Account, Room } from "./types";
import { displayName, leaderOf, partySize } from "./types";

export function TableShell({
  room, pid, theme, emblemSrc, account, error,
  onRestart, onClose, onStartFresh, onLeave, children,
}: {
  room: Room;
  pid: string;
  theme: { name: string };
  emblemSrc: string;
  account: Account;
  error?: string;
  onRestart: () => Promise<unknown>;
  onClose: () => Promise<unknown>;
  onStartFresh: () => Promise<unknown>;
  onLeave: () => void;
  children: ReactNode;
}) {
  const isHost = room.hostId === pid;

  return (
    <div className="vd-board">
      <div className="vd-content vd-shell">
        <header className="vd-topbar">
          <div className="vd-topbar__left">
            <img src={emblemSrc} alt="" width={24} height={24} className="vd-topbar__emblem" />
            <span className="vd-topbar__brand">DECEVIA</span>
            <span className="vd-topbar__theme">{theme.name}</span>
          </div>

          <div className="vd-topbar__right">
            <span className="vd-label vd-label--dim">Room {room.code}</span>

            {/* Account, rules and admin stay reachable from the board. */}
            {account.premium && (
              <span className="vd-pill vd-pill--brass" title="Premium active">
                <BadgeCheck size={11} /> Premium
              </span>
            )}
            <a className="vd-pill" href="/rules" title="The rules">
              <ScrollText size={11} /> Rules
            </a>
            {account.isAdmin && (
              <a className="vd-pill" href="/admin" title="Admin console">
                <Shield size={11} /> Admin
              </a>
            )}
            {account.signedIn ? (
              !account.premium && (
                <a className="vd-pill" href="/upgrade">
                  <Crown size={11} /> Upgrade
                </a>
              )
            ) : (
              <button className="vd-pill" onClick={account.signIn}>
                <LogIn size={11} /> Sign in
              </button>
            )}
            {room.seating.overflowing && (
              <span className="vd-label vd-label--brass">
                {room.seating.seatedCount} seated · {room.seating.watcherCount} watching
              </span>
            )}
          </div>
        </header>

        <PhaseBanner room={room} pid={pid} />

        {/* Every phase can be abandoned or started over. These used to live
            only on the reckoning screen, which meant a table that mis-set its
            roles had to finish the game it did not want to play. */}
        <div className="vd-shellbar">
          {isHost && room.phase !== "lobby" && (
            <Confirm
              label="Restart"
              icon={<RotateCcw size={11} />}
              ask="Restart — everyone back to the lobby?"
              onConfirm={onRestart}
            />
          )}
          {isHost && (
            <Confirm
              label="New council"
              icon={<Sparkles size={11} />}
              ask="Close this one and open a fresh council under a new code?"
              onConfirm={onStartFresh}
            />
          )}
          {isHost && (
            <Confirm
              label="Close council"
              icon={<XCircle size={11} />}
              ask="Close the council for everyone?"
              onConfirm={onClose}
              danger
            />
          )}
          {/* Every participant, every phase — host included. Mid-game it keeps
              your seat so you can rejoin, which is why the wording differs. */}
          <Confirm
            label="Leave council"
            icon={<LogOut size={11} />}
            ask={
              room.phase === "lobby"
                ? "Leave the council?"
                : "Leave? Your seat is held — rejoin with your name to take it back."
            }
            onConfirm={async () => onLeave()}
          />
        </div>

        {error && <div className="vd-panel vd-panel--danger vd-errline">{error}</div>}

        {children}
      </div>
    </div>
  );
}

/** Left column of the table: quest plate, ladder, rejection track. */
export function Column({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

/**
 * The one line above the primary action. The design moved the "named" count out
 * of the seal's centre to here, so the ring reads as seats and nothing else.
 */
export function ActionLine({ label, value }: { label: string; value?: string }) {
  return (
    <div className="vd-actionline">
      <span className="vd-label">{label}</span>
      {value && <span className="vd-label vd-label--brass">{value}</span>}
    </div>
  );
}

/** Corner-studded container. Reserved for objects with rank. */
export function Studded({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`vd-studded ${className ?? ""}`}>
      {children}
      <span className="vd-stud-b" />
    </div>
  );
}

/**
 * What the table is waiting for, stated once, at the top, to everyone.
 *
 * The eight-player game kept stalling on the same question — "whose turn is
 * it?" — because the only answer lived in the centre column, under the seal,
 * which on a phone is a scroll away. This is the answer, above the fold, for
 * every player rather than only the one holding the seal.
 */
function PhaseBanner({ room, pid }: { room: Room; pid: string }) {
  const leader = leaderOf(room);
  const mine = leader?.playerId === pid;
  const who = mine ? "You" : leader ? displayName(leader.name) : "The leader";
  const riders = partySize(room);
  const watching = room.seating.iAmWatching;

  const away = (room.seating.awayNames ?? []).map(displayName);

  let text: string;
  let urgent = false;

  switch (room.phase) {
    case "lobby":
      text = `${room.seating.seatedCount} at the table. The host opens the council.`;
      break;
    case "reveal":
      text = "The night. Everyone holds their card and reads their lot.";
      break;
    case "plot":
    case "propose":
      text = mine
        ? `You hold the seal — name ${riders} to ride.`
        : `${who} holds the seal and is naming ${riders} to ride.`;
      urgent = mine;
      break;
    case "vote":
      text = room.voteProgress.iVoted || watching
        ? `The council votes — ${room.voteProgress.voted} of ${room.voteProgress.total} in.`
        : "The council votes. Your voice is still owed.";
      urgent = !room.voteProgress.iVoted && !watching;
      break;
    case "kingReturns":
      text = "The party is approved. The King may still overturn it.";
      break;
    case "quest":
      text = room.questProgress.iSubmitted || !room.proposedTeam.includes(pid)
        ? `The party rides — ${room.questProgress.submitted} of ${room.questProgress.total} cards in.`
        : "You ride. Play your card.";
      urgent = room.proposedTeam.includes(pid) && !room.questProgress.iSubmitted;
      break;
    case "excalibur":
      text = "Excalibur is drawn. One card may still be turned.";
      break;
    case "lady":
      text = "The Lady of the Lake. One loyalty is about to be read.";
      break;
    case "assassin":
      text = "Three quests held. The Assassin now names a target.";
      urgent = true;
      break;
    case "end":
      text = "The reckoning. Every allegiance is open.";
      break;
    default:
      text = "";
  }

  if (!text) return null;

  return (
    <>
      <div className={`vd-banner ${urgent ? "is-urgent" : ""}`} role="status">
        <span className="vd-banner__mark" aria-hidden />
        <span className="vd-banner__text">{text}</span>
        {watching && <span className="vd-label vd-label--dim">watching</span>}
      </div>

      {/* A seat cannot be removed mid-game without resizing the table, so an
          empty one is announced instead: the table knows why it is waiting, and
          the host can restart rather than guess. */}
      {away.length > 0 && room.phase !== "lobby" && (
        <div className="vd-banner vd-banner--away" role="status">
          <span className="vd-banner__mark" aria-hidden />
          <span className="vd-banner__text">
            {away.join(", ")} {away.length === 1 ? "has" : "have"} left the
            table. {away.length === 1 ? "That seat is" : "Those seats are"} held —
            they can rejoin with the same name, or the host can restart.
          </span>
        </div>
      )}
    </>
  );
}

/** A destructive action that asks once. Two taps, no browser dialog. */
function Confirm({
  label, icon, ask, onConfirm, danger,
}: {
  label: string;
  icon: ReactNode;
  ask: string;
  onConfirm: () => Promise<unknown>;
  danger?: boolean;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button className="vd-textbtn" onClick={() => setAsking(true)}>
        {icon} {label}
      </button>
    );
  }

  return (
    <span className="vd-confirm">
      <span className="vd-confirm__ask">{ask}</span>
      <button
        className={`vd-textbtn ${danger ? "is-danger" : ""}`}
        onClick={() => {
          setAsking(false);
          void onConfirm();
        }}
      >
        Yes
      </button>
      <button className="vd-textbtn" onClick={() => setAsking(false)}>
        No
      </button>
    </span>
  );
}

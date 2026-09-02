/* ============================================================================
   The board every phase sits on: grain, watermark, header, and the
   288 | 1fr | 274 column grid that collapses to one column under 1100px.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  BadgeCheck, Crown, LogIn, LogOut, RotateCcw, ScrollText, Shield, Sparkles,
  XCircle,
} from "lucide-react";
import type { Account, Room } from "./types";
import { displayName, leaderOf, partySize } from "./types";
import { RoleReveal } from "./RoleReveal";

export function TableShell({
  room, pid, theme, emblemSrc, account, error,
  onRestart, onClose, onStartFresh, onLeave, children,
}: {
  room: Room;
  pid: string;
  theme: { name: string; goodTeamName: string; evilTeamName: string };
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

        <ClockAlert room={room} />
        <PhaseBanner room={room} pid={pid} />

        {/* Why the seal moved, when it moved on its own. */}
        {room.lastSkip && room.phase === "propose" && (
          <div className="vd-banner vd-banner--away" role="status">
            <span className="vd-banner__mark" aria-hidden />
            <span className="vd-banner__text">
              {displayName(room.lastSkip.name)} ran out of time. The seal passed
              on, and the same quest is being named again — no rejection counted.
            </span>
          </div>
        )}

        {/* Every phase can be abandoned or started over. These used to live
            only on the reckoning screen, which meant a table that mis-set its
            roles had to finish the game it did not want to play. */}
        <div className="vd-shellbar">
          {/* Restart keeps this room and its code; New council and Close both
              end it (into a fresh one, or for good). A rule between them
              groups by consequence, so the three no longer read as one
              undifferentiated row under time pressure. */}
          {isHost && room.phase !== "lobby" && (
            <Confirm
              label="Restart"
              icon={<RotateCcw size={11} />}
              ask="Restart — everyone back to the lobby?"
              onConfirm={onRestart}
            />
          )}
          {isHost && room.phase !== "lobby" && (
            <span
              className="vd-rule"
              style={{ width: 1, height: 14, background: "var(--vd-rule-control)" }}
              aria-hidden
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
          {room.phase !== "lobby" && room.phase !== "reveal" && (
            <RoleReveal room={room} theme={theme} />
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
export function Confirm({
  label, icon, ask, onConfirm, danger, compact, ariaLabel, className,
}: {
  label: string;
  icon: ReactNode;
  ask: string;
  onConfirm: () => Promise<unknown>;
  danger?: boolean;
  /** Icon-only trigger (e.g. a roster row's remove control) instead of the text-button row. */
  compact?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button
        className={className ?? "vd-textbtn"}
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => setAsking(true)}
      >
        {icon} {!compact && label}
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

/**
 * The four minutes running out is the single most missable moment in the game:
 * the clock keeps counting, the screen does not change, and the table carries
 * on arguing while the leader's minute drains. This is the thing that says so,
 * to everybody, once.
 *
 * Entirely client-side — the deadline is already on the room, so no round trip
 * and no new state. It fires on the CROSSING, not on the value, so a tab that
 * opens late does not announce a moment it missed.
 */
function ClockAlert({ room }: { room: Room }) {
  const [alert, setAlert] = useState<string | null>(null);
  const seen = useRef<string>("");

  useEffect(() => {
    if (room.phase !== "propose" || !room.discussEndsAt) return;
    const key = `${room.roundId}:${room.discussEndsAt}`;
    if (seen.current === key) return;
    const left = room.discussEndsAt - Date.now();
    if (left <= 0) { seen.current = key; return; }

    const t = setTimeout(() => {
      seen.current = key;
      setAlert("Talking time is over — one minute to name the party.");
    }, left);
    return () => clearTimeout(t);
  }, [room.phase, room.roundId, room.discussEndsAt]);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 7000);
    return () => clearTimeout(t);
  }, [alert]);

  if (!alert) return null;
  return (
    <div className="vd-alert" role="alert">
      <span className="vd-alert__mark" aria-hidden />
      <span className="vd-alert__text">{alert}</span>
      <button className="vd-textbtn" onClick={() => setAlert(null)}>Dismiss</button>
    </div>
  );
}

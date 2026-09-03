/* ============================================================================
   The board every phase sits on: grain, watermark, header, and the
   288 | 1fr | 274 column grid that collapses to one column under 1100px.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  BadgeCheck, Crown, Hourglass, LogIn, LogOut, RotateCcw, ScrollText, Shield,
  Sparkles, XCircle,
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
            <span className="vd-label">Code {room.code}</span>

            {/* Account, rules and admin stay reachable from the board. */}
            {account.premium && (
              <span className="vd-pill vd-pill--brass" title="Your paid plan is active">
                <BadgeCheck size={13} /> Paid plan
              </span>
            )}
            <a className="vd-pill" href="/rules" title="Open the full rules">
              <ScrollText size={13} /> Rules
            </a>
            {account.isAdmin && (
              <a className="vd-pill" href="/admin" title="Admin console">
                <Shield size={13} /> Admin
              </a>
            )}
            {account.signedIn ? (
              !account.premium && (
                <a className="vd-pill" href="/upgrade">
                  <Crown size={13} /> Paid plan
                </a>
              )
            ) : (
              <button className="vd-pill" onClick={account.signIn}>
                <LogIn size={13} /> Sign in
              </button>
            )}
            {room.seating.overflowing && (
              <span className="vd-label vd-label--brass">
                {room.seating.seatedCount} playing · {room.seating.watcherCount} waiting
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
              {displayName(room.lastSkip.name)} ran out of time, so someone else
              picks the team for this same mission.
              <span className="vd-banner__sub">
                This does not count as a rejected team.
              </span>
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
              label="Start over"
              icon={<RotateCcw size={13} />}
              ask="Send everyone back to the setup screen and re-deal the roles? The same people and the same code stay."
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
              label="New game, new code"
              icon={<Sparkles size={13} />}
              ask="End this game and open a new one under a different code? Everyone will have to join again."
              onConfirm={onStartFresh}
            />
          )}
          {isHost && (
            <Confirm
              label="End for everyone"
              icon={<XCircle size={13} />}
              ask="End this game for everyone and close the table? This cannot be undone."
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
            label="Leave"
            icon={<LogOut size={13} />}
            ask={
              room.phase === "lobby"
                ? "Leave this game?"
                : "Leave? Your place is saved — join again with the same name to get it back."
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

/** What the app is waiting for, when it is not waiting for you. */
export function Waiting({ children }: { children: ReactNode }) {
  return (
    <p className="vd-waiting">
      <Hourglass size={15} />
      <span>{children}</span>
    </p>
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
  const who = mine ? "You" : leader ? displayName(leader.name) : "the leader";
  const riders = partySize(room);
  const watching = room.seating.iAmWatching;
  const isHost = room.hostId === pid;
  const seated = room.seating.seatedCount;

  const away = (room.seating.awayNames ?? []).map(displayName);

  /**
   * Every phase now answers the same two questions in the same order: what is
   * happening, and whether the table is waiting on YOU. `text` is the
   * instruction; `sub` is the rule behind it, for anyone who has not played
   * before. The old copy stated the fiction ("You hold the seal — name 3 to
   * ride") and left the action to be inferred.
   */
  let text: string;
  let sub: string | null = null;
  let urgent = false;

  const onTeam = room.proposedTeam.includes(pid);

  switch (room.phase) {
    case "lobby":
      if (watching) {
        text = "You're next in line for a place.";
        sub = "You'll be seated automatically as soon as someone leaves.";
      } else if (isHost) {
        text = seated < 5
          ? `Waiting for people to join — ${seated} here, ${5 - seated} more needed.`
          : `${seated} people are in. You can start whenever you're ready.`;
        sub = "Share the code below. You're the host, so starting is up to you.";
      } else {
        text = `${seated} people are in. Waiting for the host to start.`;
        sub = "Nothing to do yet — you'll get your secret role once it starts.";
      }
      urgent = isHost && seated >= 5;
      break;
    case "reveal":
      text = watching
        ? "Roles are being handed out. You're watching this round."
        : "Hold your card to see your secret role.";
      sub = watching ? null : "Keep your screen to yourself. Letting go hides it again.";
      urgent = !watching;
      break;
    case "plot":
    case "propose":
      text = mine
        ? `Your turn: choose ${riders} people to send on this mission.`
        : `${who} is choosing ${riders} people for this mission.`;
      sub = mine
        ? "Tap names on the circle below, then send your team to a vote."
        : "Nothing to do yet — this is the time to talk it over.";
      urgent = mine;
      break;
    case "vote":
      if (watching) {
        text = `The table is voting on the team — ${room.voteProgress.voted} of ${room.voteProgress.total} in.`;
      } else if (room.voteProgress.iVoted) {
        text = `Your vote is in. Waiting for ${room.voteProgress.total - room.voteProgress.voted} more.`;
        sub = "Nobody sees any vote until the last one lands.";
      } else {
        text = "Your turn: vote yes or no on this team.";
        sub = "Everyone votes, not just the people on the team.";
        urgent = true;
      }
      break;
    case "kingReturns":
      text = "The team was approved — but a plot card can still cancel it.";
      sub = "Waiting on whoever holds that card.";
      break;
    case "quest":
      if (onTeam && !room.questProgress.iSubmitted) {
        text = "Your turn: play your card for this mission.";
        sub = "Nobody learns which card came from which person.";
        urgent = true;
      } else {
        text = `The team is playing their cards — ${room.questProgress.submitted} of ${room.questProgress.total} in.`;
        sub = onTeam ? "Your card is already in." : "You're not on this mission.";
      }
      break;
    case "excalibur":
      text = "All cards are in. One of them can still be flipped.";
      sub = "Waiting on the player holding Excalibur.";
      break;
    case "lady":
      text = "One player is about to learn somebody's true side.";
      sub = "Only they will see the answer — and they can lie about it.";
      break;
    case "assassin":
      text = "Three missions succeeded. The evil team gets one last guess.";
      sub = "If they name Merlin correctly, evil wins anyway.";
      urgent = true;
      break;
    case "end":
      text = "Game over. Everyone's real role is shown below.";
      break;
    default:
      text = "";
  }

  if (!text) return null;

  return (
    <>
      <div className={`vd-banner ${urgent ? "is-urgent" : ""}`} role="status">
        <span className="vd-banner__mark" aria-hidden />
        <span className="vd-banner__text">
          {text}
          {sub && <span className="vd-banner__sub">{sub}</span>}
        </span>
        {watching && <span className="vd-label vd-label--dim">Watching</span>}
      </div>

      {/* A seat cannot be removed mid-game without resizing the table, so an
          empty one is announced instead: the table knows why it is waiting, and
          the host can restart rather than guess. */}
      {away.length > 0 && room.phase !== "lobby" && (
        <div className="vd-banner vd-banner--away" role="status">
          <span className="vd-banner__mark" aria-hidden />
          <span className="vd-banner__text">
            {away.join(", ")} {away.length === 1 ? "has" : "have"} left.
            <span className="vd-banner__sub">
              {away.length === 1 ? "Their place is" : "Their places are"} saved —
              they can join again with the same name. If they aren't coming
              back, the host can use "Start over".
            </span>
          </span>
        </div>
      )}
    </>
  );
}

/** A destructive action that asks once. Two taps, no browser dialog. */
export function Confirm({
  label, icon, ask, onConfirm, danger, compact, ariaLabel, className, disabled,
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
  /** Disables the trigger only — once asking, Yes/No always stay enabled. */
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button
        className={className ?? "vd-textbtn"}
        aria-label={ariaLabel}
        title={ariaLabel}
        disabled={disabled}
        onClick={() => setAsking(true)}
      >
        {icon}
        {!compact && label}
      </button>
    );
  }

  /* "Yes" / "No" told you nothing about which one you were about to do, on
     controls that can end a game for eight people. The confirm button now
     repeats the action, and the way out says "Cancel". */
  return (
    <span className="vd-confirm">
      <span className="vd-confirm__ask">{ask}</span>
      <span className="vd-confirm__acts">
        <button
          className={`vd-confirm__yes ${danger ? "is-danger" : ""}`}
          onClick={() => {
            setAsking(false);
            void onConfirm();
          }}
        >
          {label}
        </button>
        <button className="vd-textbtn" onClick={() => setAsking(false)}>
          Cancel
        </button>
      </span>
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
      setAlert("Talking time is up. The leader has one minute to pick a team.");
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

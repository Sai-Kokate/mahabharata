import { useMemo, useState } from "react";
import {
  ArrowLeft, Check, Crown, Eye, EyeOff, Flame, ScrollText, Shield, Swords,
  Sun, Users, X,
} from "lucide-react";
import { THEMES, THEME_LIST, type ThemeConfig } from "../convex/themes";
import {
  doubleFailQuests, MAX_PLAYERS, QUEST_SIZES, TEAM_COUNTS, MAX_REJECTS,
  LADY_MIN_PLAYERS, PLOT_CARDS, plotCardsPerRound, NIGHT_ORDER,
} from "../convex/logic";

const BASE = THEMES.medieval;
const BASE_ROLE_IDS = [
  "merlin",
  "percival",
  "guinevere",
  "tristan",
  "isolde",
  "lancelot_good",
  "servant",
  "assassin",
  "morgana",
  "mordred",
  "oberon",
  "lancelot_evil",
  "minion",
] as const;

/** Roles that come as an inseparable pair. */
const PAIRED: Record<string, string> = {
  tristan: "Always with Isolde",
  isolde: "Always with Tristan",
  lancelot_good: "Always with the fallen Lancelot",
  lancelot_evil: "Always with the loyal Lancelot",
};

const PHASES = [
  { id: "lobby", title: "Council", detail: "5–10 warriors join. Host picks the theme, the optional roles, and any expansions." },
  { id: "reveal", title: "Night", detail: "Visions resolve in a fixed order. Each player sees only their own role and what that role is allowed to know." },
  { id: "plot", title: "Plots", detail: "Plot cards only. At the start of each round the leader deals the round's cards, face down, to other players." },
  { id: "propose", title: "Propose", detail: "3 minutes to discuss, then 1 extra minute for the leader to lock a war party of the size shown. With Excalibur, the leader also arms one party member." },
  { id: "vote", title: "Vote", detail: "Everyone supports or opposes the party. A strict majority sends them to battle; a tie turns them away." },
  { id: "quest", title: "Quest", detail: "Party members play Success or Fail in secret. Good may only play Success — unless the host turns on the house rule that lets the loyal sabotage. Then Excalibur, if drawn, may flip one card." },
  { id: "lady", title: "Lady", detail: "After quests 2–4 at 7+ players, the token holder learns one player's true allegiance and passes the token to them." },
  { id: "end", title: "Victory", detail: "Three successes trigger the Assassin's strike. Three fails, or five rejected parties, win for Evil." },
];

const SECTIONS = [
  { id: "how-it-plays", label: "How it plays" },
  { id: "winning", label: "Winning" },
  { id: "table-size", label: "Table size" },
  { id: "beyond-ten", label: "Beyond ten" },
  { id: "sight", label: "Who sees whom" },
  { id: "night", label: "The night" },
  { id: "lancelot", label: "The Lancelots" },
  { id: "expansions", label: "Expansions" },
  { id: "roles", label: "Roles" },
  { id: "themes", label: "Worlds" },
];

function roleOf(theme: ThemeConfig, id: string) {
  return theme.roles.find((r) => r.id === id);
}

function seesTargets(viewerId: string): { ids: string[]; note: string } {
  switch (viewerId) {
    case "merlin":
      return {
        ids: ["assassin", "morgana", "oberon", "lancelot_evil", "minion"],
        note: "Sees Evil — except Mordred, who is veiled. A Lancelot who later switches still reads as Evil to Merlin: the vision is a snapshot of the night.",
      };
    case "percival":
      return {
        ids: ["merlin", "morgana"],
        note: "Sees Merlin and Morgana, but cannot tell them apart.",
      };
    case "guinevere":
      return {
        ids: ["lancelot_good", "lancelot_evil"],
        note: "Sees both Lancelots, but not which of them is loyal and which has fallen.",
      };
    case "tristan":
      return { ids: ["isolde"], note: "Knows Isolde. If the Assassin names them both, they die together." };
    case "isolde":
      return { ids: ["tristan"], note: "Knows Tristan. If the Assassin names them both, they die together." };
    case "lancelot_good":
      return {
        ids: [],
        note: "Knows no one — not even the other Lancelot. Only Guinevere marks them. May play only Success.",
      };
    case "lancelot_evil":
      return {
        ids: [],
        note: "Cannot identify their allies, though the other Evil players recognise them. Merlin and Guinevere both see them. Must play Fail.",
      };
    case "assassin":
    case "morgana":
    case "mordred":
    case "minion":
      return {
        ids: ["assassin", "morgana", "mordred", "lancelot_evil", "minion"].filter(
          (id) => id !== viewerId,
        ),
        note: "Sees fellow Evil — except Oberon, who walks alone. The fallen Lancelot is recognised but does not recognise anyone back.",
      };
    case "oberon":
      return { ids: [], note: "Knows no other Evil. Merlin still sees Oberon." };
    default:
      return { ids: [], note: "No magical sight. Read the table and vote true." };
  }
}

export default function RulesPage() {
  const [themeId, setThemeId] = useState("medieval");
  const [players, setPlayers] = useState(7);
  const theme = THEMES[themeId] ?? BASE;
  const [good, evil] = TEAM_COUNTS[players];
  const quests = QUEST_SIZES[players];
  const evilSpecials = evil - 1;

  const roster = useMemo(
    () =>
      BASE_ROLE_IDS.map((id) => ({
        id,
        base: roleOf(BASE, id)!,
        themed: roleOf(theme, id)!,
      })),
    [theme],
  );

  return (
    <div className="vd-board">
      <div className="vd-content vd-page">
        <div className="vd-page__back">
          <a className="vd-pill" href="/learn"><ArrowLeft size={11} /> How to play</a>
          <a className="vd-pill" href="/play"><ArrowLeft size={11} /> Back to council</a>
        </div>

        <header className="vd-page__head">
          <span className="vd-label vd-label--brass"><ScrollText size={11} /> Laws of the Round Table</span>
          <h1 className="vd-h1">How the war is won</h1>
          <p className="vd-voice">
            Every theme is the same hidden-team game. The <strong>Medieval Kingdom</strong>{" "}
            (Merlin &amp; Arthur) is the rulebook. Other worlds only rename the faces.
          </p>
        </header>

        <nav className="vd-toc" aria-label="Jump to section">
          {SECTIONS.map((s) => (
            <a key={s.id} className="vd-pill" href={`#${s.id}`}>{s.label}</a>
          ))}
        </nav>

        <section id="how-it-plays" className="vd-page__section">
          <h2 className="vd-h2">How a round plays</h2>
          <ol className="vd-stack" style={{ marginTop: 16, listStyle: "none", padding: 0 }}>
            {PHASES.map((p, i) => (
              <li key={p.id} className="vd-row" style={{ alignItems: "flex-start", gap: 14 }}>
                <span className="vd-numeral" style={{ fontSize: 20, color: "var(--vd-rule-engraved)", minWidth: 24 }}>
                  {i + 1}
                </span>
                <div>
                  <strong style={{ display: "block", marginBottom: 2 }}>{p.title}</strong>
                  <p className="vd-voice" style={{ margin: 0 }}>{p.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="vd-grid3" style={{ marginTop: 24 }}>
            <div className="vd-panel">
              <Users size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Propose</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                The table gets 4 minutes to talk, then 1 extra minute for the
                leader to lock the party. Tap warriors until the count matches
                this quest's size, then put it to a vote. If time runs out the
                leader forfeits the turn: the seal passes to the next warrior and
                the same quest is proposed again. A skipped turn is not a
                rejection — the council never met — so the rejection track is
                untouched.
              </p>
            </div>
            <div className="vd-panel">
              <Shield size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Vote</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                Majority <em>Support</em> → the party rides. Majority{" "}
                <em>Oppose</em> (or a tie) → the party is turned away, the crown
                passes, and a reject pip fills.
              </p>
            </div>
            <div className="vd-panel">
              <Swords size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Quest cards</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                Knights of Arthur may play only <strong>Success</strong>. Minions
                of Mordred may play Success or Fail. Cards are secret until the
                quest resolves.
              </p>
            </div>
          </div>
        </section>

        <section id="winning" className="vd-page__section">
          <h2 className="vd-h2">How you win</h2>
          <div className="vd-grid2" style={{ marginTop: 16 }}>
            <div className="vd-panel vd-panel--strong">
              <Sun size={22} color="var(--vd-brass)" />
              <h3 style={{ font: "500 17px/1.3 var(--vd-display)", margin: "10px 0" }}>Good prevails</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                Three quests succeed, <em>and</em> the Assassin names the wrong soul (not Merlin).
              </p>
            </div>
            <div className="vd-panel vd-panel--danger">
              <Flame size={22} color="var(--vd-red-ink)" />
              <h3 style={{ font: "500 17px/1.3 var(--vd-display)", margin: "10px 0" }}>Evil triumphs</h3>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--vd-ink-soft)", lineHeight: 1.6 }}>
                <li>Three quests fail, or</li>
                <li>{MAX_REJECTS} parties are rejected in a row, or</li>
                <li>Three quests succeed but the Assassin correctly names Merlin.</li>
                <li>
                  With the lovers in play, the Assassin may instead name{" "}
                  <strong>both</strong> Tristan and Isolde. Both right wins for
                  Evil; either wrong wins for Good.
                </li>
              </ul>
            </div>
          </div>
          <p className="vd-voice" style={{ marginTop: 16 }}>
            The fourth quest needs <strong>two Fail cards</strong> to fail once there
            are 7 or more players; with 5–6, a single Fail still ruins it. Above ten
            the third quest needs two as well — see <em>Beyond ten</em> below.
          </p>
        </section>

        <section id="table-size" className="vd-page__section">
          <h2 className="vd-h2">Table size &amp; party counts</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Always in the deck: <strong>Merlin</strong> and the{" "}
            <strong>Assassin</strong>. Optional roles fill the remaining seats and
            can never exceed them — Percival, Guinevere and the loyal Lancelot take
            one Good seat each, the lovers take two, and Morgana, Mordred, Oberon
            and the fallen Lancelot take one Evil seat each. Because the Lancelots
            are a pair, enabling them costs one seat on <em>each</em> side.
          </p>

          <div style={{ marginTop: 20 }}>
            <span className="vd-label">Warriors at the table</span>
            <div className="vd-row" style={{ marginTop: 10 }}>
              {Array.from({ length: MAX_PLAYERS - 4 }, (_, i) => i + 5).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`vd-pill ${n === players ? "is-on" : ""}`}
                  onClick={() => setPlayers(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="vd-row" style={{ marginTop: 16 }}>
            <span className="vd-pill vd-pill--brass"><Sun size={13} /> {good} Good</span>
            <span className="vd-pill vd-pill--danger"><Flame size={13} /> {evil} Evil</span>
            <span className="vd-pill"><Crown size={13} /> {evilSpecials} evil special{evilSpecials === 1 ? "" : "s"} besides Assassin</span>
          </div>

          <div className="vd-row" style={{ marginTop: 16, alignItems: "stretch" }}>
            {quests.map((size, i) => {
              const dbl = doubleFailQuests(players).includes(i);
              return (
                <div
                  key={i}
                  className={`vd-panel ${dbl ? "vd-panel--danger" : ""}`}
                  style={{ flex: "1 0 84px", textAlign: "center" }}
                >
                  <span className="vd-label vd-label--dim">Q{i + 1}</span>
                  <div className="vd-numeral" style={{ fontSize: 26, color: "var(--vd-brass)", margin: "4px 0" }}>{size}</div>
                  <span className="vd-label vd-label--dim">on party</span>
                  {dbl && <div className="vd-label" style={{ color: "var(--vd-red-ink)", marginTop: 6 }}>2 fails to sink</div>}
                </div>
              );
            })}
          </div>
        </section>

        <section id="beyond-ten" className="vd-page__section">
          <h2 className="vd-h2">Beyond ten — a house rule</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Avalon is printed for 5–10 players and defines no team split or mission
            sizes above that. This table goes to <strong>{MAX_PLAYERS}</strong>, and
            rather than invent numbers both are extrapolated from the printed
            table's own arithmetic.
          </p>
          <div className="vd-grid3" style={{ marginTop: 20 }}>
            <div className="vd-panel">
              <Flame size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Evil count</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                <code>ceil(n / 3)</code>. That reproduces every official row exactly
                — 5→2, 6→2, 7→3, 8→3, 9→3, 10→4 — so above ten it simply keeps
                going. Good takes the rest.
              </p>
            </div>
            <div className="vd-panel">
              <Users size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Mission sizes</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                Flat at <code>3 4 4 5 5</code> across 8–10 players, so every
                further three players adds one to each mission. Eleven rides
                4/5/5/6/6; eighteen rides 6/7/7/8/8.
              </p>
            </div>
            <div className="vd-panel">
              <Shield size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Two-fail quests</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                The third quest joins the fourth in needing two Fails above ten.
                Parties grow with the head count, so a lone saboteur would
                otherwise be aboard nearly every mission.
              </p>
            </div>
          </div>
          <p className="vd-voice" style={{ marginTop: 16 }}>
            Everything at 5–10 players is unchanged and always takes the printed
            values. Note that the game is still five quests long: at the largest
            sizes many players never ride, which is worth knowing before you seat
            eighteen. Every table may seat all eighteen — the size of the council
            is not part of the paid tier.
          </p>
        </section>

        <section id="sight" className="vd-page__section">
          <h2 className="vd-h2">Who sees whom</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Knowledge is named in Medieval terms. In other themes the same arrows apply to the
            mapped characters.
          </p>
          <div className="vd-stack" style={{ marginTop: 16 }}>
            {BASE_ROLE_IDS.map((id) => {
              const viewer = roleOf(BASE, id)!;
              const { ids, note } = seesTargets(id);
              return (
                <div
                  key={id}
                  className="vd-panel"
                  style={{ borderLeft: `3px solid ${viewer.team === "good" ? "var(--vd-brass)" : "var(--vd-red)"}` }}
                >
                  <div className="vd-row" style={{ marginBottom: 6 }}>
                    {viewer.team === "good" ? <Sun size={14} color="var(--vd-brass)" /> : <Flame size={14} color="var(--vd-red-ink)" />}
                    <strong>{viewer.name}</strong>
                  </div>
                  <p className="vd-voice" style={{ margin: "0 0 10px" }}>{note}</p>
                  <div className="vd-row">
                    {ids.length === 0 ? (
                      <span className="vd-pill"><EyeOff size={12} /> no one</span>
                    ) : (
                      ids.map((tid) => (
                        <span key={tid} className="vd-pill vd-pill--brass">
                          <Eye size={12} /> {roleOf(BASE, tid)!.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="night" className="vd-page__section">
          <h2 className="vd-h2">The order of the night</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Visions always resolve in this sequence. Steps whose role is not in the
            game are simply skipped.
          </p>
          <ol className="vd-stack" style={{ marginTop: 16, listStyle: "none", padding: 0 }}>
            {NIGHT_ORDER.map((stp) => (
              <li key={stp.step} className="vd-row" style={{ gap: 14 }}>
                <span className="vd-numeral" style={{ fontSize: 18, color: "var(--vd-rule-engraved)", minWidth: 22 }}>
                  {stp.step}
                </span>
                <strong>{stp.label}</strong>
              </li>
            ))}
          </ol>
        </section>

        <section id="lancelot" className="vd-page__section">
          <h2 className="vd-h2">The Lancelots &amp; the loyalty deck</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Enabling Lancelot puts <strong>two</strong> players in the game: one
            Good, one Evil. Neither knows the other. They are the only roles whose
            mission card is <em>forced</em> — the Evil Lancelot must play{" "}
            <strong>Fail</strong> and the Good Lancelot must play{" "}
            <strong>Success</strong>, every single quest they ride on.
          </p>
          <div className="vd-grid3" style={{ marginTop: 20 }}>
            <div className="vd-panel">
              <Swords size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Five cards, two switches</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                The loyalty deck holds 5 cards: 2 switch allegiance, 3 do nothing.
                One is drawn at the start of every round from the{" "}
                <strong>third</strong> onward.
              </p>
            </div>
            <div className="vd-panel">
              <Eye size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>A switch flips both</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                When a switch is drawn, both Lancelots trade sides — and their
                forced mission cards trade with them. The draw is public; who
                switched is not a secret, but what it means for the table is.
              </p>
            </div>
            <div className="vd-panel">
              <EyeOff size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Merlin's vision does not update</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                Merlin saw the Evil Lancelot on night one and still reads them as
                Evil afterwards, even once they have turned Good. Guinevere has the
                same problem from the other direction: she knows <em>who</em> the
                Lancelots are and never which side either is on.
              </p>
            </div>
          </div>
        </section>

        <section id="expansions" className="vd-page__section">
          <h2 className="vd-h2">Expansions</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Each is an independent host toggle. Every world renames them — the
            rules below are the same underneath.
          </p>
          <div className="vd-grid3" style={{ marginTop: 20 }}>
            <div className="vd-panel">
              <Eye size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Lady of the Lake</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                Needs <strong>{LADY_MIN_PLAYERS}+ players</strong>. The token
                starts with the player to the first leader's right. After quests 2,
                3 and 4 the holder picks someone, learns their{" "}
                <strong>true current allegiance</strong> — Lancelot switches
                included — and then passes the token to that person. Anyone who has
                ever held the token can never be examined.
              </p>
            </div>
            <div className="vd-panel">
              <Swords size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Excalibur</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                When the leader proposes a party they must also hand Excalibur to
                one party member other than themselves. After every mission card is
                in, the holder may turn <strong>one</strong> companion's card to its
                opposite. The table learns <em>who</em> was struck; only the holder
                and the target ever learn what the card had been.
              </p>
            </div>
            <div className="vd-panel">
              <ScrollText size={18} color="var(--vd-brass)" />
              <h3 style={{ font: "500 15px/1.3 var(--vd-display)", margin: "8px 0" }}>Plot cards</h3>
              <p className="vd-voice" style={{ margin: 0 }}>
                At the start of each round the leader deals{" "}
                <strong>{plotCardsPerRound(players)}</strong> card
                {plotCardsPerRound(players) === 1 ? "" : "s"} at {players} players
                — face down, never to themselves. Who holds how many is public;
                which cards they are is not.
              </p>
            </div>
          </div>

          <div className="vd-rowlist vd-rowlist--3col" style={{ marginTop: 20 }}>
            <div className="vd-rowlist__head">
              <span>Plot card</span><span /><span>What it does</span>
            </div>
            {Object.values(PLOT_CARDS).map((c) => (
              <div key={c.id} className="vd-rowlist__row">
                <span>{c.name}</span>
                <span style={{ color: "var(--vd-ink-dim)" }}>{c.desc}</span>
                <span className="vd-label vd-label--dim">
                  {c.kind === "instant" ? "resolves at once" : c.kind === "effect" ? "lasts all game" : `play during ${c.window}`}
                </span>
              </div>
            ))}
          </div>
          <p className="vd-voice" style={{ marginTop: 16 }}>
            <strong>Ambush</strong> is the one plot card that leaves no public
            trace — the peek is never announced, and only the player who used it
            ever sees the result. Everything else appears in the plots log.
          </p>
        </section>

        <section id="roles" className="vd-page__section">
          <h2 className="vd-h2">Base characters (Medieval)</h2>
          <div className="vd-grid2" style={{ marginTop: 16 }}>
            {roster.map(({ id, base }) => (
              <div key={id} className={`vd-panel ${base.team === "evil" ? "vd-panel--danger" : ""}`}>
                <div className="vd-row" style={{ marginBottom: 6 }}>
                  {base.team === "good" ? <Sun size={16} color="var(--vd-brass)" /> : <Flame size={16} color="var(--vd-red-ink)" />}
                  <strong style={{ flex: 1 }}>{base.name}</strong>
                  <span className="vd-label vd-label--dim">{base.team === "good" ? "Good" : "Evil"}</span>
                </div>
                <p className="vd-voice" style={{ margin: "0 0 8px" }}>{base.desc}</p>
                {id === "merlin" || id === "assassin" ? (
                  <span className="vd-label vd-label--brass">Always in play</span>
                ) : id === "servant" || id === "minion" ? (
                  <span className="vd-label vd-label--dim">Fills remaining seats</span>
                ) : PAIRED[id] ? (
                  <span className="vd-label vd-label--dim">Optional — {PAIRED[id]}</span>
                ) : (
                  <span className="vd-label vd-label--dim">Optional — host toggle</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="themes" className="vd-page__section">
          <h2 className="vd-h2">The same roles, other worlds</h2>
          <p className="vd-voice" style={{ marginTop: 12 }}>
            Pick a theme. The left name is the rulebook (Medieval). The right name is who you
            will see in that world.
          </p>
          <div className="vd-row" style={{ marginTop: 16 }}>
            {THEME_LIST.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`vd-pill ${t.id === themeId ? "is-on" : ""}`}
                onClick={() => setThemeId(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
          <p className="vd-voice" style={{ margin: "16px 0" }}>
            <strong>{theme.name}</strong> — {theme.goodTeamName} vs {theme.evilTeamName}. {theme.tagline}
          </p>
          <div className="vd-rowlist vd-rowlist--3col">
            <div className="vd-rowlist__head">
              <span>Medieval (rules)</span><span /><span>{theme.name}</span>
            </div>
            {roster.map(({ id, base, themed }) => (
              <div key={id} className="vd-rowlist__row">
                <span>{base.name}</span>
                <span style={{ color: "var(--vd-brass)" }}>{themed.name}</span>
                <span className={base.team === "good" ? "vd-pill vd-pill--brass" : "vd-pill vd-pill--danger"}>
                  {base.team === "good" ? <Check size={11} /> : <X size={11} />} {base.team}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

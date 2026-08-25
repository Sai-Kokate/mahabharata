/* ============================================================================
   How to play — a standalone, animated walkthrough.

   Deliberately independent of the game: no room, no query, no mutation, no
   auth. It reads the same DATA the engine rules on (`PLOT_CARDS`, `NIGHT_ORDER`,
   `TEAM_COUNTS`, the theme's role list) so the page cannot promise a rule the
   server disagrees with — but it never runs any of it. That keeps this page
   working while the engine is being changed underneath it, and means a broken
   game never takes the instructions down with it.

   Three registers, in order of how people actually learn:
     1. Watch a round happen.        the Stage — animated, steppable scenarios
     2. Meet the cast.               who sees whom on the first night
     3. Look things up.              expansions and the nine plot cards
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  ArrowRight, Eye, EyeOff, Flame, Moon, ScrollText, Sparkles, Sun, Swords,
  Users, Zap,
} from "lucide-react";
import { THEMES } from "../convex/themes";
import {
  MAX_REJECTS, NIGHT_ORDER, PLOT_CARDS, TEAM_COUNTS, QUEST_SIZES,
  doubleFailQuests, plotCardsPerRound, LADY_MIN_PLAYERS,
} from "../convex/logic";
import { Stage } from "./learn/Stage";
import { SCENARIOS, SCENARIO_GROUPS } from "./learn/scenarios";
import "./learn.css";

const BASE = THEMES.medieval;

/** Good first, evil after — the order the night itself runs in. */
const CAST_ORDER = [
  "merlin", "percival", "guinevere", "tristan", "isolde", "lancelot_good", "servant",
  "assassin", "morgana", "mordred", "oberon", "lancelot_evil", "minion",
] as const;

/** What each role is actually shown on the first night, in one line. */
const SIGHT: Record<string, string> = {
  merlin: "Every traitor except Mordred",
  percival: "Merlin and Morgana — but not which is which",
  guinevere: "Both Lancelots, never their sides",
  tristan: "Isolde, and only Isolde",
  isolde: "Tristan, and only Tristan",
  lancelot_good: "Nothing. And your card is forced to Succeed",
  servant: "Nothing at all. You have only the argument",
  assassin: "The other traitors — and the last strike is yours",
  morgana: "The other traitors. You appear to Percival as Merlin",
  mordred: "The other traitors. Merlin cannot see you",
  oberon: "Nothing. No traitor knows you, and you know none",
  lancelot_evil: "Nothing. And your card is forced to Fail",
  minion: "The other traitors",
};

export default function LearnPage() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];

  return (
    <div className="lx">
      <header className="lx-head">
        <a className="rules-back" href="/">← Decevia</a>
        <h1 className="lx-title">How to play</h1>
        <p className="lx-lede">
          Five to eighteen people sit down. Most are loyal. A few are lying, and
          they know each other. Five quests decide it — and every quest is
          chosen by the table, out loud, with no proof available to anybody.
        </p>
        <div className="lx-jump">
          <a href="#watch"><Users size={12} /> Watch a round</a>
          <a href="#cast"><Moon size={12} /> The cast</a>
          <a href="#expansions"><Sparkles size={12} /> Expansions</a>
          <a href="#plots"><Zap size={12} /> Plot cards</a>
        </div>
      </header>

      {/* ------------------------------------------------------ the stage -- */}
      <Section
        id="watch"
        eyebrow="Watch it happen"
        title="A round, and the ways it can go"
        lede="Pick a scenario. It plays itself — or step through it a beat at a time."
      >
        <div className="lx-picker">
          {SCENARIO_GROUPS.map((g) => (
            <div key={g.id} className="lx-picker__group">
              <span className="vd-label vd-label--dim">{g.label}</span>
              <div className="lx-picker__row">
                {SCENARIOS.filter((s) => s.group === g.id).map((s) => (
                  <button
                    key={s.id}
                    className={`lx-pick ${s.id === scenarioId ? "is-on" : ""}`}
                    onClick={() => setScenarioId(s.id)}
                  >
                    <span className="lx-pick__name">{s.name}</span>
                    <span className="lx-pick__blurb">{s.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Stage scenario={scenario} />
      </Section>

      {/* ------------------------------------------------------ the table -- */}
      <Section
        id="table"
        eyebrow="Before anything else"
        title="How the table splits"
        lede="The traitor count is fixed by how many sit down, and so are the party sizes."
      >
        <div className="lx-matrix" role="table">
          <div className="lx-matrix__head" role="row">
            <span>Players</span><span>Loyal</span><span>Traitors</span>
            <span>Quest sizes</span><span>Needs 2 fails</span>
          </div>
          {[5, 6, 7, 8, 9, 10, 12, 15, 18].map((n) => {
            const [good, evil] = TEAM_COUNTS[n];
            const dbl = doubleFailQuests(n).map((q) => q + 1);
            return (
              <div className="lx-matrix__row" role="row" key={n}>
                <span className="lx-matrix__n">{n}</span>
                <span><Sun size={11} /> {good}</span>
                <span className="is-evil"><Flame size={11} /> {evil}</span>
                <span className="lx-matrix__sizes">{QUEST_SIZES[n].join(" · ")}</span>
                <span>{dbl.length ? `quest ${dbl.join(" & ")}` : "—"}</span>
              </div>
            );
          })}
        </div>
        <p className="lx-foot">
          Three quests held and the realm stands. Three lost and it falls — and
          so does {MAX_REJECTS} parties turned away in a row, without a single
          quest being ridden.
        </p>
      </Section>

      {/* ------------------------------------------------------- the night -- */}
      <Section
        id="cast"
        eyebrow="The first night"
        title="Who is shown what"
        lede="Everything anyone knows for certain comes from this one minute. After it, only talk."
      >
        <ol className="lx-night">
          {NIGHT_ORDER.map((s) => (
            <li key={s.step} className="lx-night__step">
              <span className="lx-night__n">{s.step}</span>
              <span className="lx-night__label">{s.label}</span>
            </li>
          ))}
        </ol>

        <div className="lx-cast">
          {CAST_ORDER.map((id) => {
            const role = BASE.roles.find((r) => r.id === id);
            if (!role) return null;
            const evil = role.team === "evil";
            const sight = SIGHT[id] ?? "";
            const blind = sight.startsWith("Nothing");
            return (
              <article key={id} className={`lx-role ${evil ? "is-evil" : ""}`}>
                <header>
                  {evil ? <Flame size={13} /> : <Sun size={13} />}
                  <h3>{role.name}</h3>
                </header>
                <p className="lx-role__desc">{role.desc}</p>
                <div className="lx-role__sees">
                  {blind ? <EyeOff size={12} /> : <Eye size={12} />}
                  <span>{sight}</span>
                </div>
              </article>
            );
          })}
        </div>
        <p className="lx-foot">
          Every world renames these. The abilities never change — Krishna sees
          exactly what Merlin sees.
        </p>
      </Section>

      {/* -------------------------------------------------- the expansions -- */}
      <Section
        id="expansions"
        eyebrow="Three ways to complicate it"
        title="The expansions"
        lede="Each is a separate switch. Turn on none of them and you have the printed game."
      >
        <div className="lx-cards3">
          <Feature
            icon={<Eye size={18} />}
            name="Lady of the Lake"
            need={`${LADY_MIN_PLAYERS}+ players`}
            beats={[
              "After quests 2, 3 and 4, the holder learns one player's true allegiance.",
              "Only the holder is told — and they are free to lie about it.",
              "The token then passes to the person they examined.",
              "Anyone who has held it can never be examined.",
            ]}
          />
          <Feature
            icon={<Swords size={18} />}
            name="Excalibur"
            need="any size"
            beats={[
              "The leader arms one rider — never themselves — when naming the party.",
              "Once every card is in, the bearer may flip one other rider's card.",
              "The table sees who was struck; only those two learn what it had been.",
              "It can save a quest or sink a clean one.",
            ]}
          />
          <Feature
            icon={<Sparkles size={18} />}
            name="The Lancelots"
            need="any size"
            beats={[
              "One loyal, one fallen. Neither knows the other.",
              "Their card is forced: the fallen must Fail, the loyal must Succeed.",
              "From round 3 a loyalty card is drawn — two of five trade their sides.",
              "Merlin's vision was a snapshot, so a switched Lancelot still reads as evil.",
            ]}
          />
        </div>
      </Section>

      {/* -------------------------------------------------------- the plots -- */}
      <Section
        id="plots"
        eyebrow="Nine cards"
        title="Plot cards"
        lede={`The leader deals ${plotCardsPerRound(6)} to ${plotCardsPerRound(10)} face-down cards each round, depending on the table. Who holds how many is public; which cards is not.`}
      >
        {(["instant", "usable", "effect"] as const).map((kind) => {
          const cards = Object.values(PLOT_CARDS).filter((c) => c.kind === kind);
          if (!cards.length) return null;
          return (
            <div key={kind} className="lx-plotgroup">
              <span className="vd-label">
                {kind === "instant" && "Resolves the moment it lands"}
                {kind === "usable" && "Held for one specific window"}
                {kind === "effect" && "Lasts the whole game"}
              </span>
              <div className="lx-plots">
                {cards.map((c) => (
                  <article key={c.id} className={`lx-plot is-${kind}`}>
                    <h3>{c.name}</h3>
                    <p>{c.desc}</p>
                    {c.window !== "none" && (
                      <span className="lx-plot__when">played at: {c.window}</span>
                    )}
                  </article>
                ))}
              </div>
            </div>
          );
        })}
        <p className="lx-foot">
          Ambush is the only one that leaves no public trace — nobody is told it
          happened.
        </p>
      </Section>

      <footer className="lx-end">
        <a className="lp-act lp-act--primary" href="/play">
          Convene a council <ArrowRight size={16} />
        </a>
        <a className="vd-textbtn" href="/rules">
          <ScrollText size={11} /> The full laws
        </a>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ parts -- */

/** A section that rises into place the first time it is scrolled to. */
function Section({
  id, eyebrow, title, lede, children,
}: {
  id: string; eyebrow: string; title: string; lede: string;
  children: React.ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { rootMargin: "-80px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".lx-section__head > *", {
        y: 14, opacity: 0, stagger: 0.08, duration: 0.5, ease: "power3.out",
      });
    }, root);
    return () => ctx.revert();
  }, [seen]);

  return (
    <section className={`lx-section ${seen ? "is-in" : ""}`} id={id} ref={root}>
      <div className="lx-section__head">
        <span className="vd-label vd-label--brass">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{lede}</p>
      </div>
      {children}
    </section>
  );
}

function Feature({
  icon, name, need, beats,
}: { icon: React.ReactNode; name: string; need: string; beats: string[] }) {
  return (
    <article className="lx-feature">
      <header>
        {icon}
        <h3>{name}</h3>
        <span className="vd-label vd-label--dim">{need}</span>
      </header>
      <ol>
        {beats.map((b, i) => (
          <li key={i}><span>{i + 1}</span>{b}</li>
        ))}
      </ol>
    </article>
  );
}

/* ============================================================================
   Prerender the public pages to real HTML, after `vite build`.

   WHY, precisely — because the reason matters for what this can and cannot do:

   Googlebot does run JavaScript, so the app was already indexable. What it was
   not was indexable *cheaply*: rendering is queued and can lag crawling by days,
   and every route served byte-identical HTML, so Google saw one title and one
   description for six URLs. Everything that is not Google — Bing's older paths,
   and every social scraper that builds a link preview — runs no JS at all and
   saw an empty <div id="root">.

   This writes a real document per public route: its own title, description,
   canonical and Open Graph tags, and body copy a crawler can read without
   executing anything. React mounts over it for humans, because `createRoot()`
   replaces the container's children rather than hydrating them — so this
   content never has to match what React renders, and there is no hydration
   mismatch to manage.

   It will not make the site rank. Ranking is content, links and relevance.
   What this removes is the mechanical reason a crawler would index the site
   badly or not at all.

   No dependencies: string templating over the built index.html.
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

/** Change this in one place if the domain changes. */
const ORIGIN = process.env.SITE_ORIGIN ?? "https://www.decevia.space";

/**
 * The crawlable copy, per route.
 *
 * Hand-authored rather than rendered from the components, deliberately: the
 * pages depend on Convex hooks and CSS imports that do not survive a bare node
 * render, and the build must not gain a bundling step it can fail on. The cost
 * is that this can drift from the app — so keep it to the durable claims a
 * page makes, not the details that change.
 */
const PAGES = [
  {
    path: "/",
    file: "index.html",
    title: "Decevia — Social deduction for 5 to 18 players",
    description:
      "Convene a council of 5 to 18. Some of you are sworn to the realm and some of you are lying about it. Free online social deduction across five worlds — no download, no account, just a four-letter code.",
    body: `
      <h1>Decevia — where friends become foes</h1>
      <p>
        A council of five to eighteen players. Most are sworn to the realm.
        A few are lying about it, and they know each other. Five quests decide
        who wins, and every party that rides is chosen by the table, out loud,
        with no proof available to anybody.
      </p>
      <p>
        Free to play in the browser. No download and no account: one player
        convenes a council, shares the four-letter code, and everyone else joins
        from their own phone.
      </p>
      <h2>What a game looks like</h2>
      <ul>
        <li>Five to eighteen players, on any plan or none.</li>
        <li>A hidden split: loyal servants against traitors who know one another.</li>
        <li>Five quests. Three held and the realm stands; three lost and it falls.</li>
        <li>Five parties turned away in a row also loses it, without a quest being ridden.</li>
        <li>Win three quests and the Assassin still gets one guess at Merlin.</li>
      </ul>
      <h2>Five worlds</h2>
      <p>
        The same engine wearing different faces: Indian Mythology (Pandavas and
        Kauravas), the Medieval Kingdom of Arthur and Mordred, Egyptian Gods,
        Greek Mythology, and the Maratha Empire.
      </p>
      <p>
        <a href="/learn">How to play</a> · <a href="/rules">The full rules</a>
      </p>`,
  },
  {
    path: "/learn",
    file: "learn/index.html",
    title: "How to play Decevia — an animated walkthrough",
    description:
      "An animated walkthrough of social deduction: a round from start to finish, every character and what they see at night, the three expansions, and all nine plot cards.",
    body: `
      <h1>How to play</h1>
      <p>
        An animated walkthrough. Watch a round happen a beat at a time, then
        meet the cast and look up the expansions.
      </p>
      <h2>A round, start to finish</h2>
      <p>
        The leader names a party. The whole table votes on it — not just the
        people riding. If it passes, only the riders play a card, face down.
        One Fail sinks most quests. The cards are shuffled before they are
        turned, so nobody learns who played what. That argument is the game.
      </p>
      <h2>The first night</h2>
      <p>
        Everything anyone knows for certain comes from one minute at the start:
        the traitors learn each other, Merlin sees the traitors but not Mordred,
        Percival sees Merlin and Morgana without being told which is which, and
        the loyal servants are shown nothing at all.
      </p>
      <h2>The expansions</h2>
      <ul>
        <li><strong>Lady of the Lake</strong> — at seven or more players, the holder learns one player's true allegiance, then passes the token to them.</li>
        <li><strong>Excalibur</strong> — the leader arms one rider, who may flip another rider's card after the fact.</li>
        <li><strong>The Lancelots</strong> — one loyal, one fallen, their cards forced, and their sides able to trade mid-game.</li>
        <li><strong>Plot cards</strong> — nine cards dealt face down each round, from seizing leadership to secretly examining a played card.</li>
      </ul>
      <p><a href="/">Play Decevia</a> · <a href="/rules">The full rules</a></p>`,
  },
  {
    path: "/rules",
    file: "rules/index.html",
    title: "The rules of Decevia — team sizes, roles and expansions",
    description:
      "Team sizes and quest sizes for 5 to 18 players, every role's night knowledge, the two-fail quest, the five-rejection loss, and the house rules for tables above ten.",
    body: `
      <h1>The rules</h1>
      <h2>The table</h2>
      <p>
        The traitor count is fixed by how many sit down — roughly one in three.
        Quest sizes are fixed too. At seven players or more the fourth quest
        needs two Fails to sink it; above ten, so does the third.
      </p>
      <h2>Winning</h2>
      <p>
        Three quests held and the realm stands — unless the Assassin then names
        Merlin correctly, which takes the game for evil at the last breath.
        Three quests lost, or five parties turned away in a row, and the realm
        falls.
      </p>
      <h2>The roles</h2>
      <p>
        Merlin, Percival, Guinevere, Tristan and Isolde, the loyal Lancelot and
        the loyal servants stand for the realm. The Assassin, Morgana, Mordred,
        Oberon, the fallen Lancelot and the minions stand against it. Every
        world renames them; the abilities never change.
      </p>
      <h2>Above ten players</h2>
      <p>
        Avalon is printed for five to ten. Decevia goes to eighteen, with the
        team split and the quest sizes extrapolated from the printed table's own
        arithmetic rather than invented.
      </p>
      <p><a href="/">Play Decevia</a> · <a href="/learn">How to play</a></p>`,
  },
];

const shell = readFileSync(join(DIST, "index.html"), "utf8");

/** Swap one meta/link value in the built head. */
function setTag(html, pattern, replacement) {
  if (!pattern.test(html)) {
    console.warn(`  ! prerender: no match for ${pattern} — head tag left as built`);
    return html;
  }
  return html.replace(pattern, replacement);
}

let wrote = 0;
for (const page of PAGES) {
  const url = `${ORIGIN}${page.path}`;
  let html = shell;

  html = setTag(html, /<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`);
  html = setTag(
    html,
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${page.description}" />`,
  );
  html = setTag(
    html,
    /<link rel="canonical"[^>]*\/>/,
    `<link rel="canonical" href="${url}" />`,
  );
  html = setTag(
    html,
    /<meta property="og:title"[^>]*\/>/,
    `<meta property="og:title" content="${page.title}" />`,
  );
  html = setTag(
    html,
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${page.description}" />`,
  );
  html = setTag(
    html,
    /<meta property="og:url"[^>]*\/>/,
    `<meta property="og:url" content="${url}" />`,
  );

  // The content itself. React replaces these children on mount, so this is
  // written for crawlers and for anyone whose JavaScript never arrives.
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"><div class="prerender">${page.body.trim()}</div></div>`,
  );

  const out = join(DIST, page.file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`  prerendered ${page.path.padEnd(8)} -> dist/${page.file}`);
  wrote++;
}

console.log(`✓ prerendered ${wrote} page${wrote === 1 ? "" : "s"} for ${ORIGIN}`);

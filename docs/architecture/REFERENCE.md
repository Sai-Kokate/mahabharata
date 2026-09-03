# Quick Reference

## File Index

### Backend (`convex/`)

| File | Lines | Purpose |
|---|---|---|
| `schema.ts` | 346 | Every table + index. See [DATABASE.md](./DATABASE.md). |
| `avalon.ts` | 2031 | The game itself: every query/mutation, the phase state machine, `getRoom`. See [API.md](./API.md), [FLOWS.md](./FLOWS.md). |
| `logic.ts` | 766 | Pure rules shared verbatim by client and server: team/quest sizing, role dealing, seating, plot/loyalty decks, setup validation, name normalization. No `ctx`, no I/O. |
| `themes.ts` | 1143 | Five `ThemeConfig` world definitions (only `medieval`/`india` currently in `PLAYABLE_THEME_IDS`). |
| `entitlements.ts` | 181 | Identity (`signedInUser`, `requireUser`), admin check (`isAdminEmail`, `requireAdmin`), premium computation (`entitlementForEmail`, `roomEntitlement`), pricing (`pricing`, `priceFor`). |
| `billing.ts` | 490 | Subscriptions, seats, orders; buyer + admin queries/mutations. |
| `crons.ts` | 20 | One job: `sweepAbandonedRooms` every 6 hours. |
| `auth.ts` | 47 | Convex Auth wiring — Password provider only, welcome-email trigger. |
| `passwordReset.ts` | 59 | The 6-digit reset-code `Email()` provider. |
| `email.ts` | 180 | Resend over plain `fetch`; both email templates. |
| `auth.config.ts` | 10 | JWT issuer config. |
| `http.ts` | 9 | Mounts `/api/auth/*`. |
| `_generated/ai/guidelines.md` | — | **Mandatory reading before touching any `convex/*` file** (per `CLAUDE.md`) — Convex API conventions this project follows. |

### Frontend (`src/`)

| File | Lines | Purpose |
|---|---|---|
| `main.tsx` | 163 | Providers, route table, per-route `<title>`/description. |
| `router.tsx` | 104 | `pushState`/`popstate`/click-interception router, no dependency. |
| `auth.ts` | ~190 | The ONLY file naming the auth vendor; provider-neutral `useAuth()` hook. |
| `App.tsx` | 576 | The gate (convene/join/rejoin), room state, every `TableActions` implementation. |
| `LandingPage.tsx` | 256 | Front door. |
| `SignIn.tsx` | 251 | Sign in / sign up / password reset (4-mode card). |
| `RulesPage.tsx` | 570 | The rulebook, engine-data-driven. |
| `UpgradePage.tsx` | 429 | Plans, UPI QR, seat editor, order history. |
| `AdminPage.tsx` | 543 | Approvals, subscriptions, users, manual grants. |
| `CouncilSeal.tsx` | 124 | The seat-ring renderer, 5–18 seats. |
| `RevealCeremony.tsx` | 359 | Vote/quest "unveil" animation (GSAP), queued and replay-safe. |
| `TableParts.tsx` | 250 | Clock fuse, quest ladder, rejection track, chronicle, `Plate`. |
| `sigils.tsx` | 183 | Deterministic heraldic marks from `playerId` (FNV-1a hash). |
| `LearnPage.tsx` | 345 | Lazy-loaded, standalone walkthrough (zero Convex dependency). |
| `learn/scenarios.ts` | 307 | Pure data: 6 scenarios, `Beat` type. |
| `learn/Stage.tsx` | 215 | Generic beat renderer — no scenario-specific code. |
| `table/index.tsx` | 118 | Phase router + `TableActions` interface. |
| `table/types.ts` | 92 | `Room` type derived from `getRoom`'s return type. |
| `table/TableShell.tsx` | 350 | Board chrome shared by every phase screen. |
| `table/Parts.tsx` | 151 | `QuestColumn`, `ChronicleColumn`, `SeatRing`. |
| `table/LobbyScreen.tsx` | 423 | Seats, watchers, host setup. |
| `table/NightScreen.tsx` | 166 | Role card + night-order script. |
| `table/RoleReveal.tsx` | 122 | `useHold()` hook + persistent role-check widget. |
| `table/ProposeScreen.tsx` | 176 | Team selection; exports `<Riders>`. |
| `table/VoteScreen.tsx` | 141 | Voting; exports `<KingReturnsScreen>`. |
| `table/QuestScreen.tsx` | 236 | Card play; exports `<ExcaliburScreen>`, `<QuestResultPlate>`. |
| `table/LadyScreen.tsx` | 65 | Lady of the Lake inspection. |
| `table/AssassinScreen.tsx` | 136 | The final strike. |
| `table/ReckoningScreen.tsx` | 142 | Endgame reveal. |
| `table/PlotHand.tsx` | 208 | Plot card dealing/playing UI. |

### Build / infra

| File | Purpose |
|---|---|
| `vite.config.ts` | Minimal — `@vitejs/plugin-react` only. |
| `vercel.json` | Build command, SPA rewrite, asset caching. |
| `scripts/prerender.mjs` | Writes crawlable HTML for `/`, `/learn`, `/rules` after `vite build`. |
| `index.html` | Default meta tags (OG, Twitter card, JSON-LD, favicons). |
| `tsconfig.json` | Strict TypeScript, `include: ["src", "convex"]`. |

## Environment Variable Reference

See [DEPLOYMENT.md §4](./DEPLOYMENT.md#4-environment-variables) for the full table with defaults
and failure modes. Quick list: `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`, `ADMIN_EMAILS`,
`UPI_VPA`, `UPI_PAYEE_NAME`, `PAYMENT_QR_URL`, `PRICE_MONTHLY_INR`, `PRICE_YEARLY_INR`,
`SUBSCRIPTION_SEATS`, `JWKS`, `JWT_PRIVATE_KEY`, `CONVEX_SITE_URL` (auto), plus client-side
`VITE_CONVEX_URL` / `VITE_CONVEX_SITE_URL` in `.env.local`.

## Room Phase Reference

`lobby → reveal → (plot →) propose → vote → (kingReturns →) quest → (excalibur →) (lady →) →
[loop propose..lady per round] → assassin → end`. Full transition table with triggering
mutations: [FLOWS.md](./FLOWS.md) and the game-engine section of
[OVERVIEW.md](./OVERVIEW.md#5-the-convex-request-lifecycle-reactive-querymutation-cycle).

## Common Commands

```bash
npm install                 # install dependencies
npx convex dev               # start the Convex dev deployment (run first, leave running)
npm run dev                  # start the Vite dev server
npm run build                 # tsc -b && vite build && node scripts/prerender.mjs
npm run preview               # preview the production build locally
npx convex deploy             # deploy the Convex backend to production
npx convex env set NAME value [--prod]   # set a deployment environment variable
npx @convex-dev/auth [--prod] # (re)generate JWKS/JWT_PRIVATE_KEY for a deployment
```

## Documentation Set

| Doc | Covers |
|---|---|
| [OVERVIEW.md](./OVERVIEW.md) | Executive summary, stack, architecture pattern, bootstrap, routing, auth, the live 2-vs-5-worlds discrepancy. |
| [FLOWS.md](./FLOWS.md) | 10 end-to-end sequence diagrams: room lifecycle, password reset, propose/vote/reject, quest+Excalibur, Lady of the Lake, Ambush, assassination, purchase→approval, disconnect/rejoin, room sweep. |
| [DATABASE.md](./DATABASE.md) | ER diagram, every table/index, schema design rationale. |
| [API.md](./API.md) | Every Convex query/mutation, grouped by module, with args and line numbers. |
| [SECURITY.md](./SECURITY.md) | The server-authoritative trust model — how `getRoom` hides secrets per viewer, auth security, payment/admin trust boundary. |
| [COMPONENTS.md](./COMPONENTS.md) | Frontend component catalog, phase routing, shared primitives. |
| [PATTERNS.md](./PATTERNS.md) | How-to guides (new mutation, new rule, new theme, new plot card, new timed phase) and anti-patterns already fixed once in this codebase. |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Build pipeline, SEO/prerendering, environment variables, ops. |

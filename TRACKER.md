# Legacy Sweep Stakes — Change Tracker

All changes made by Claude are logged here in reverse chronological order.

---

## 2026-06-29 — All 9 Tasks Complete ✓

### Task 9: Cleanup + Push (final)
- Deleted `js/leaderboard.js` — file unused in Legacy deployment (no leaderboard tab)
- Fixed stale copy in `js/admin.js` `renderResetPanel` — removed "and the tier/team configuration" (no tiers in this deployment)
- Confirmed `onTabActivated()` in `js/app.js` has no leaderboard case (already absent)
- Confirmed `index.html` has no leaderboard tab button or div (already absent)
- Pushed all changes to `https://github.com/usama147/legacy-sweep-stakes.git`

### All 9 Tasks Summary — COMPLETE

| Task | File | Status |
|---|---|---|
| 1 | `js/config.js` | ✅ Flat 31-team KNOCKOUT_TEAMS + BIG_TEAM_NAMES + placeholder Firebase creds |
| 2 | `js/draw.js` | ✅ Flat draw, big-team priority, assigns `team` not `teams` per participant |
| 3 | `index.html` | ✅ App title → "Legacy Sweep Stakes", Legacy SVG logo |
| 4 | `css/styles.css` | ✅ Full Legacy brand palette (dark green bg, bright green accent, cream text) |
| 5 | `js/pool.js` | ✅ 1 team chip per card using `p.team`, no tier colour coding |
| 6 | `js/pot.js` | ✅ 1 team per participant in standings + elimination panel, no tier refs |
| 7 | `js/players.js` | ✅ 1 team per participant, simplified detail view, match history from 2026-06-28 |
| 8 | `js/admin.js` | ✅ No tier editor, max 30 participants, simplified draw validation |
| 9 | Cleanup + push | ✅ Deleted leaderboard.js, fixed stale copy, pushed to remote |

### Next Step — Firebase Setup Required
Firebase credentials in `js/config.js` use `REPLACE_WITH_*` placeholders intentionally.
To activate the app:
1. Go to console.firebase.google.com → Create project
2. Enable Email/Password Auth (Authentication → Sign-in method)
3. Enable Firestore (Firestore Database → Create database, start in production mode)
4. Go to Project Settings → Your apps → Add web app → copy the config object
5. Paste credentials into `js/config.js` replacing the `REPLACE_WITH_*` placeholders
6. Commit and push again

---

### Repo Initialised
- Copied from `fifa-pot` repo as the starting base
- Fresh git history initialised, remote set to `https://github.com/usama147/legacy-sweep-stakes.git`

### Docs Created
- `/CLAUDE.md` — project context file (carried over from fifa-pot, will be updated as changes land)
- `/DOCUMENTATION.md` — full technical documentation (carried over)
- `/docs/superpowers/specs/2026-06-29-legacy-sweep-stakes-design.md` — design spec for this deployment
- `/docs/superpowers/plans/2026-06-29-legacy-sweep-stakes.md` — full 9-task implementation plan

### Implementation Plan Summary
9 tasks defined, ready to execute. Status: **Awaiting execution approval.**

| Task | File | Change |
|---|---|---|
| 1 | `js/config.js` | Replace DEFAULT_TIERS with flat 31-team KNOCKOUT_TEAMS list + BIG_TEAM_NAMES set; placeholder Firebase credentials |
| 2 | `js/draw.js` | Rewrite — flat draw, big-team priority (never unowned), assigns `team` not `teams` per participant |
| 3 | `index.html` | App title → "Legacy Sweep Stakes", Legacy SVG logo, remove unused standings tab div |
| 4 | `css/styles.css` | Full Legacy brand palette — dark forest green bg, bright green accent, cream text |
| 5 | `js/pool.js` | 1 team chip per card using `p.team`, no tier colour coding |
| 6 | `js/pot.js` | 1 team per participant in standings + elimination panel, no tier refs |
| 7 | `js/players.js` | 1 team per participant, simplified detail view, match history from 2026-06-28 |
| 8 | `js/admin.js` | Remove tier editor, bump max 16 → 30, simplify draw validation + call |
| 9 | Cleanup + push | Delete `leaderboard.js`, push to remote, prompt Firebase setup |

### Firestore Schema Change (critical)
Old: `participants/{id}.teams = { big: {name,flag}, smaller: {name,flag}, underdog: {name,flag} }`
New: `participants/{id}.team = { name, flag }`

### Files Unchanged by This Deployment
`js/matches.js`, `js/bracket.js`, `js/standings.js`, `js/elimination.js`, `js/auth.js`, `js/presence.js`, `js/app.js`, `data/knockout-bracket.json`

### Firebase
- New Firebase project required — **not yet set up**
- Placeholder credentials in `js/config.js` with `REPLACE_WITH_*` keys
- To set up: Firebase Console → new project → enable Email/Password Auth + Firestore → copy web app config into `js/config.js`

---

## Context: What Existed Before Any Claude Changes (pulled from GitHub)

The following features were already built and present in the repo at the time of the first Claude session:

### Core App (original build)
- Firebase Auth (email/password login, signup, password reset)
- Fisher-Yates draw across 3 tiers (Big / Smaller / Underdogs), 16 teams each, max 16 participants
- Pool tab — participant cards with 3 team chips each
- Matches tab — live/results/upcoming match cards from ESPN Scoreboard API (60s polling)
- Group Stage tab (`standings.js`) — ESPN group standings tables, 12 groups, 120s polling, admin right-click to eliminate
- Pot tab — animated pot total, payout projections (60/25/15), standings, admin elimination panel
- Players tab — per-participant cards with match history
- Admin tab — participant management, tier editor, draw button, payment tracker, reset (Danger Zone)
- Presence indicator — Firestore heartbeat (30s interval, 90s stale threshold)
- GSAP animations throughout

### Knockout Bracket Update (pulled 2026-06-29, built separately)
- **`js/bracket.js`** — new 791-line module. Full knockout bracket with:
  - Mobile: vertical list grouped by round (R32 → R16 → QF → SF → 3rd → Final)
  - Desktop: two-sided horizontal bracket tree with SVG connector lines, detail modals
  - Bracket positioning via hardcoded R32 slot arrays (`R32_L`, `R32_R`) and recursive event name resolution
  - Fetches ESPN scoreboard for date range `2026-06-28` → `2026-07-20`
  - Pool owner tags shown on each bracket slot
  - 60s polling
- **`js/elimination.js`** — new 155-line module. Auto-detects eliminations from ESPN knockout data:
  - Phase 1: group-stage exits via inverse method (teams not in R32 = eliminated)
  - Phase 2: knockout losers from completed matches via `competitor.winner === false`
  - 60s in-memory cache shared across all importing modules
  - `isTeamEliminated(teamName, eliminatedSet)` exported for use in pool.js, players.js, pot.js
- **`data/knockout-bracket.json`** — static reference data: M73–M104 match numbers, venues, `feedsInto` links, `bracketOrder` for left/right visual halves
- **`docs/superpowers/specs/2026-06-29-knockout-bracket-design.md`** — design spec for the bracket feature
- **`index.html`** — Groups tab button renamed to Bracket, `#tab-bracket` div added
- **`js/app.js`** — bracket case added to `onTabActivated()`, dynamic import of `bracket.js`
- **`js/pool.js`**, **`js/pot.js`**, **`js/players.js`**, **`js/leaderboard.js`** — updated to merge Firestore + ESPN eliminations via `elimination.js`
- **`css/styles.css`** — bracket-specific styles added (~397 new lines): desktop tree layout, mobile list, SVG connectors, slot cards, detail modals

---

## Reference — What Was Inherited From FifaPot Base

### Second Deployment — Legacy Sweep Stakes (Legacy Fiduciary Services)
Status: **Implementation plan written — awaiting execution**

---

#### Client Details
- **Company**: Legacy Fiduciary Services (legacyfiduciaryservices.co.za)
- **App name**: Legacy Sweep Stakes
- **Hosting**: Vercel (new GitHub repo, separate from fifa-pot)
- **Firebase**: New project required — set up when implementation is ready to begin
- **Admin email**: `usama@brandesign.co.za` (testing only — real client admin email TBD)

---

#### Confirmed Requirements

**Participants & Draw**
- 30 seats maximum, 25–26 expected to participate
- 1 team per participant (flat draw — no tiers in UI)
- Team pool: all 31 R32 knockout teams (fixed list — South Africa already excluded as eliminated)
  - 14 big teams (must ALL be assigned — can never be the unowned slot)
  - 17 smaller/underdog teams (16 get assigned, 1 goes unowned)
- Draw algorithm:
  1. Separate 14 big + 17 non-big teams
  2. Randomly remove 1 non-big team (unowned slot)
  3. Shuffle remaining 30 teams via Fisher-Yates
  4. Assign 1 team per participant
- Draw triggered manually by admin once all players have signed up

**Big teams confirmed still in knockout (14 of original 16):**
Argentina, France, Spain, England, Brazil, Portugal, Netherlands, Belgium, Germany, Switzerland, Croatia, Colombia, Morocco, Japan
*(Uruguay and USA were eliminated in group stage)*

**Prize Pool**
- Buy-in: R100 per person
- Payout split: 60% champion / 25% runner-up / 15% third place (unchanged)

**Features — removed vs kept**

| Feature | Status |
|---|---|
| Tier system (Big/Smaller/Underdog) | **Removed from UI** — used only internally for draw priority |
| 3 teams per participant | **Removed** — 1 team per participant |
| Leaderboard tab | **Removed** |
| Group Stage standings tab | **Already removed** (bracket replaced it in original) |
| Pool tab | **Kept** — simplified (1 team chip per card, no tier colours) |
| Matches tab | **Kept** — unchanged |
| Bracket tab | **Kept** — unchanged |
| Pot tab | **Kept** — same logic, 1 team per participant |
| Players tab | **Kept** — 1 team per participant |
| Admin tab | **Kept** — no tier editor, participant mgmt + draw + payments remain |
| Max participants | **30** (up from 16) |

**Branding & Design**

| Element | Value |
|---|---|
| App name | Legacy Sweep Stakes |
| Logo | SVG from `legacyfiduciaryservices.co.za` |
| Background | `#1a2e1e` (dark forest green, replaces dark blue) |
| Card background | `#243d28` |
| Primary accent | `#99ca3d` (bright green, replaces gold `#F7C520`) |
| Secondary | `#75735a` (olive) |
| Text | `#e8dfc6` (cream, replaces `#EEF2FA`) |
| Font stack | Unchanged (Bebas Neue, IBM Plex Mono, Outfit) |

---

#### Code Changes Required

| What | File | Detail |
|---|---|---|
| Firebase credentials | `config.js` lines 6–14 | Swap to new project |
| Admin email | `config.js` line 20 | New client admin (TBD) |
| App name | `index.html` lines 16–17, 62 | → "Legacy Sweep Stakes" |
| Max participants | `admin.js` lines 69, 94, 159, 204 | 16 → 30 |
| Buy-in | `admin.js` line 41 | R100 (same, but move to config) |
| Team list | `config.js` `DEFAULT_TIERS` | Replace with flat list of 31 knockout teams |
| Draw logic | `draw.js` | Rework: flat draw, big-team priority, 1 team per participant |
| Pool tab | `pool.js` | Remove tier chips, show 1 team per card |
| Pot tab | `pot.js` | Update standings — 1 team per participant |
| Players tab | `players.js` | Update — 1 team per participant |
| Admin tab | `admin.js` | Remove tier editor section |
| Leaderboard | `leaderboard.js` | Remove entirely |
| App tab nav | `app.js`, `index.html` | Remove leaderboard tab |
| CSS theme | `styles.css` | Replace colour variables with Legacy brand palette |
| Logo | `index.html` | Replace FIFAPOT text logo with Legacy SVG |

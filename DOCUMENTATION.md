# FifaPot 2026 - Technical Documentation

A web app for running a FIFA World Cup 2026 sweepstake pool among friends. Participants are assigned random teams across three tiers via a draw, and the app tracks match results, eliminations, and prize payouts throughout the tournament.

---

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (ES modules, no build step)
- **Backend**: Firebase (Auth, Firestore)
- **External APIs**: ESPN Scoreboard API, ESPN Standings API, API-Football (api-sports.io)
- **Animations**: GSAP 3.12.5 (CDN)
- **Fonts**: Bebas Neue, IBM Plex Mono, Outfit (Google Fonts)
- **Hosting**: Static files — no server-side code

---

## File Structure

```
index.html              # Single-page app shell (auth screen + tabbed app)
css/styles.css          # All styles (~1370 lines)
js/
  app.js                # Entry point: auth flow, tab navigation, GSAP transitions
  auth.js               # Firebase Auth: login, signup, logout, password reset
  config.js             # Firebase init, team tiers, team aliases, normalization
  draw.js               # Fisher-Yates draw logic, Firestore batch write
  admin.js              # Admin panel: participants, tiers, draw, payments, reset
  pool.js               # "Pool" tab: participant cards with team chips
  matches.js            # "Matches" tab: live scores, results, upcoming from ESPN
  pot.js                # "Pot" tab: prize pool, payouts, standings, admin elimination controls
  bracket.js            # "Bracket" tab: knockout bracket (mobile list + desktop tree)
  standings.js          # "Group Stage" tab: ESPN group standings tables
  players.js            # "Players" tab: per-participant detail with match history
  elimination.js        # Auto-detect eliminated teams from ESPN knockout data
  presence.js           # Online presence indicator (Firestore heartbeat)
  leaderboard.js        # (Unused) Previously showed goal-based leaderboard
data/
  knockout-bracket.json # Static reference: FIFA match numbers, venues, bracket structure
```

---

## Firebase Configuration

### Project

- Project ID: `fifapot`
- Auth domain: `fifapot.firebaseapp.com`
- Admin email: `usama@brandesign.co.za` (hardcoded in `config.js`)

### Authentication

Email/password auth. On signup, a user profile document is written to the `users` collection. The admin is determined by comparing `user.email === ADMIN_EMAIL`.

### Firestore Collections

#### `users/{uid}`

Created on signup. Used by admin to list registered users for quick-add.

```js
{
  name: "John",
  email: "john@example.com",
  uid: "firebase-uid",
  joinedAt: Timestamp
}
```

#### `pool/main`

Single document holding all pool-wide state.

```js
{
  drawCompleted: false,          // true after admin runs draw
  drawDate: Timestamp | null,    // when draw was run
  buyIn: 100,                    // entry fee in Rands
  tiers: [                       // three tier definitions (editable before draw)
    {
      key: "big",                // tier key used throughout the app
      label: "Big Teams",
      icon: "◈",
      accent: "#F5B432",         // CSS accent color
      dim: "rgba(245,180,50,0.08)",
      border: "rgba(245,180,50,0.25)",
      teams: [
        { name: "Argentina", flag: "🇦🇷" },
        // ... 16 teams per tier
      ]
    },
    // "smaller" and "underdog" tiers follow same shape
  ],
  eliminatedTeams: [             // manually marked eliminations (admin action)
    {
      name: "Turkey",
      flag: "🇹🇷",
      tier: "smaller",
      participantName: "Jane",
      eliminatedAt: "2026-06-25T..."
    }
  ],
  finalStandings: {              // set by admin at end of tournament
    champion:   { teamName, flag, participantName } | null,
    runnerUp:   { teamName, flag, participantName } | null,
    thirdPlace: { teamName, flag, participantName } | null
  }
}
```

#### `pool/main/participants/{id}`

One document per participant (subcollection of `pool/main`).

```js
{
  name: "Paige",
  addedAt: Timestamp,
  drawOrder: 3,                  // display order (1-indexed)
  paid: true,                    // payment status (toggled by admin)
  teams: {                       // assigned after draw
    big:      { name: "France",      flag: "🇫🇷" },
    smaller:  { name: "Canada",      flag: "🇨🇦" },
    underdog: { name: "South Africa", flag: "🇿🇦" }
  }
}
```

#### `presence/{uid}`

Heartbeat documents for online presence indicator.

```js
{
  lastSeen: 1719655200000  // Date.now() timestamp
}
```

Heartbeat interval: 30 seconds. Stale threshold: 90 seconds.

---

## Team Tiers

48 teams split into 3 tiers of 16. Default tier assignments are in `config.js` (`DEFAULT_TIERS`). Admin can move teams between tiers before the draw.

| Tier | Key | Color | Description |
|------|-----|-------|-------------|
| Big Teams | `big` | Gold `#F5B432` | Top-ranked nations |
| Smaller Teams | `smaller` | Silver `#97A6BE` | Mid-tier nations |
| Underdogs | `underdog` | Bronze `#C1773A` | Lower-ranked nations |

Each participant receives exactly one team from each tier via the draw.

---

## The Draw

Implemented in `draw.js`. Uses Fisher-Yates shuffle per tier:

1. Validate each tier has >= N teams (N = number of participants, max 16)
2. Shuffle each tier's team array
3. Assign first N shuffled teams to participants (one per person)
4. Write all assignments + `drawCompleted: true` in a single Firestore batch

The draw is irreversible from the UI (but admin can reset via Danger Zone).

---

## External APIs

### ESPN Scoreboard API

```
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
```

- **Used by**: `matches.js`, `bracket.js`, `players.js`, `leaderboard.js`, `elimination.js`
- **Query**: `?dates=YYYYMMDD-YYYYMMDD` (date range)
- **Polling**: 60-second interval on Matches and Bracket tabs
- **No auth required**

Key response shape:
```js
{
  events: [{
    id: "12345",
    name: "Argentina vs Brazil",
    date: "2026-06-15T18:00Z",
    status: {
      type: { name: "STATUS_FINAL" | "STATUS_IN_PROGRESS" | "STATUS_SCHEDULED" },
      displayClock: "67'",
      type: { shortDetail: "FT" }
    },
    competitions: [{
      competitors: [{
        homeAway: "home" | "away",
        team: { displayName: "Argentina", abbreviation: "ARG", logo: "url" },
        score: "2",
        winner: true | false
      }],
      venue: { fullName: "MetLife Stadium", address: { city: "East Rutherford" } },
      notes: [{ headline: "Group A" }],
      details: [{ scoringPlay: true, clock: { displayValue: "23'" }, ... }]
    }]
  }]
}
```

### ESPN Summary API

```
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event={id}
```

- **Used by**: `matches.js` (match detail expand)
- **Returns**: Goals, bookings, injuries for a single match

### ESPN Standings API

```
https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings
```

- **Used by**: `standings.js`
- **Polling**: 120-second interval
- **Returns**: Group tables with W/D/L/GF/GA/GD/Pts per team

### API-Football (api-sports.io)

```
https://v3.football.api-sports.io/standings?league=1&season=2026
```

- **Key**: `69018ddd7e785e47912bdd4cda1c45af` (in `config.js`)
- **Currently unused** — was an alternative standings source. ESPN is used instead.

---

## Team Name Normalization

ESPN uses different team names than the pool (e.g., "IR Iran" vs "Iran", "Côte d'Ivoire" vs "Ivory Coast"). Two systems handle this:

### `normalizeTeamName(name)` (config.js)

Lowercases the name and maps it through `TEAM_ALIASES`:

```js
TEAM_ALIASES = {
  "united states": "usa",
  "ir iran": "iran",
  "côte d'ivoire": "ivory coast",
  "türkiye": "turkey",
  "czech republic": "czechia",
  "bosnia and herzegovina": "bosnia-herzegovina",
  "congo dr": "dr congo",
  "democratic republic of the congo": "dr congo",
  // ... more
}
```

### `teamMatches(espnName, poolName)` (config.js)

More lenient matching for match cards and standings. Normalizes both names, then checks equality OR substring inclusion in either direction.

### `isTeamEliminated(teamName, eliminatedSet)` (elimination.js)

Checks both raw lowercase and normalized form against the eliminated set.

---

## Elimination Detection

Two sources of elimination data, merged at runtime:

### 1. Manual (Firestore)

Admin can mark teams eliminated via:
- Pot tab → "Mark Team Eliminated" dropdown
- Standings tab → right-click a team row → "Eliminate"

Stored in `pool/main.eliminatedTeams` array.

### 2. Automatic (ESPN)

`elimination.js` fetches ESPN knockout data and detects eliminations in two phases:

**Phase 1 — Group-stage exits (inverse method):**
- Fetch all R32 matches (scheduled + completed) from ESPN
- Collect every team name appearing in R32 matches (the "qualified" set)
- Filter out placeholder names like "Winner Group A"
- Any of the 48 pool teams NOT in the qualified set = eliminated in group stage
- Safety guard: only runs if `qualifiedTeams.size >= 20` (prevents false positives from partial API data)

**Phase 2 — Knockout losers:**
- For completed knockout matches, find the loser via `competitor.winner === false`
- Fallback: compare scores if winner flag is missing
- Skip third-place match (both teams already eliminated from semi-finals)

**Caching:** 60-second in-memory cache (`_cache`, `_cacheTime`). All modules share the same cache since they import from the same module instance.

**Date range:** Queries ESPN from `2026-06-28` (R32 start) through at least `2026-07-20` (final).

### Merge Flow (in every consuming module)

```js
const firestoreElim = new Set((pool.eliminatedTeams || []).map(t => t.name.toLowerCase()));
const espnElim = await fetchKnockoutEliminations();
const eliminatedSet = mergeEliminations(firestoreElim, espnElim);
// Then check: isTeamEliminated(teamName, eliminatedSet)
```

This pattern is used identically in `pool.js`, `players.js`, `pot.js`, and (the now-unused) `leaderboard.js`.

---

## Tab-by-Tab Feature Guide

### Pool Tab (`pool.js`)

The default landing tab. Shows the draw results.

- Header with participant count and total pot value
- One card per participant showing their 3 team chips (big/smaller/underdog)
- Eliminated teams get `line-through` + dimmed opacity + `ELIMINATED` badge
- If all 3 teams are out, the participant name is struck through with "ELIMINATED" label
- If draw hasn't been run yet, shows "Draw Not Yet Run" message

### Matches Tab (`matches.js`)

Live match center fed by ESPN Scoreboard API.

- Three sections: **LIVE NOW** (with pulsing green dot), **RESULTS**, **UPCOMING MATCHES**
- Each match card shows:
  - Status line (live clock, "FT", or kickoff time with Today/Tomorrow formatting)
  - Home and away team names with scores
  - Pool team owner tags (colored by tier) if either team is in the pool
  - Venue and round info footer
  - Expandable "MATCH DETAILS" for completed/live matches (goals, bookings, injuries via ESPN Summary API)
- Date window: past 7 days through next 7 days
- Auto-refreshes every 60 seconds

### Pot Tab (`pot.js`)

Prize pool tracker with animated counters.

- **Total Pot**: `buyIn × participantCount` with GSAP count-up animation
- **Projected/Final Payouts**: 60% champion, 25% runner-up, 15% third place
- **Standings**: Each participant with their team chips and alive/out status
- **Admin controls** (admin only):
  - "Mark Team Eliminated" dropdown + button
  - "Set Final Standings" panel (champion/runner-up/third selectors) — appears only when no champion is set yet

### Bracket Tab (`bracket.js`)

Knockout bracket visualization with two views:

**Mobile (< 768px):** Vertical list grouped by round (R32 → R16 → QF → SF → Third → Final).

**Desktop (>= 768px):** Two-sided bracket tree:
- Left half: R32 → R16 → QF → SF (left to right)
- Center: Final + Third Place
- Right half: SF ← QF ← R16 ← R32 (right to left, mirrored)
- SVG connector lines between paired slots
- Top scrollbar rail synced with tree scroll

Each bracket slot shows:
- FIFA match number (M73–M104)
- Match status (FT / LIVE · clock / Today · time)
- Team names with flags, scores, and pool owner tags
- Click opens a detail modal with team info and venue

**Bracket positioning logic:**
- R32 slots are identified by hardcoded team name fragments (`R32_L` / `R32_R` arrays)
- Later rounds traced back to R32 slots via recursive event name resolution (e.g., "Quarterfinal 1" → R16 event → R32 events → actual team names)
- Events sorted into correct visual positions using slot-filling algorithm

### Group Stage Tab (`standings.js`)

Live group standings from ESPN Standings API.

- 12 groups (A–L) with standard table: P / W / D / L / GF / GA / GD / Pts
- Pool teams highlighted with owner tags
- Color-coded position bars (1st green, 2nd blue, 3rd yellow, 4th red)
- **Admin feature**: Right-click a pool team row → context menu → "Eliminate" with confirmation dialog
- Auto-refreshes every 120 seconds

### Players Tab (`players.js`)

Per-participant detail view. Visible to all authenticated users.

**List view:**
- Cards with participant name, paid badge (gold), alive count badge
- Gold border with floating particle animation for paid participants

**Detail view** (tap a card):
- Large name with overall status
- Team breakdown: tier badge, team name, alive/out status, elimination date (if from Firestore)
- Match history: all completed matches involving the participant's teams, fetched from ESPN
  - Cards bordered green (win), red (loss), or neutral (draw)
  - Uses `teamMatches()` for flexible name matching

### Admin Tab (`admin.js`)

Admin-only tab for pool management.

**Before draw:**
- Participant manager: add from registered users (chip buttons) or manually (text input), remove
- Tier editor: move teams between tiers (animated pills with "→ Big/Smaller/Underdog" buttons)
- "Save Tiers" button
- Draw validation + "RUN THE DRAW" button (requires >= 2 participants, each tier needs >= N teams)

**After draw:**
- Lock notice (draw is permanent)
- Payment tracker: toggle paid/unpaid per participant
- Danger Zone: "Reset Draw" — clears team assignments and elimination data, keeps participants and tiers

---

## Online Presence (`presence.js`)

Shows how many users are currently viewing the app.

- Each authenticated user writes a heartbeat doc to `presence/{uid}` every 30 seconds
- Real-time listener counts docs where `lastSeen` is within 90 seconds of now
- Displayed as an eye icon with count in the top bar
- Cleaned up on logout and `beforeunload`

---

## UI / Styling Conventions

### CSS Variables (defined on `:root` in styles.css)

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg` | Dark background | Page background |
| `--surface` | Slightly lighter | Card backgrounds |
| `--border` | Subtle border | Card borders, dividers |
| `--text` | Light text | Primary text |
| `--muted` | Dimmed text | Secondary labels |
| `--green` | `#00D96C` | Success, alive status, pot amounts |
| `--error` | Red tone | Eliminated, danger buttons |
| `--warning` | Yellow tone | Validation warnings |

### Tier Colors

Applied via CSS classes `.big`, `.smaller`, `.underdog` on team chips, badges, and owner tags:
- Big: Gold (`#F5B432`)
- Smaller: Silver (`#97A6BE`)
- Underdog: Bronze (`#C1773A`)

### Animations

All transitions use GSAP:
- Auth ↔ App crossfade
- Tab switching with opacity + y-translate
- Card entrance stagger via MutationObserver (auto-detects `.card`, `.participant-card`, `.match-card` insertions)
- Pot/payout count-up animations
- Paid participant particle effects (canvas-based floating gold dots)

### Status Classes

- `.eliminated` on `.team-chip`: struck-through + dimmed
- `.result-win` / `.result-loss` / `.result-draw`: colored left-border on match history cards
- `.paid-border`: gold animated border on paid participant cards
- `.paid-badge`: small gold "PAID" chip

---

## Match Status Constants

Defined in `matches.js` and used across the app:

```js
LIVE_STATES  = ["STATUS_IN_PROGRESS", "STATUS_HALFTIME", "STATUS_END_PERIOD"]
FINAL_STATES = ["STATUS_FINAL", "STATUS_FULL_TIME", "STATUS_FT_EXTRA_TIME", "STATUS_PENALTIES"]
```

Everything else is treated as scheduled/upcoming.

---

## Knockout Bracket Reference Data

`data/knockout-bracket.json` contains the full FIFA WC2026 bracket structure:
- 16 R32 matches (M73–M88) with venues, dates, and `feedsInto` references
- 8 R16 matches (M89–M96)
- 4 QF matches (M97–M100)
- 2 SF matches (M101–M102)
- Third place (M103) and Final (M104)
- `bracketOrder` mapping for left/right visual halves

This is a static reference file. The app's bracket rendering uses ESPN live data, not this file directly. The match numbers from this file are hardcoded in `bracket.js` as `MATCH_NUMS_L`, `MATCH_NUMS_R`, and `MATCH_NUMS_CENTER`.

---

## Known Limitations / Edge Cases

1. **Team name aliases**: If ESPN introduces a new spelling variant not in `TEAM_ALIASES`, name matching could fail. Known gap: no alias for "Curacao" ↔ "Curaçao" (accent) or "Cabo Verde" ↔ "Cape Verde". These teams were eliminated in group stages so it doesn't currently matter.

2. **Standings tab uses only Firestore eliminations**: `standings.js` builds its `eliminatedNames` set from Firestore only (not ESPN auto-detection). This is intentional — group standings are a group-stage view where manual admin control is appropriate.

3. **No offline support**: App requires internet for both Firebase and ESPN APIs.

4. **Max 16 participants**: Hardcoded limit matching the 16 teams per tier.

5. **Single admin**: Determined by `ADMIN_EMAIL` constant in `config.js`.

6. **No Firestore security rules in codebase**: Rules are configured in the Firebase console, not version-controlled here.

7. **ESPN API is unofficial**: No auth key required, but the API is undocumented and could change without notice.

---

## How to Deploy

1. The app is entirely static files — serve from any web host
2. Firebase project (`fifapot`) must exist with Auth and Firestore enabled
3. No build step — just serve `index.html` and the `js/`, `css/`, `data/` directories
4. GSAP loaded from CDN, Firebase SDK loaded from Google's CDN

---

## How to Reset for a New Tournament

1. Admin → Danger Zone → "Reset Draw" (clears assignments + eliminations)
2. Update `DEFAULT_TIERS` in `config.js` with new tournament's 48 teams
3. Update `TEAM_ALIASES` for any new ESPN name mismatches
4. Update bracket date ranges in `elimination.js` (`r32Start`, end date) and `bracket.js` (date-based round detection thresholds)
5. Update `data/knockout-bracket.json` with new match numbers and venues
6. Update `MATCH_NUMS_L`, `MATCH_NUMS_R`, `MATCH_NUMS_CENTER` in `bracket.js`

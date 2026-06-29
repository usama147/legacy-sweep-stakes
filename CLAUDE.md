# FifaPot — Project Context for Claude

## What This Is

FifaPot is a World Cup 2026 pool/betting web app built for internal company use. Participants buy in (R100 each, up to 16 people) and are randomly assigned football teams across 3 tiers via a draw. The app tracks live scores, group standings, goals-based leaderboard, and pot payouts. It runs on GitHub Pages with Firebase as the backend — no build step required.

---

## Tech Stack

- **Frontend**: Vanilla JS (ES modules), no framework, no bundler
- **Styling**: CSS custom properties, GSAP for animations
- **Backend**: Firebase Auth + Firestore
- **External APIs**: ESPN (live scores + standings), API-Football (group standings fallback)
- **Hosting**: GitHub Pages

---

## File Structure

```
index.html          — App shell, auth screen, 7 tabs
css/styles.css      — Full design system (dark theme, CSS custom properties)
js/
  app.js            — Entry point, auth state listener, tab router
  config.js         — Firebase config, admin email, team tiers, API keys
  draw.js           — Fisher-Yates draw logic, Firestore batch write
  admin.js          — Participant management, tier editing, payment tracker
  pool.js           — Draw results display (participant cards + team chips)
  matches.js        — Live/results/upcoming match cards from ESPN
  standings.js      — Group stage standings table from ESPN
  leaderboard.js    — Goals-based leaderboard
  pot.js            — Pot total, payout projections, elimination panel
  players.js        — Individual participant profiles + match history
  auth.js           — Firebase Auth (signup, login, password reset)
  presence.js       — Online presence tracking (30s heartbeat)
```

---

## Firestore Schema

```
/pool/main
  drawCompleted: boolean
  drawDate: timestamp
  buyIn: number               ← currently R100, hardcoded in admin.js:41
  tiers: [ { key, label, icon, teams: [{name, flag}] } ]
  eliminatedTeams: [ { name, flag, tier, participantName, eliminatedAt } ]
  finalStandings: {
    champion:   { teamName, flag, participantName } | null
    runnerUp:   { teamName, flag, participantName } | null
    thirdPlace: { teamName, flag, participantName } | null
  }

/pool/main/participants/{id}
  name: string
  addedAt: timestamp
  drawOrder: number
  paid: boolean
  teams: {
    big:      { name, flag }
    smaller:  { name, flag }
    underdog: { name, flag }
  }

/users/{uid}
  name, email, uid, joinedAt

/presence/{uid}
  lastSeen: number (Date.now())
```

---

## How the Draw Works

1. Admin adds up to 16 participants and configures 3 tiers (Big / Smaller / Underdogs, 16 teams each = 48 total)
2. Fisher-Yates shuffle randomizes each tier's team list
3. First N teams (N = participant count) taken from each shuffled tier
4. Firestore batch write atomically assigns one team per tier to each participant
5. `drawCompleted = true` is set — draw locks, cannot be re-run without admin reset

---

## Admin Role

Admin is detected by hardcoded email check in `config.js:20`:
```js
ADMIN_EMAIL: "usama@brandesign.co.za"
```
Admin-only features: run draw, mark teams eliminated, set final standings, mark participants paid, reset draw.

---

## Hardcoded Values That Change Per Deployment

| Value | File | Line(s) |
|---|---|---|
| Firebase config (apiKey, projectId, etc.) | `config.js` | 6–14 |
| Admin email | `config.js` | 20 |
| Team tiers + all 48 teams | `config.js` | 22–65 |
| API Football key | `config.js` | 98 |
| Buy-in amount (100) | `admin.js` | 41 |
| Max participants (16) | `admin.js` | 69, 94, 159, 204 |
| Payout % (0.60 / 0.25 / 0.15) | `pot.js` | 80–82 |
| Tournament start date (2026-06-11) | `matches.js:38`, `leaderboard.js:41`, `players.js:365` | — |
| App name "FIFAPOT" | `index.html` | 16, 62 |
| Subtitle "World Cup 2026" | `index.html` | 17 |

---

## ESPN API — What It Returns

**Scoreboard** (used in `matches.js`):
```
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
```
Returns all matches. Each event has `season.slug` identifying the round:
- Group stage: `group-stage`
- `round-of-32`, `round-of-16`, `quarterfinals`, `semifinals`, `3rd-place-match`, `final`

Knockout match data structure is **identical** to group matches — `matches.js` already displays them as cards automatically when querying knockout dates. The current app doesn't filter by slug so rounds aren't labelled.

**Standings** (used in `standings.js`):
```
https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings
```
Returns group tables only (`data.children` = one entry per group). **No bracket endpoint exists** (ESPN returns 404 for `/bracket`). A knockout bracket view would need to be built by filtering scoreboard events by `season.slug`.

**World Cup 2026 knockout schedule:**
- Round of 32: Jun 28 – Jul 3
- Round of 16: Jul 4 – Jul 7
- Quarterfinals: Jul 9 – Jul 11
- Semifinals: Jul 14 – Jul 15
- 3rd Place: Jul 18
- Final: Jul 19

---

## Knockout Stage — Current Behaviour

The current app has **no knockout stage logic**. The Groups tab shows group standings and freezes there. Elimination is entirely manual — admin watches the tournament and marks teams out via a dropdown in the Pot tab or by right-clicking in the Groups tab. There is no automatic detection of a knockout loss.

---

## Planned Second Deployment (CEO's Friend's Company)

A second client wants a version with these differences:
- **20 participants** (currently capped at 16)
- **Bigger prize pool** (buy-in TBD)
- **Draw from knockout teams only** — not all 48 pre-tournament teams
- **Draw timing**: likely after the group stage once the 32 qualifying teams are known
- **32 teams, 20 participants** — allocation model TBD (1 team each with 12 unowned, or some people get 2 teams)
- **Tier system**: TBD — may keep Big/Smaller/Underdog applied to knockout seeds, or go flat draw

### Open Questions (to ask CEO)
1. Does each person get 1 team, or can some get 2? (32 ÷ 20 doesn't divide evenly)
2. Does the draw happen before the tournament or after the group stage?
3. Are tiers still used, or flat random draw from the 32 knockout teams?
4. Goals-based leaderboard or just winner tracking?
5. Same 60/25/15 payout split or different?
6. Who is the admin for the new deployment?
7. Public or invite-only access?

### Code Changes Required for Second Deployment
- Extract `buyIn`, payout percentages, app name, tournament start date, max participants into `config.js`
- Bump max participants from 16 → 20 in `admin.js`
- New Firebase project + swap config
- If knockout-only draw: rework `draw.js`, `pool.js` display, and potentially `standings.js` → bracket view
- Replace Groups tab standings table with knockout bracket (grouped by round using `season.slug` from scoreboard API)

---

## Key Design Decisions

- **No build step** — plain ES modules, importable directly in browser
- **Firebase batch writes** for draw atomicity
- **Fisher-Yates shuffle** for uniform random team distribution
- **Manual elimination** — admin-driven, not auto-detected from match results
- **GSAP** for all animations (tab transitions, card staggers, count-up numbers)
- **Polling** for live data: matches every 60s, standings every 120s

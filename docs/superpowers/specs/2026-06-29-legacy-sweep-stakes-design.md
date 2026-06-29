# Legacy Sweep Stakes — Design Spec
_Date: 2026-06-29_

## Overview

A World Cup 2026 knockout-stage sweepstake app for Legacy Fiduciary Services. Based on the FifaPot codebase with significant simplifications: no tier system, 1 team per participant, flat random draw from the 31 confirmed R32 knockout teams, and Legacy brand styling. Hosted on Vercel, backed by a new Firebase project.

---

## Client

- **Company**: Legacy Fiduciary Services (legacyfiduciaryservices.co.za)
- **App name**: Legacy Sweep Stakes
- **Hosting**: Vercel
- **Repo**: github.com/usama147/legacy-sweep-stakes
- **Admin**: usama@brandesign.co.za (testing) — real client admin TBD

---

## Participants & Pool

- 30 seats maximum, 25–26 expected
- 1 team per participant (no tiers)
- Buy-in: R100 per person
- Payouts: 60% champion / 25% runner-up / 15% third place

---

## Team Pool

Fixed list of 31 teams — all teams that entered the Round of 32 (South Africa excluded as already eliminated at spec time).

**14 Big teams** (must all be assigned — never the unowned slot):
Argentina, France, Spain, England, Brazil, Portugal, Netherlands, Belgium, Germany, Switzerland, Croatia, Colombia, Morocco, Japan

**17 Smaller/Underdog teams** (16 assigned, 1 goes unowned):
Norway, Mexico, South Korea, Senegal, Ecuador, Austria, Turkey, Scotland, Canada, Australia, Iran, Saudi Arabia, Algeria, Ivory Coast, Sweden, Paraguay, Bosnia-Herzegovina, Czechia, Qatar, Ghana, Cape Verde, Egypt, Tunisia, Panama, Iraq, New Zealand, Uzbekistan, DR Congo
_(trimmed to actual R32 qualifiers — verified via ESPN API)_

---

## Draw Algorithm

1. Separate teams into 14 big + 17 non-big
2. Randomly select 1 non-big team to be unowned (excluded from draw)
3. Combine remaining 30 teams and apply Fisher-Yates shuffle
4. Assign 1 team per participant via Firestore batch write
5. Set `drawCompleted: true` — draw locks

**Rule**: A big team can never be the unowned slot. This guarantees all 14 big teams are in the pool and owned by a participant.

---

## Feature Changes vs FifaPot

| Feature | Change |
|---|---|
| Tier system | Removed from UI entirely |
| Teams per participant | 3 → 1 |
| Leaderboard tab | Removed |
| Pool tab | 1 team chip per card, no tier colour coding |
| Pot tab standings | 1 team per participant, alive/out logic unchanged |
| Players tab | 1 team per participant |
| Admin tab | Tier editor removed. Participant mgmt + draw + payments remain |
| Matches tab | Unchanged |
| Bracket tab | Unchanged |
| Max participants | 16 → 30 |

---

## Branding

| Element | Value |
|---|---|
| App name | Legacy Sweep Stakes |
| Logo | SVG from legacyfiduciaryservices.co.za |
| Background | `#1a2e1e` (dark forest green) |
| Card background | `#243d28` |
| Primary accent | `#99ca3d` (bright green) |
| Secondary | `#75735a` (olive) |
| Text | `#e8dfc6` (cream) |
| Border | `rgba(153, 202, 61, 0.15)` |
| Muted text | `rgba(232, 223, 198, 0.45)` |
| Font stack | Bebas Neue, IBM Plex Mono, Outfit (unchanged) |

---

## Files to Change

| File | Change |
|---|---|
| `index.html` | App name, logo, remove leaderboard tab |
| `css/styles.css` | Replace all colour variables with Legacy palette |
| `js/config.js` | New Firebase credentials, admin email, replace DEFAULT_TIERS with flat 31-team list |
| `js/draw.js` | Rewrite draw: flat pool, big-team priority, 1 team per participant |
| `js/pool.js` | 1 team per card, remove tier chip rendering |
| `js/pot.js` | 1 team per participant in standings |
| `js/players.js` | 1 team per participant |
| `js/admin.js` | Remove tier editor, bump max participants to 30 |
| `js/app.js` | Remove leaderboard tab case |
| `js/leaderboard.js` | Delete file |

## Files Unchanged

`js/matches.js`, `js/bracket.js`, `js/standings.js`, `js/elimination.js`, `js/auth.js`, `js/presence.js`, `data/knockout-bracket.json`

---

## Out of Scope

- No goals-based scoring
- No tier display anywhere in UI
- No automatic bracket progression animations
- Firebase security rules (managed in console)

# Legacy Sweep Stakes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the FifaPot codebase into Legacy Sweep Stakes — a knockout-only sweepstake for Legacy Fiduciary Services with flat 1-team-per-participant draw, Legacy brand colours, and no tier system.

**Architecture:** All changes are in-place edits to the copied repo at `/Users/usamagierdien/Desktop/Legacy Fifa Draw/legacy-sweep-stakes`. Firebase credentials are placeholder until client supplies their new project config. The Firestore participant schema changes from `teams: { big, smaller, underdog }` to a single `team: { name, flag }` field.

**Tech Stack:** Vanilla JS ES modules, Firebase 12.14.0 (Auth + Firestore), GSAP 3.12.5, no build step.

## Global Constraints

- Working directory: `/Users/usamagierdien/Desktop/Legacy Fifa Draw/legacy-sweep-stakes`
- No build step — plain ES modules served directly
- Firebase credentials are placeholders — admin must swap them before live use
- Max participants: 30
- Buy-in: R100, payouts 60/25/15
- Big teams (14): Argentina, France, Spain, England, Brazil, Portugal, Netherlands, Belgium, Germany, Switzerland, Croatia, Colombia, Morocco, Japan — must ALL be assigned in draw, never the unowned slot
- Non-big teams (17): Norway, Mexico, South Korea, Senegal, Ecuador, Austria, Turkey, Scotland, Canada, Australia, Iran, Saudi Arabia, Algeria, Ivory Coast, Sweden, Paraguay, Bosnia-Herzegovina, Czechia, Qatar, Ghana, Cape Verde, Egypt, Tunisia, Panama, Iraq, New Zealand, Uzbekistan, DR Congo, South Africa excluded (already eliminated)
- No tier display anywhere in the UI
- No leaderboard
- Target repo: https://github.com/usama147/legacy-sweep-stakes.git

---

## File Map

| File | Action | What changes |
|---|---|---|
| `js/config.js` | Modify | Replace DEFAULT_TIERS with flat KNOCKOUT_TEAMS + BIG_TEAM_NAMES set; placeholder Firebase config |
| `js/draw.js` | Rewrite | Flat draw with big-team priority; assigns `team` not `teams` |
| `index.html` | Modify | App name → "Legacy Sweep Stakes"; SVG logo; remove standings tab div |
| `css/styles.css` | Modify | Replace `:root` colour variables with Legacy palette; update stripe + auth card |
| `js/pool.js` | Modify | 1 team chip per card using `p.team`; remove tier iteration |
| `js/pot.js` | Modify | Use `p.team` throughout standings + elimination panel |
| `js/players.js` | Modify | Use `p.team`; simplify detail view; remove tier badges |
| `js/admin.js` | Modify | Remove tier editor; bump max 16→30; simplify draw validation + call |
| `js/leaderboard.js` | Delete | File unused, remove |

**Unchanged:** `js/matches.js`, `js/bracket.js`, `js/standings.js`, `js/elimination.js`, `js/auth.js`, `js/presence.js`, `js/app.js`, `data/knockout-bracket.json`

---

## Task 1: config.js — Flat team list + placeholder Firebase credentials

**Files:**
- Modify: `js/config.js`

**Interfaces:**
- Produces: `KNOCKOUT_TEAMS` (array of `{name, flag}`), `BIG_TEAM_NAMES` (Set of lowercase strings), `ADMIN_EMAIL`, Firebase `db` + `auth` exports, `teamMatches()`, `normalizeTeamName()`

- [ ] **Step 1: Replace config.js entirely**

```js
// js/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// ── REPLACE THESE with the new Firebase project credentials ─────────────────
const firebaseConfig = {
  apiKey:            "REPLACE_WITH_NEW_API_KEY",
  authDomain:        "REPLACE_WITH_NEW_AUTH_DOMAIN",
  projectId:         "REPLACE_WITH_NEW_PROJECT_ID",
  storageBucket:     "REPLACE_WITH_NEW_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_NEW_SENDER_ID",
  appId:             "REPLACE_WITH_NEW_APP_ID"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

export const ADMIN_EMAIL = "usama@brandesign.co.za";

// ── All 31 R32 knockout teams (South Africa excluded — already eliminated) ───
export const KNOCKOUT_TEAMS = [
  // Big teams (14) — must all be assigned in draw
  { name: "Argentina",    flag: "🇦🇷" },
  { name: "France",       flag: "🇫🇷" },
  { name: "Spain",        flag: "🇪🇸" },
  { name: "England",      flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Brazil",       flag: "🇧🇷" },
  { name: "Portugal",     flag: "🇵🇹" },
  { name: "Netherlands",  flag: "🇳🇱" },
  { name: "Belgium",      flag: "🇧🇪" },
  { name: "Germany",      flag: "🇩🇪" },
  { name: "Switzerland",  flag: "🇨🇭" },
  { name: "Croatia",      flag: "🇭🇷" },
  { name: "Colombia",     flag: "🇨🇴" },
  { name: "Morocco",      flag: "🇲🇦" },
  { name: "Japan",        flag: "🇯🇵" },
  // Non-big teams (17) — 16 assigned, 1 randomly left unowned
  { name: "Norway",             flag: "🇳🇴" },
  { name: "Mexico",             flag: "🇲🇽" },
  { name: "Senegal",            flag: "🇸🇳" },
  { name: "Ecuador",            flag: "🇪🇨" },
  { name: "Austria",            flag: "🇦🇹" },
  { name: "Turkey",             flag: "🇹🇷" },
  { name: "Canada",             flag: "🇨🇦" },
  { name: "Australia",          flag: "🇦🇺" },
  { name: "Algeria",            flag: "🇩🇿" },
  { name: "Ivory Coast",        flag: "🇨🇮" },
  { name: "Sweden",             flag: "🇸🇪" },
  { name: "Paraguay",           flag: "🇵🇾" },
  { name: "Ghana",              flag: "🇬🇭" },
  { name: "Cape Verde",         flag: "🇨🇻" },
  { name: "Egypt",              flag: "🇪🇬" },
  { name: "Bosnia-Herzegovina", flag: "🇧🇦" },
  { name: "DR Congo",           flag: "🇨🇩" },
];

// Names that must never be the unowned slot
export const BIG_TEAM_NAMES = new Set([
  "argentina", "france", "spain", "england", "brazil", "portugal",
  "netherlands", "belgium", "germany", "switzerland", "croatia",
  "colombia", "morocco", "japan"
]);

export const TEAM_ALIASES = {
  "united states":    "usa",
  "us":               "usa",
  "ir iran":          "iran",
  "côte d'ivoire":    "ivory coast",
  "cote d'ivoire":    "ivory coast",
  "türkiye":          "turkey",
  "turkiye":          "turkey",
  "republic of korea":"south korea",
  "czech republic":   "czechia",
  "dr congo":         "dr congo",
  "congo dr":         "dr congo",
  "democratic republic of the congo": "dr congo",
  "bosnia and herzegovina": "bosnia-herzegovina",
  "bosnia-herzegovina":     "bosnia-herzegovina",
};

export function normalizeTeamName(name) {
  const lower = name.toLowerCase().trim();
  return TEAM_ALIASES[lower] || lower;
}

export function teamMatches(espnName, poolName) {
  const a = normalizeTeamName(espnName);
  const b = normalizeTeamName(poolName);
  return a === b || a.includes(b) || b.includes(a);
}
```

- [ ] **Step 2: Verify in browser console**

Open the app in a browser (or serve with `python3 -m http.server 8080` from the repo root). Open DevTools → Console. No import errors should appear for config.js. The Firebase init will fail on the placeholder credentials — that's expected until the real project is set up.

- [ ] **Step 3: Commit**

```bash
cd "/Users/usamagierdien/Desktop/Legacy Fifa Draw/legacy-sweep-stakes"
git add js/config.js
git commit -m "feat: replace team tiers with flat 31-team knockout list and placeholder Firebase config"
```

---

## Task 2: draw.js — Flat draw with big-team priority

**Files:**
- Modify: `js/draw.js`

**Interfaces:**
- Consumes: `db` from `./config.js`; `KNOCKOUT_TEAMS`, `BIG_TEAM_NAMES` from `./config.js`
- Produces: `runDraw(participants)` — assigns `team: { name, flag }` to each participant doc, sets `drawCompleted: true`

- [ ] **Step 1: Replace draw.js entirely**

```js
// js/draw.js
import { db, KNOCKOUT_TEAMS, BIG_TEAM_NAMES } from "./config.js";
import {
  doc, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function runDraw(participants) {
  const n = participants.length;

  if (n < 2)  throw new Error(`Need at least 2 participants (have ${n}).`);
  if (n > 30) throw new Error(`Maximum 30 participants allowed (have ${n}).`);
  if (KNOCKOUT_TEAMS.length < n) {
    throw new Error(`Not enough teams (${KNOCKOUT_TEAMS.length}) for ${n} participants.`);
  }

  // Separate big and non-big teams
  const bigTeams    = KNOCKOUT_TEAMS.filter(t => BIG_TEAM_NAMES.has(t.name.toLowerCase()));
  const nonBigTeams = KNOCKOUT_TEAMS.filter(t => !BIG_TEAM_NAMES.has(t.name.toLowerCase()));

  // Randomly remove 1 non-big team — this is the unowned slot
  const shuffledNonBig = fisherYates(nonBigTeams);
  const pool = [...bigTeams, ...shuffledNonBig.slice(0, n - bigTeams.length)];

  // Final shuffle of the 30-team pool
  const shuffled = fisherYates(pool);

  // Build Firestore batch
  const batch = writeBatch(db);

  participants.forEach((p, i) => {
    const ref = doc(db, "pool", "main", "participants", p.id);
    batch.update(ref, {
      team: shuffled[i],
      drawOrder: i + 1
    });
  });

  const poolRef = doc(db, "pool", "main");
  batch.update(poolRef, {
    drawCompleted: true,
    drawDate: serverTimestamp()
  });

  await batch.commit();
}
```

- [ ] **Step 2: Verify logic manually**

Run this in browser console after the module loads (or in Node.js) to sanity-check the algorithm:

```js
// Paste into browser console to verify draw math:
const big = 14, nonBig = 17, participants = 30;
// After removing 1 non-big: pool = 14 + 16 = 30 ✓
console.assert(big + (nonBig - 1) === participants, "Pool size must equal participant count");
// Big teams are always in pool
console.assert(big <= participants, "All big teams fit");
```

Expected: no assertion errors.

- [ ] **Step 3: Commit**

```bash
git add js/draw.js
git commit -m "feat: rewrite draw for flat knockout pool — big teams always assigned, 1 non-big slot unowned"
```

---

## Task 3: index.html — Branding and layout

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update title, logo, and remove unused standings div**

Replace the entire `index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Legacy Sweep Stakes 2026</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <!-- AUTH SCREEN -->
  <div id="auth-screen" style="opacity:0">
    <div class="auth-card">
      <div class="auth-logo-wrap">
        <img src="https://www.legacyfiduciaryservices.co.za/wp-content/uploads/2024/04/SM-LEGACY-LOGO-Final-01-011.svg"
             alt="Legacy Fiduciary Services"
             class="auth-logo-img">
      </div>
      <h1 class="auth-title">LEGACY SWEEP STAKES</h1>
      <p class="auth-subtitle">World Cup 2026 · Knockout Draw</p>

      <!-- Login form -->
      <form id="login-form">
        <input type="email" id="login-email" placeholder="Email" required>
        <input type="password" id="login-password" placeholder="Password" required>
        <div id="login-error" class="form-error"></div>
        <button type="submit" class="btn-primary">Sign In</button>
        <div class="auth-links">
          <button type="button" id="show-signup">Create account</button>
          <button type="button" id="show-forgot">Forgot password?</button>
        </div>
      </form>

      <!-- Signup form -->
      <form id="signup-form" style="display:none">
        <input type="text" id="signup-name" placeholder="Your name" required>
        <input type="email" id="signup-email" placeholder="Email" required>
        <input type="password" id="signup-password" placeholder="Password (min 6 chars)" required>
        <div id="signup-error" class="form-error"></div>
        <button type="submit" class="btn-primary">Create Account</button>
        <div class="auth-links">
          <button type="button" id="show-login">Back to sign in</button>
        </div>
      </form>

      <!-- Forgot password form -->
      <form id="forgot-form" style="display:none">
        <p class="form-hint">Enter your email and we'll send a reset link.</p>
        <input type="email" id="forgot-email" placeholder="Email" required>
        <div id="forgot-error" class="form-error"></div>
        <div id="forgot-success" class="form-success"></div>
        <button type="submit" class="btn-primary">Send Reset Link</button>
        <div class="auth-links">
          <button type="button" id="show-login-2">Back to sign in</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MAIN APP -->
  <div id="app" style="display:none">

    <!-- Top bar -->
    <header id="app-header">
      <span class="app-logo">LEGACY SWEEP STAKES</span>
      <span id="user-email-display" class="user-email"></span>
      <div id="online-pill" style="opacity:0">
        <svg viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M10 1C5.5 1 1.7 4 1 7c.7 3 4.5 6 9 6s8.3-3 9-6c-.7-3-4.5-6-9-6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="10" cy="7" r="2.5" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <span id="online-count">0</span>
      </div>
      <button id="logout-btn" class="btn-ghost">Sign out</button>
    </header>

    <!-- Tab nav -->
    <nav id="tab-nav">
      <button class="tab-btn active" data-tab="pool">Pool</button>
      <button class="tab-btn" data-tab="matches">Matches</button>
      <button class="tab-btn" data-tab="pot">Pot</button>
      <button class="tab-btn" data-tab="bracket">Bracket</button>
      <button class="tab-btn" data-tab="players" id="players-tab-btn" style="display:none">Players</button>
      <button class="tab-btn" data-tab="admin" id="admin-tab-btn" style="display:none">Admin</button>
    </nav>

    <!-- Tab views -->
    <main>
      <div id="tab-pool" class="tab-view active"></div>
      <div id="tab-matches" class="tab-view" style="display:none"></div>
      <div id="tab-pot" class="tab-view" style="display:none"></div>
      <div id="tab-bracket" class="tab-view" style="display:none"></div>
      <div id="tab-players" class="tab-view" style="display:none"></div>
      <div id="tab-admin" class="tab-view" style="display:none"></div>
    </main>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Add auth logo styles to css/styles.css**

Find the `.auth-title` rule and add these new rules directly above it:

```css
.auth-logo-wrap {
  text-align: center;
  margin-bottom: 16px;
}

.auth-logo-img {
  height: 52px;
  width: auto;
  object-fit: contain;
}
```

- [ ] **Step 3: Verify in browser**

Load the app. Auth screen should show the Legacy SVG logo above the title "LEGACY SWEEP STAKES". Header should read "LEGACY SWEEP STAKES" instead of "FIFAPOT".

- [ ] **Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: rebrand to Legacy Sweep Stakes — logo, title, remove standings tab div"
```

---

## Task 4: css/styles.css — Legacy brand colour palette

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 1: Replace :root colour variables**

Find the `:root { ... }` block (lines 11–30) and replace it with:

```css
:root {
  --bg:              #1a2e1e;
  --card:            #243d28;
  --border:          rgba(153, 202, 61, 0.15);
  --text:            #e8dfc6;
  --muted:           rgba(232, 223, 198, 0.45);
  --green:           #99ca3d;       /* Legacy primary green — main accent */
  --green-dark:      #7aaa2a;
  --big:             #99ca3d;       /* no tier colours — reuse primary */
  --big-dim:         rgba(153,202,61,0.08);
  --big-border:      rgba(153,202,61,0.25);
  --smaller:         #75735a;
  --smaller-dim:     rgba(117,115,90,0.08);
  --smaller-border:  rgba(117,115,90,0.25);
  --underdog:        #75735a;
  --underdog-dim:    rgba(117,115,90,0.08);
  --underdog-border: rgba(117,115,90,0.25);
  --error:           #d94f3a;
  --warning:         #c89b3c;
}
```

- [ ] **Step 2: Update the top stripe**

Find `body::before` and replace its background:

```css
body::before {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #386342 0%, #99ca3d 50%, #386342 100%);
  z-index: 9999;
}
```

- [ ] **Step 3: Update auth card shadow and title gradient**

Find `.auth-card` and replace the `box-shadow` line:

```css
box-shadow: 0 0 50px rgba(153, 202, 61, 0.08), 0 24px 64px rgba(0,0,0,0.55);
```

Find `.auth-title` gradient and replace:

```css
background: linear-gradient(135deg, #99ca3d, #386342);
```

- [ ] **Step 4: Verify in browser**

Auth screen background should be dark forest green. Logo accent colour should be bright green (`#99ca3d`). Cards should be a slightly lighter dark green. Top stripe should be green gradient.

- [ ] **Step 5: Commit**

```bash
git add css/styles.css
git commit -m "feat: apply Legacy Fiduciary Services brand colour palette"
```

---

## Task 5: pool.js — 1 team per participant card

**Files:**
- Modify: `js/pool.js`

**Interfaces:**
- Consumes: `p.team: { name, flag }` from Firestore (set by new draw.js)
- Produces: participant cards each showing 1 team chip, no tier colours

- [ ] **Step 1: Replace pool.js entirely**

```js
// js/pool.js
import { db } from "./config.js";
import {
  doc, getDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { fetchKnockoutEliminations, mergeEliminations, isTeamEliminated } from "./elimination.js";

export async function renderPool(container) {
  container.innerHTML = `<div class="loading">Loading pool...</div>`;

  let poolSnap, partsSnap;
  try {
    [poolSnap, partsSnap] = await Promise.all([
      getDoc(doc(db, "pool", "main")),
      getDocs(collection(db, "pool", "main", "participants"))
    ]);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="empty-state"><p>Failed to load pool data. Please refresh.</p></div>`;
    return;
  }

  if (!poolSnap.exists()) {
    container.innerHTML = `<div class="empty-state"><p>No pool data yet. Admin needs to set up the pool.</p></div>`;
    return;
  }

  const pool = poolSnap.data();
  const participants = partsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.drawOrder - b.drawOrder);

  container.innerHTML = "";

  // Header
  const hdr = document.createElement("div");
  hdr.style.marginBottom = "20px";
  const potTotal = pool.buyIn * participants.length;

  if (pool.drawCompleted) {
    hdr.innerHTML = `
      <h2 style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;margin-bottom:4px;">
        The Draw
      </h2>
      <p style="color:var(--muted);font-size:13px;">
        ${participants.length} participants · Pot: <strong style="color:var(--green)">R${potTotal}</strong>
      </p>`;
  } else {
    hdr.innerHTML = `
      <div class="empty-state">
        <h2 style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;">Draw Not Yet Run</h2>
        <p>Check back once the admin has completed the draw.</p>
      </div>`;
    container.appendChild(hdr);
    return;
  }
  container.appendChild(hdr);

  // Merge Firestore + ESPN eliminations
  const firestoreElim = new Set(
    (pool.eliminatedTeams || []).map(t => t.name.toLowerCase())
  );
  const espnElim = await fetchKnockoutEliminations();
  const eliminatedSet = mergeEliminations(firestoreElim, espnElim);

  // Participant cards
  participants.forEach(p => {
    const card = document.createElement("div");
    card.className = "participant-card";

    const team = p.team;
    const isOut = !!team && isTeamEliminated(team.name, eliminatedSet);

    const nameDiv = document.createElement("div");
    nameDiv.className = "participant-name";
    if (isOut) {
      nameDiv.style.opacity = "0.4";
      nameDiv.style.textDecoration = "line-through";
    }
    nameDiv.textContent = p.name;
    if (isOut) {
      const outBadge = document.createElement("span");
      outBadge.style.cssText = "font-family:Outfit,sans-serif;font-size:12px;color:var(--error);margin-left:8px;";
      outBadge.textContent = "ELIMINATED";
      nameDiv.appendChild(outBadge);
    }
    card.appendChild(nameDiv);

    const teamsEl = document.createElement("div");
    teamsEl.className = "participant-teams";

    if (team) {
      const chip = document.createElement("span");
      chip.className = `team-chip${isOut ? " eliminated" : ""}`;
      chip.textContent = `${team.flag} ${team.name}`;
      teamsEl.appendChild(chip);
    }

    card.appendChild(teamsEl);
    container.appendChild(card);
  });
}
```

- [ ] **Step 2: Verify in browser**

After draw is run (or with seeded Firestore data): Pool tab should show one card per participant with a single team chip. No Big/Smaller/Underdog colour differences.

- [ ] **Step 3: Commit**

```bash
git add js/pool.js
git commit -m "feat: pool tab — 1 team chip per participant, no tier colours"
```

---

## Task 6: pot.js — 1 team per participant

**Files:**
- Modify: `js/pot.js`

**Interfaces:**
- Consumes: `p.team: { name, flag }` from Firestore

- [ ] **Step 1: Replace pot.js entirely**

```js
// js/pot.js
import { db } from "./config.js";
import {
  doc, getDoc, collection, getDocs,
  updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { isTeamEliminated } from "./elimination.js";

export async function renderPot(container, isAdmin) {
  container.innerHTML = `<div class="loading">Loading pot...</div>`;

  let poolSnap, partsSnap;
  try {
    [poolSnap, partsSnap] = await Promise.all([
      getDoc(doc(db, "pool", "main")),
      getDocs(collection(db, "pool", "main", "participants"))
    ]);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="empty-state"><p>Failed to load pot data. Please refresh.</p></div>`;
    return;
  }

  if (!poolSnap.exists()) {
    container.innerHTML = `<div class="empty-state"><p>No pool data yet.</p></div>`;
    return;
  }

  const pool = poolSnap.data();
  const participants = partsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.drawOrder - b.drawOrder);

  container.innerHTML = "";

  if (!pool.drawCompleted) {
    container.innerHTML = `<div class="empty-state"><p>Draw hasn't been run yet.</p></div>`;
    return;
  }

  const eliminated      = pool.eliminatedTeams || [];
  const eliminatedNames = new Set(eliminated.map(t => t.name.toLowerCase()));
  const potTotal        = pool.buyIn * participants.length;
  const finalStandings  = pool.finalStandings || { champion: null, runnerUp: null, thirdPlace: null };

  // ── Pot summary ──────────────────────────────────────────────────────────────
  const potCard = mkCard();
  const potHeader = document.createElement("div");
  potHeader.className = "section-header";
  potHeader.textContent = "Total Pot";
  potCard.appendChild(potHeader);

  const potTotalEl = document.createElement("div");
  potTotalEl.className = "pot-total";
  potTotalEl.textContent = "R0";
  potCard.appendChild(potTotalEl);
  gsap.to({ val: 0 }, {
    val: potTotal,
    duration: 1.4,
    ease: "power2.out",
    delay: 0.3,
    onUpdate() { potTotalEl.textContent = `R${Math.round(this.targets()[0].val)}`; }
  });

  const potSubEl = document.createElement("div");
  potSubEl.style.cssText = "color:var(--muted);font-size:13px;margin-top:4px;";
  potSubEl.textContent = `${participants.length} participants × R${pool.buyIn}`;
  potCard.appendChild(potSubEl);
  container.appendChild(potCard);

  // ── Payout projections / final payouts ───────────────────────────────────────
  const payoutCard = mkCard();
  payoutCard.style.marginTop = "12px";
  const payoutHeader = document.createElement("div");
  payoutHeader.className = "section-header";
  payoutHeader.textContent = finalStandings.champion ? "Final Payouts" : "Projected Payouts";
  payoutCard.appendChild(payoutHeader);

  const places = [
    { label: "🥇 Champion",    key: "champion",   pct: 0.60 },
    { label: "🥈 Runner-Up",   key: "runnerUp",   pct: 0.25 },
    { label: "🥉 Third Place", key: "thirdPlace", pct: 0.15 },
  ];

  places.forEach(({ label, key, pct }, pi) => {
    const standing = finalStandings[key];
    const row = document.createElement("div");
    row.className = "payout-row";

    const labelEl = document.createElement("span");
    labelEl.textContent = standing ? `${label} ${standing.flag} ${standing.teamName}` : label;
    row.appendChild(labelEl);

    const amtEl = document.createElement("div");
    amtEl.style.textAlign = "right";

    const amtNum = document.createElement("strong");
    amtNum.style.color = "var(--green)";
    const amtFinal = Math.round(potTotal * pct);
    amtNum.textContent = "R0";
    gsap.to({ val: 0 }, {
      val: amtFinal,
      duration: 1.2,
      ease: "power2.out",
      delay: 0.45 + pi * 0.12,
      onUpdate() { amtNum.textContent = `R${Math.round(this.targets()[0].val)}`; }
    });
    amtEl.appendChild(amtNum);

    if (standing) {
      const ownerEl = document.createElement("span");
      ownerEl.style.cssText = "color:var(--muted);font-size:12px;display:block;";
      ownerEl.textContent = standing.participantName;
      amtEl.appendChild(ownerEl);
    }
    row.appendChild(amtEl);
    payoutCard.appendChild(row);
  });
  container.appendChild(payoutCard);

  // ── Standings ────────────────────────────────────────────────────────────────
  const standingsCard = mkCard();
  standingsCard.style.marginTop = "12px";
  const standingsHeader = document.createElement("div");
  standingsHeader.className = "section-header";
  standingsHeader.textContent = "Standings";
  standingsCard.appendChild(standingsHeader);

  participants.forEach(p => {
    const team = p.team;
    const isOut = !!team && isTeamEliminated(team.name, eliminatedNames);

    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);gap:10px;";

    const left = document.createElement("div");

    const nameEl = document.createElement("div");
    nameEl.style.cssText = `font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:1px;${isOut ? "opacity:0.4;text-decoration:line-through;" : ""}`;
    nameEl.textContent = p.name;
    left.appendChild(nameEl);

    if (team) {
      const chipsEl = document.createElement("div");
      chipsEl.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-top:5px;";
      const chip = document.createElement("span");
      chip.className = `team-chip${isOut ? " eliminated" : ""}`;
      chip.textContent = `${team.flag} ${team.name}`;
      chipsEl.appendChild(chip);
      left.appendChild(chipsEl);
    }

    row.appendChild(left);

    const statusEl = document.createElement("div");
    statusEl.style.cssText = `color:${isOut ? "var(--error)" : "var(--green)"};font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:1px;white-space:nowrap;margin-top:4px;`;
    statusEl.textContent = isOut ? "OUT" : "ALIVE";
    row.appendChild(statusEl);

    standingsCard.appendChild(row);
  });
  container.appendChild(standingsCard);

  // ── Admin controls ───────────────────────────────────────────────────────────
  if (isAdmin) {
    renderEliminationPanel(container, participants, eliminatedNames);
    if (!finalStandings.champion) {
      renderFinalStandingsPanel(container, participants, potTotal);
    }
  }
}

function renderEliminationPanel(container, participants, eliminatedNames) {
  const panel = mkCard();
  panel.style.marginTop = "12px";

  const header = document.createElement("div");
  header.className = "section-header";
  header.textContent = "Mark Team Eliminated";
  panel.appendChild(header);

  const allTeams = [];
  participants.forEach(p => {
    const team = p.team;
    if (team && !isTeamEliminated(team.name, eliminatedNames)) {
      allTeams.push({ participantName: p.name, participantId: p.id, team });
    }
  });

  if (allTeams.length === 0) {
    const msg = document.createElement("p");
    msg.style.cssText = "color:var(--muted);font-size:13px;";
    msg.textContent = "All teams have been eliminated.";
    panel.appendChild(msg);
  } else {
    const select = document.createElement("select");
    select.style.cssText = "background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-family:Outfit,sans-serif;font-size:14px;width:100%;outline:none;margin-bottom:10px;";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a team...";
    select.appendChild(placeholder);

    allTeams.forEach((entry, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `${entry.team.flag} ${entry.team.name} (${entry.participantName})`;
      select.appendChild(opt);
    });

    const elimBtn = document.createElement("button");
    elimBtn.className = "btn-danger";
    elimBtn.style.width = "100%";
    elimBtn.textContent = "Mark as Eliminated";

    elimBtn.addEventListener("click", async () => {
      const idx = parseInt(select.value);
      if (isNaN(idx)) { alert("Select a team first."); return; }
      const entry = allTeams[idx];
      if (!confirm(`Mark ${entry.team.flag} ${entry.team.name} as eliminated?`)) return;
      elimBtn.disabled = true;
      try {
        await updateDoc(doc(db, "pool", "main"), {
          eliminatedTeams: arrayUnion({
            name:            entry.team.name,
            flag:            entry.team.flag,
            participantName: entry.participantName,
            eliminatedAt:    new Date().toISOString()
          })
        });
        const { renderPot } = await import("./pot.js");
        renderPot(container, true);
      } catch (err) {
        console.error(err);
        alert("Failed to mark team as eliminated. Please try again.");
        elimBtn.disabled = false;
      }
    });

    panel.appendChild(select);
    panel.appendChild(elimBtn);
  }
  container.appendChild(panel);
}

function renderFinalStandingsPanel(container, participants, potTotal) {
  const panel = mkCard();
  panel.style.marginTop = "12px";

  const header = document.createElement("div");
  header.className = "section-header";
  header.textContent = "Set Final Standings (end of tournament)";
  panel.appendChild(header);

  const allTeamOptions = [];
  participants.forEach(p => {
    if (p.team) allTeamOptions.push({ participantName: p.name, team: p.team });
  });

  function makeSelect(id, labelText) {
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "10px";

    const label = document.createElement("label");
    label.style.cssText = "color:var(--muted);font-size:12px;display:block;margin-bottom:4px;";
    label.textContent = labelText;
    wrapper.appendChild(label);

    const sel = document.createElement("select");
    sel.id = id;
    sel.style.cssText = "background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-family:Outfit,sans-serif;font-size:14px;width:100%;outline:none;";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select team...";
    sel.appendChild(placeholder);

    allTeamOptions.forEach((entry, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `${entry.team.flag} ${entry.team.name} (${entry.participantName})`;
      sel.appendChild(opt);
    });
    wrapper.appendChild(sel);
    return wrapper;
  }

  panel.appendChild(makeSelect("standing-champion",  "🥇 World Cup Champion"));
  panel.appendChild(makeSelect("standing-runnerup",  "🥈 Runner-Up"));
  panel.appendChild(makeSelect("standing-third",     "🥉 Third Place"));

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn-primary";
  saveBtn.style.width = "100%";
  saveBtn.textContent = "Lock Final Standings";

  saveBtn.addEventListener("click", async () => {
    const c  = parseInt(panel.querySelector("#standing-champion").value);
    const ru = parseInt(panel.querySelector("#standing-runnerup").value);
    const tp = parseInt(panel.querySelector("#standing-third").value);
    if (isNaN(c) || isNaN(ru) || isNaN(tp)) { alert("Please select all three standings."); return; }
    if (!confirm("Lock final standings? This cannot be undone.")) return;

    saveBtn.disabled = true;
    const mk = (entry) => ({
      teamName:        entry.team.name,
      flag:            entry.team.flag,
      participantName: entry.participantName
    });

    try {
      await updateDoc(doc(db, "pool", "main"), {
        "finalStandings.champion":  mk(allTeamOptions[c]),
        "finalStandings.runnerUp":  mk(allTeamOptions[ru]),
        "finalStandings.thirdPlace":mk(allTeamOptions[tp])
      });
      const { renderPot } = await import("./pot.js");
      renderPot(container, true);
    } catch (err) {
      console.error(err);
      alert("Failed to save standings. Please try again.");
      saveBtn.disabled = false;
    }
  });

  panel.appendChild(saveBtn);
  container.appendChild(panel);
}

function mkCard() {
  const d = document.createElement("div");
  d.className = "card";
  return d;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/pot.js
git commit -m "feat: pot tab — 1 team per participant, no tier refs, elimination panel updated"
```

---

## Task 7: players.js — 1 team per participant

**Files:**
- Modify: `js/players.js`

**Interfaces:**
- Consumes: `p.team: { name, flag }` from Firestore

- [ ] **Step 1: Update list view — alive/out calculation and chip rendering**

Find the block starting at line 138 (`participants.forEach(p => {`) and replace the `teams`/`aliveTeams`/`isOut` calculation and chip rendering. Specifically replace these sections:

**Replace lines 139–141** (teams/aliveTeams/isOut):
```js
    const team     = p.team;
    const isOut    = !!team && isTeamEliminated(team.name, eliminatedNames);
```

**Replace lines 167–175** (status badge text):
```js
      badge.textContent = isOut ? "OUT" : "ALIVE";
```

**Replace lines 179–191** (chip rendering loop):
```js
    if (pool.drawCompleted && team) {
      const chips = mk("div");
      chips.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;";
      const elim = isTeamEliminated(team.name, eliminatedNames);
      const chip = mk("span", `team-chip${elim ? " eliminated" : ""}`);
      chip.textContent = `${team.flag} ${team.name}`;
      chips.appendChild(chip);
      card.appendChild(chips);
    }
```

- [ ] **Step 2: Update detail view — remove tier badge, simplify team section**

In `showDetail()`, find the `tierLabel` setup and the `["big","smaller","underdog"].forEach(...)` loop (around lines 217–328). Replace the entire `// ── Teams breakdown card` section:

```js
  // ── Teams breakdown card
  if (p.team) {
    const teamsCard = mk("div", "card");
    teamsCard.style.marginBottom = "12px";
    teamsCard.dataset.ga = "1";

    const teamsHdr = mk("div", "section-header");
    teamsHdr.textContent = "Draw Assignment";
    teamsCard.appendChild(teamsHdr);

    const t = p.team;
    const elim     = isTeamEliminated(t.name, eliminatedNames);
    const elimInfo = eliminatedMap[t.name.toLowerCase()];

    const row = mk("div");
    row.style.cssText = "display:flex;align-items:center;gap:12px;padding:13px 0;";

    const info = mk("div");
    info.style.flex = "1";

    const teamName = mk("div");
    teamName.style.cssText = `font-size:17px;${elim ? "opacity:0.42;text-decoration:line-through;" : ""}`;
    teamName.textContent = `${t.flag} ${t.name}`;
    info.appendChild(teamName);

    if (elim && elimInfo?.eliminatedAt) {
      const dateEl = mk("div");
      dateEl.style.cssText = "font-size:11px;color:var(--muted);margin-top:2px;font-family:'IBM Plex Mono',monospace;";
      const d = new Date(elimInfo.eliminatedAt);
      dateEl.textContent = `Eliminated ${d.toLocaleDateString([], { day: "numeric", month: "short" })}`;
      info.appendChild(dateEl);
    }
    row.appendChild(info);

    const statusBadge = mk("div");
    statusBadge.style.cssText = `font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:1px;white-space:nowrap;color:${elim ? "var(--error)" : "var(--green)"};`;
    statusBadge.textContent = elim ? "OUT" : "ALIVE";
    row.appendChild(statusBadge);

    teamsCard.appendChild(row);
    container.appendChild(teamsCard);
  }
```

Also update the status line in detail view (around line 258–264):
```js
  if (isOut) {
    statusLine.textContent = "ELIMINATED — TEAM OUT";
  } else if (p.team) {
    statusLine.textContent = "TEAM STILL IN";
  } else {
    statusLine.textContent = "NO TEAM ASSIGNED YET";
  }
```

- [ ] **Step 3: Update match history date range**

Find line 369: `const start = new Date("2026-06-11");`
Replace with: `const start = new Date("2026-06-28");`

And update `renderMatchHistory` call — `playerTeams` now comes from a single team. Replace the call site (around line 346):

```js
  if (p.team) {
    const histCard = mk("div", "card");
    histCard.style.marginBottom = "12px";
    histCard.dataset.ga = "1";

    const histHdr = mk("div", "section-header");
    histHdr.textContent = "Match History";
    histCard.appendChild(histHdr);

    const histBody = mk("div");
    histBody.style.marginTop = "8px";
    histCard.appendChild(histBody);

    container.appendChild(histCard);
    renderMatchHistory(histBody, [p.team]).catch(() => {
      histBody.innerHTML = `<div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted);padding:6px 0;">Could not load match history.</div>`;
    });
  }
```

Also update `renderMatchHistory` to accept plain team objects (not keyed entries). Find the `playerPoolTeams` mapping and replace:

```js
  const playerPoolTeams = playerTeams.map(t => ({
    participantName: "",
    tierKey: "assigned",
    team: { name: t.name, flag: t.flag }
  }));
```

- [ ] **Step 4: Also remove the `tierLabel` setup in showDetail that's now unused**

Find and remove these lines in `showDetail()`:
```js
  const tierLabel  = {};
  (pool.tiers || []).forEach(t => { tierLabel[t.key] = t; });
```

- [ ] **Step 5: Commit**

```bash
git add js/players.js
git commit -m "feat: players tab — 1 team per participant, remove tier badges, knockout match history"
```

---

## Task 8: admin.js — Remove tier editor + bump max to 30

**Files:**
- Modify: `js/admin.js`

- [ ] **Step 1: Update import — remove DEFAULT_TIERS**

Replace line 2:
```js
import { db } from "./config.js";
```

- [ ] **Step 2: Update loadPool() — remove tiers from initial seed**

Replace the `loadPool` function:

```js
async function loadPool() {
  const snap = await getDoc(POOL_REF());
  if (snap.exists()) return snap.data();
  const initial = {
    drawCompleted: false,
    drawDate: null,
    buyIn: 100,
    eliminatedTeams: [],
    finalStandings: { champion: null, runnerUp: null, thirdPlace: null }
  };
  await setDoc(POOL_REF(), initial);
  return initial;
}
```

- [ ] **Step 3: Update renderAdminUI() — remove tier editor call**

In `renderAdminUI()`, find the `if (!drawDone)` block and remove the `renderTierEditor` call:

```js
  if (!drawDone) {
    renderParticipantManager(container, participants, registeredUsers);
    renderDrawButton(container, participants);
  } else {
```

Also update the header status text (line 69):
```js
        : `Draw not yet run. ${participants.length}/30 participants added.`}
```

- [ ] **Step 4: Update renderParticipantManager() — bump limit to 30**

Replace all 4 occurrences of `16` with `30`:

- Line 94: `section.innerHTML = \`<h3>Participants (${participants.length}/30)</h3>\`;`
- Line 159: `if (participants.length >= 30) { alert("Maximum 30 participants reached."); return; }`
- Line 204: `if (participants.length >= 30) {`
- Line 205: `  alert("Maximum 30 participants reached.");`

- [ ] **Step 5: Update renderDrawButton() — remove tier validation, simplify draw call**

Replace the entire `renderDrawButton` function:

```js
function renderDrawButton(container, participants) {
  const section = el("div", "admin-section");
  const n = participants.length;

  const validationEl = el("div", "card");
  validationEl.style.marginBottom = "12px";

  const drawBtn = el("button", "btn-primary");
  drawBtn.style.width = "100%";
  drawBtn.style.fontSize = "22px";
  drawBtn.style.padding = "16px";
  drawBtn.style.letterSpacing = "2px";
  drawBtn.textContent = "RUN THE DRAW";

  function validate() {
    const issues = [];
    if (n < 2)  issues.push(`Need at least 2 participants (have ${n}).`);
    if (n > 30) issues.push(`Maximum 30 participants allowed (have ${n}).`);
    if (issues.length === 0) {
      validationEl.innerHTML = `<p style="color:var(--green);font-size:13px;">✓ Ready to draw ${n} participants from 31 knockout teams.</p>`;
      drawBtn.disabled = false;
    } else {
      validationEl.innerHTML = issues.map(i => `<p style="color:var(--warning);font-size:13px;">⚠ ${i}</p>`).join("");
      drawBtn.disabled = true;
    }
  }

  drawBtn.addEventListener("click", async () => {
    if (!confirm(`Run the draw for ${n} participants? This cannot be undone.`)) return;
    const { runDraw } = await import("./draw.js");
    drawBtn.disabled = true;
    drawBtn.textContent = "Drawing...";
    try {
      await runDraw(participants);
      drawBtn.textContent = "Draw complete!";
      const { renderAdmin } = await import("./admin.js");
      const container = document.getElementById("tab-admin");
      container.innerHTML = "";
      renderAdmin(container);
    } catch (err) {
      console.error(err);
      drawBtn.textContent = "Error — try again";
      drawBtn.disabled = false;
    }
  });

  validate();
  section.appendChild(validationEl);
  section.appendChild(drawBtn);
  container.appendChild(section);
}
```

- [ ] **Step 6: Delete renderTierEditor function**

Remove the entire `renderTierEditor` function (lines 238–320 in the original file — from `function renderTierEditor(` through its closing `}`).

- [ ] **Step 7: Commit**

```bash
git add js/admin.js
git commit -m "feat: admin — remove tier editor, bump max participants to 30, simplify draw call"
```

---

## Task 9: Cleanup + push to remote

**Files:**
- Delete: `js/leaderboard.js`

- [ ] **Step 1: Delete leaderboard.js**

```bash
rm "/Users/usamagierdien/Desktop/Legacy Fifa Draw/legacy-sweep-stakes/js/leaderboard.js"
```

- [ ] **Step 2: Update TRACKER.md in the legacy-sweep-stakes repo**

Add an entry at the top of TRACKER.md documenting all the changes made in this implementation.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: remove unused leaderboard.js and update tracker"
```

- [ ] **Step 4: Push to remote**

```bash
cd "/Users/usamagierdien/Desktop/Legacy Fifa Draw/legacy-sweep-stakes"
git push -u origin main
```

Expected output:
```
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

- [ ] **Step 5: Confirm with user to set up Firebase**

At this point, prompt the user:

> "All changes are pushed. Now set up the new Firebase project:
> 1. Go to console.firebase.google.com → Create project
> 2. Enable Email/Password Auth (Authentication → Sign-in method)
> 3. Enable Firestore (Firestore Database → Create database, start in production mode)
> 4. Go to Project Settings → Your apps → Add web app → copy the config object
> 5. Paste the credentials into `js/config.js` replacing the REPLACE_WITH_* placeholders
> 6. Commit and push again"

---

## Self-Review

**Spec coverage check:**
- ✅ 30 max participants (admin.js Task 8)
- ✅ 31 knockout teams flat list (config.js Task 1)
- ✅ Big team priority in draw — never unowned (draw.js Task 2)
- ✅ 1 team per participant (draw.js, pool.js, pot.js, players.js Tasks 2/5/6/7)
- ✅ No tier display anywhere (pool.js, pot.js, players.js, admin.js)
- ✅ Leaderboard removed (Task 9)
- ✅ Legacy brand colours (css/styles.css Task 4)
- ✅ Logo + app name (index.html Task 3)
- ✅ R100 buy-in preserved in loadPool seed (admin.js Task 8)
- ✅ 60/25/15 payouts preserved (pot.js Task 6)
- ✅ Match history date adjusted to knockout start 2026-06-28 (players.js Task 7)
- ✅ Firebase placeholder credentials with clear comments (config.js Task 1)
- ✅ Push to legacy-sweep-stakes remote (Task 9)

**Placeholder scan:** No TBDs. Firebase credentials intentionally use `REPLACE_WITH_*` prefix — this is by design and clearly documented.

**Type consistency:** `p.team` used consistently across pool.js, pot.js, players.js, draw.js. `runDraw(participants)` called without tiers in admin.js draw button handler.

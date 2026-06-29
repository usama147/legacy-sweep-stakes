// js/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCooGtLEKnhmAOqe1TuuAop7uoMWnKMT8Y",
  authDomain:        "legacysweepstakes.firebaseapp.com",
  projectId:         "legacysweepstakes",
  storageBucket:     "legacysweepstakes.firebasestorage.app",
  messagingSenderId: "942389835868",
  appId:             "1:942389835868:web:ed074e491572654a5fce99",
  measurementId:     "G-GQ6XHNMKQS"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

export const ADMIN_EMAIL = "usama@brandesign.co.za";

// ── All 32 R32 knockout teams ────────────────────────────────────────────────
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
  // Non-big teams (18) — 16 assigned, 2 randomly left unowned
  { name: "Mexico",             flag: "🇲🇽" },
  { name: "South Africa",       flag: "🇿🇦" },
  { name: "Canada",             flag: "🇨🇦" },
  { name: "Bosnia-Herzegovina", flag: "🇧🇦" },
  { name: "USA",                flag: "🇺🇸" },
  { name: "Australia",          flag: "🇦🇺" },
  { name: "Paraguay",           flag: "🇵🇾" },
  { name: "Ivory Coast",        flag: "🇨🇮" },
  { name: "Ecuador",            flag: "🇪🇨" },
  { name: "Sweden",             flag: "🇸🇪" },
  { name: "Egypt",              flag: "🇪🇬" },
  { name: "Cape Verde",         flag: "🇨🇻" },
  { name: "Norway",             flag: "🇳🇴" },
  { name: "Senegal",            flag: "🇸🇳" },
  { name: "Austria",            flag: "🇦🇹" },
  { name: "Algeria",            flag: "🇩🇿" },
  { name: "DR Congo",           flag: "🇨🇩" },
  { name: "Ghana",              flag: "🇬🇭" },
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

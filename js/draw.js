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

// js/admin.js
import { db } from "./config.js";
import {
  doc, getDoc, setDoc, collection,
  getDocs, addDoc, deleteDoc, serverTimestamp, writeBatch, updateDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

async function loadRegisteredUsers() {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(d => d.data()).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

const POOL_REF = () => doc(db, "pool", "main");
const PARTS_REF = () => collection(db, "pool", "main", "participants");

// ── Entry point ──────────────────────────────────────────────────────────────
export async function renderAdmin(container) {
  container.innerHTML = `<div class="loading">Loading admin panel...</div>`;

  let poolData = await loadPool();
  const [participants, registeredUsers] = await Promise.all([
    loadParticipants(),
    loadRegisteredUsers()
  ]);

  container.innerHTML = "";
  renderAdminUI(container, poolData, participants, registeredUsers);
}

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

async function loadParticipants() {
  const snap = await getDocs(PARTS_REF());
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.drawOrder - b.drawOrder || a.addedAt?.seconds - b.addedAt?.seconds);
}

// ── Main admin UI ────────────────────────────────────────────────────────────
function renderAdminUI(container, poolData, participants, registeredUsers) {
  const drawDone = poolData.drawCompleted;

  // Page header
  const header = el("div", "admin-section");
  header.innerHTML = `
    <h2 style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;margin-bottom:4px;">
      Admin Panel
    </h2>
    <p style="color:var(--muted);font-size:13px;">
      ${drawDone
        ? `Draw completed on ${new Date(poolData.drawDate?.seconds * 1000).toLocaleDateString()}.`
        : `Draw not yet run. ${participants.length}/30 participants added.`}
    </p>`;
  container.appendChild(header);

  if (!drawDone) {
    renderParticipantManager(container, participants, registeredUsers);
    renderDrawButton(container, participants);
  } else {
    const lockNotice = el("div", "card");
    lockNotice.innerHTML = `
      <p style="color:var(--muted);font-size:13px;text-align:center;">
        ✅ Draw is locked. Team assignments are set in stone.<br>
        Elimination controls are in the <strong>Pot</strong> tab.
      </p>`;
    container.appendChild(lockNotice);

    renderPaidManager(container, participants);
    renderResetPanel(container, participants);
  }
}

// ── Participant manager ──────────────────────────────────────────────────────
function renderParticipantManager(container, participants, registeredUsers) {
  const section = el("div", "admin-section");
  section.innerHTML = `<h3>Participants (${participants.length}/30)</h3>`;

  const listEl = el("div", "participant-list");
  section.appendChild(listEl);

  function refreshList(parts) {
    listEl.innerHTML = "";
    if (parts.length === 0) {
      listEl.innerHTML = `<p style="color:var(--muted);font-size:13px;">No participants yet.</p>`;
    }
    parts.forEach(p => {
      const row = el("div", "participant-row");
      const nameSpan = el("span");
      nameSpan.textContent = p.name;
      row.appendChild(nameSpan);
      const delBtn = el("button", "btn-danger btn-sm");
      delBtn.textContent = "Remove";
      delBtn.addEventListener("click", async () => {
        if (!confirm(`Remove ${p.name}?`)) return;
        delBtn.disabled = true;
        try {
          await deleteDoc(doc(db, "pool", "main", "participants", p.id));
          const { renderAdmin } = await import("./admin.js");
          renderAdmin(document.getElementById("tab-admin"));
        } catch (err) {
          console.error(err);
          alert("Failed to remove participant. Please try again.");
          delBtn.disabled = false;
        }
      });
      row.appendChild(delBtn);
      listEl.appendChild(row);
    });
  }

  refreshList(participants);

  // Registered users chips
  if (registeredUsers.length > 0) {
    const regHeader = el("p");
    regHeader.style.cssText = "color:var(--muted);font-size:12px;letter-spacing:1px;font-family:'IBM Plex Mono',monospace;margin:14px 0 8px;";
    regHeader.textContent = "SIGNED-UP USERS — click to add";
    section.appendChild(regHeader);

    const chipsEl = el("div");
    chipsEl.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;";

    function renderChips() {
      chipsEl.innerHTML = "";
      const addedNames = new Set(participants.map(p => p.name.toLowerCase()));
      registeredUsers.forEach(user => {
        const chip = el("button");
        const alreadyAdded = addedNames.has(user.name.toLowerCase());
        chip.style.cssText = `
          background:${alreadyAdded ? "rgba(0,217,108,0.1)" : "rgba(255,255,255,0.06)"};
          border:1px solid ${alreadyAdded ? "var(--green)" : "var(--border)"};
          border-radius:20px;padding:6px 14px;color:${alreadyAdded ? "var(--green)" : "var(--text)"};
          font-family:Outfit,sans-serif;font-size:13px;cursor:${alreadyAdded ? "default" : "pointer"};
          transition:background 0.15s;
        `;
        chip.textContent = alreadyAdded ? `✓ ${user.name}` : `+ ${user.name}`;
        chip.disabled = alreadyAdded;

        if (!alreadyAdded) {
          chip.addEventListener("click", async () => {
            if (participants.length >= 30) { alert("Maximum 30 participants reached."); return; }
            chip.disabled = true;
            try {
              await addDoc(PARTS_REF(), {
                name: user.name,
                addedAt: serverTimestamp(),
                drawOrder: participants.length + 1,
                team: null
              });
              const { renderAdmin } = await import("./admin.js");
              renderAdmin(document.getElementById("tab-admin"));
            } catch (err) {
              console.error(err);
              alert("Failed to add participant. Please try again.");
              chip.disabled = false;
            }
          });
        }
        chipsEl.appendChild(chip);
      });
    }

    renderChips();
    section.appendChild(chipsEl);

    const divider = el("p");
    divider.style.cssText = "color:var(--muted);font-size:12px;letter-spacing:1px;font-family:'IBM Plex Mono',monospace;margin:0 0 8px;";
    divider.textContent = "OR ADD MANUALLY";
    section.appendChild(divider);
  }

  // Add participant row
  const addRow = el("div", "add-row");
  const nameInput = el("input");
  nameInput.placeholder = "Participant name";
  nameInput.maxLength = 30;
  const addBtn = el("button", "btn-primary btn-sm");
  addBtn.textContent = "Add";
  addBtn.style.fontFamily = "Outfit, sans-serif";
  addBtn.style.fontSize = "14px";
  addBtn.style.padding = "10px 16px";

  addBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    if (participants.length >= 30) {
      alert("Maximum 30 participants reached.");
      return;
    }
    if (participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      alert("A participant with that name already exists.");
      return;
    }
    addBtn.disabled = true;
    try {
      await addDoc(PARTS_REF(), {
        name,
        addedAt: serverTimestamp(),
        drawOrder: participants.length + 1,
        team: null
      });
      const { renderAdmin } = await import("./admin.js");
      renderAdmin(document.getElementById("tab-admin"));
    } catch (err) {
      console.error(err);
      alert("Failed to add participant. Please try again.");
      addBtn.disabled = false;
    }
  });

  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addBtn.click(); });

  addRow.appendChild(nameInput);
  addRow.appendChild(addBtn);
  section.appendChild(addRow);
  container.appendChild(section);
}

// ── Draw button ──────────────────────────────────────────────────────────────
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

// ── Paid manager ─────────────────────────────────────────────────────────────
function renderPaidManager(container, participants) {
  const section = el("div", "admin-section");
  section.innerHTML = `<h3>Payment Tracker</h3>`;

  const listEl = el("div");
  listEl.style.cssText = "display:flex;flex-direction:column;gap:8px;";

  participants.forEach(p => {
    const row = el("div");
    row.style.cssText = "display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:10px 14px;";

    const nameEl = el("span");
    nameEl.style.flex = "1";
    nameEl.textContent = p.name;
    row.appendChild(nameEl);

    if (p.paid) {
      const badge = el("span", "paid-badge");
      badge.textContent = "PAID";
      row.appendChild(badge);
    }

    const btn = el("button", `${p.paid ? "btn-ghost" : "btn-primary"} btn-sm`);
    btn.style.whiteSpace = "nowrap";
    btn.textContent = p.paid ? "Unmark" : "Mark Paid";

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await updateDoc(doc(db, "pool", "main", "participants", p.id), { paid: !p.paid });
        const { renderAdmin } = await import("./admin.js");
        renderAdmin(document.getElementById("tab-admin"));
      } catch (err) {
        console.error(err);
        alert("Failed to update payment status. Please try again.");
        btn.disabled = false;
      }
    });

    row.appendChild(btn);
    listEl.appendChild(row);
  });

  section.appendChild(listEl);
  container.appendChild(section);
}

// ── Reset draw ────────────────────────────────────────────────────────────────
function renderResetPanel(container, participants) {
  const section = el("div", "admin-section");
  section.style.marginTop = "16px";
  section.innerHTML = `<h3 style="color:var(--error);">Danger Zone</h3>`;

  const desc = el("p");
  desc.style.cssText = "color:var(--muted);font-size:13px;margin-bottom:12px;";
  desc.textContent = "Reset the draw to run it again. This clears all team assignments and elimination data, but keeps all participant accounts.";
  section.appendChild(desc);

  const resetBtn = el("button", "btn-danger");
  resetBtn.style.width = "100%";
  resetBtn.textContent = "Reset Draw";

  resetBtn.addEventListener("click", async () => {
    if (!confirm("Reset the draw? This will clear all team assignments and elimination data. Participant accounts are kept. This cannot be undone.")) return;
    resetBtn.disabled = true;
    resetBtn.textContent = "Resetting...";

    try {
      const batch = writeBatch(db);

      // Clear participant team assignments
      participants.forEach(p => {
        const ref = doc(db, "pool", "main", "participants", p.id);
        batch.update(ref, { team: null });
      });

      // Reset pool flags
      const poolRef = doc(db, "pool", "main");
      batch.update(poolRef, {
        drawCompleted: false,
        drawDate: null,
        eliminatedTeams: [],
        "finalStandings.champion":   null,
        "finalStandings.runnerUp":   null,
        "finalStandings.thirdPlace": null,
      });

      await batch.commit();

      resetBtn.textContent = "Reset complete!";
      setTimeout(async () => {
        const { renderAdmin } = await import("./admin.js");
        const adminContainer = document.getElementById("tab-admin");
        adminContainer.innerHTML = "";
        renderAdmin(adminContainer);
      }, 800);
    } catch (err) {
      console.error(err);
      alert("Reset failed. Please try again.");
      resetBtn.disabled = false;
      resetBtn.textContent = "Reset Draw";
    }
  });

  section.appendChild(resetBtn);
  container.appendChild(section);
}

// ── Utility ──────────────────────────────────────────────────────────────────
function el(tag, className = "") {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

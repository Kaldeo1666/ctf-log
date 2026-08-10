// ctf-log: read-only viewer. Data comes entirely from data/challenges.json.
// This page never writes anywhere — it only renders what's already in the repo.

const state = {
  entries: [],
  domains: [],
  difficulties: [],
  activeDomain: "All",
  activeDifficulty: "All",
  query: ""
};

async function init() {
  const res = await fetch("data/challenges.json", { cache: "no-store" });
  const data = await res.json();
  state.entries = [...data.entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  state.domains = data.domains || [];
  state.difficulties = data.difficulties || ["Easy", "Medium", "Hard"];

  renderHeatmap(state.entries);
  renderStatusbar(state.entries);
  renderFilters();
  renderEntries();

  document.getElementById("search").addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderEntries();
  });
}

// Format a Date using its LOCAL calendar date (not UTC) as YYYY-MM-DD.
// Using toISOString() here would silently shift the date for anyone
// not in the UTC timezone (e.g. it can show "yesterday" for most of
// the day in timezones ahead of UTC, like IST).
function localDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------- Heatmap (GitHub-style, ~18 weeks) ----------
function renderHeatmap(entries) {
  const counts = {};
  entries.forEach((e) => { counts[e.date] = (counts[e.date] || 0) + 1; });

  const days = 18 * 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDateKey(d);
    const c = counts[key] || 0;
    let level = 0;
    if (c === 1) level = 1;
    else if (c === 2) level = 2;
    else if (c === 3) level = 3;
    else if (c >= 4) level = 4;
    cells.push({ key, level, c });
  }

  const grid = document.getElementById("heatmap");
  grid.innerHTML = "";
  cells.forEach(({ key, level, c }) => {
    const div = document.createElement("div");
    div.className = "heat-cell";
    div.dataset.level = level;
    div.title = `${key}: ${c} entr${c === 1 ? "y" : "ies"}`;
    grid.appendChild(div);
  });
}

// ---------- Status bar ----------
function renderStatusbar(entries) {
  const total = entries.length;
  const byDomain = {};
  entries.forEach((e) => { byDomain[e.domain] = (byDomain[e.domain] || 0) + 1; });
  const topDomain = Object.entries(byDomain).sort((a, b) => b[1] - a[1])[0];

  // streak: consecutive days ending today or yesterday with >=1 entry
  const dateSet = new Set(entries.map((e) => e.date));
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // allow streak to still "count" if today has no entry yet but yesterday did
  if (!dateSet.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dateSet.has(localDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const lastDate = entries[0] ? entries[0].date : "—";

  document.getElementById("statusbar").innerHTML = `
    <span>entries: <b>${total}</b></span>
    <span>streak: <b>${streak}d</b></span>
    <span>top domain: <b>${topDomain ? topDomain[0] : "—"}</b></span>
    <span>last logged: <b>${lastDate}</b></span>
  `;
}

// ---------- Filters ----------
function renderFilters() {
  const domainRow = document.getElementById("domain-filters");
  const diffRow = document.getElementById("difficulty-filters");

  const allDomains = ["All", ...state.domains];
  domainRow.innerHTML = allDomains.map((d) =>
    `<button class="chip ${d === state.activeDomain ? "active" : ""}" data-domain="${d}">${d}</button>`
  ).join("");

  const allDiffs = ["All", ...state.difficulties];
  diffRow.innerHTML = allDiffs.map((d) => {
    const cls = d === "Easy" ? "easy" : d === "Hard" ? "hard" : "";
    return `<button class="chip ${cls} ${d === state.activeDifficulty ? "active" : ""}" data-diff="${d}">${d}</button>`;
  }).join("");

  domainRow.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeDomain = btn.dataset.domain;
      renderFilters();
      renderEntries();
    });
  });
  diffRow.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeDifficulty = btn.dataset.diff;
      renderFilters();
      renderEntries();
    });
  });
}

// ---------- Entries ----------
function renderEntries() {
  const list = document.getElementById("entries");
  let filtered = state.entries.filter((e) => {
    if (state.activeDomain !== "All" && e.domain !== state.activeDomain) return false;
    if (state.activeDifficulty !== "All" && e.difficulty !== state.activeDifficulty) return false;
    if (state.query) {
      const hay = `${e.title} ${e.summary} ${e.learnings} ${(e.tools || []).join(" ")}`.toLowerCase();
      if (!hay.includes(state.query)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">No entries match these filters yet.</div>`;
    return;
  }

  list.innerHTML = filtered.map((e) => {
    const diffClass = (e.difficulty || "").toLowerCase();
    const tools = (e.tools || []).join(", ");
    return `
      <div class="card ${diffClass}">
        <div class="card-top">
          <h3 class="card-title">${escapeHtml(e.title)}</h3>
          <span class="card-date">${e.date}</span>
        </div>
        <div class="tags">
          <span class="tag domain">${escapeHtml(e.domain)}</span>
          <span class="tag diff-${diffClass}">${escapeHtml(e.difficulty)}</span>
          ${e.event ? `<span class="tag event">${escapeHtml(e.event)}</span>` : ""}
        </div>
        <p class="card-summary">${escapeHtml(e.summary || "")}</p>
        ${e.learnings ? `<div class="card-learnings">${escapeHtml(e.learnings)}</div>` : ""}
        ${tools ? `<div class="card-tools"><b>tools:</b> ${escapeHtml(tools)}</div>` : ""}
        ${e.writeup_url ? `<div class="card-tools"><a href="${escapeAttr(e.writeup_url)}" target="_blank" rel="noopener">full writeup →</a></div>` : ""}
      </div>
    `;
  }).join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

init();

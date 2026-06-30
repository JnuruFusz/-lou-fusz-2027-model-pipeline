/* ---------------------------------------------------------------
   Upcoming Models — intel cards + OEM shelf
   --------------------------------------------------------------- */

const OEM_LINKS = [
  { make: "Toyota",    label: "Toyota",           url: "https://pressroom.toyota.com/whats-new-for-2027/",             note: "Toyota USA Newsroom" },
  { make: "Kia",       label: "Kia",              url: "https://www.kiamedia.com/us/en/media/pressreleases/list",      note: "Kia America Newsroom" },
  { make: "Chevrolet", label: "Chevrolet",         url: "https://news.gm.com/home.html",                               note: "GM Newsroom" },
  { make: "GMC",       label: "GMC",              url: "https://www.gmc.com/future-vehicles",                          note: "GMC Future Vehicles" },
  { make: "Buick",     label: "Buick",            url: "https://news.gm.com/home.html",                               note: "GM Newsroom" },
  { make: "Subaru",    label: "Subaru",           url: "https://media.subaru.com/",                                    note: "Subaru Media" },
  { make: "Mazda",     label: "Mazda",            url: "https://news.mazdausa.com/concept-vehicles",                   note: "Mazda USA Newsroom" },
  { make: "Ford",      label: "Ford",             url: "https://www.ford.com/future-vehicles/",                        note: "Ford Future Vehicles" },
  { make: "Jeep",      label: "CJDR",                          url: "https://media.stellantisnorthamerica.com/",       note: "Stellantis North America Media" },
  { make: "Nissan",    label: "Nissan",           url: "https://global.nissannews.com/en",                             note: "Nissan Global Newsroom" },
];

const INTEL_STORAGE_KEY = "fusz-upcoming-intel";

const DEFAULT_INTEL = [
  {
    id: "default-1", make: "GMC", year: 2027,
    title: "Sierra 1500 — new gen-6 V8s (5.7L and 6.6L)",
    note: "Next-gen Sierra confirmed with new Small Block V8s, motorized displays, and major trim shake-up. Strong signal for Lou Fusz Buick GMC.",
    url: "https://www.gmc.com/future-vehicles", sourceLabel: "GMC Future Vehicles",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "default-2", make: "Kia", year: 2027,
    title: "Seltos — full redesign on new platform, starts $24,990",
    note: "All-new second-gen Seltos comprehensively re-engineered. New platform, revised engines, hybrid variant to follow. Good volume model for Kia stores.",
    url: "https://www.kiamedia.com/us/en/media/pressreleases/24459/kia-teases-all-new-2027-seltos-ahead-of-new-york-auto-show", sourceLabel: "Kia America Newsroom",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "default-3", make: "Kia", year: 2027,
    title: "Sportage — going hybrid-only next gen",
    note: "Sixth-gen Sportage drops standalone ICE entirely — hybrid and PHEV only. Big shift worth tracking for SEO copy strategy.",
    url: "https://www.kiamedia.com/us/en/media/pressreleases/list", sourceLabel: "Kia America Newsroom",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "default-4", make: "Subaru", year: 2027,
    title: "Getaway — all-electric 3-row SUV, 420hp, ~300mi range",
    note: "Subaru's first electric 3-row. Dual-motor, 420hp. Strong family SUV story for Lou Fusz Subaru locations.",
    url: "https://media.subaru.com/", sourceLabel: "Subaru Media",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "default-5", make: "Nissan", year: 2027,
    title: "Rogue — e-POWER hybrid confirmed, Xterra revival",
    note: "Fourth-gen Rogue gets e-POWER series hybrid. Nissan also reviving Xterra as an adventure SUV. Both relevant for Lou Fusz Nissan Moline.",
    url: "https://global.nissannews.com/en", sourceLabel: "Nissan Global Newsroom",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "default-6", make: "Toyota", year: 2027,
    title: "Highlander — going fully electric",
    note: "All-new electric Highlander confirmed. Big model for Lou Fusz Toyota — worth getting a landing page ready well ahead of inventory.",
    url: "https://pressroom.toyota.com/whats-new-for-2027/", sourceLabel: "Toyota USA Newsroom",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "default-7", make: "Mazda", year: 2027,
    title: "CX-5 — new hybrid + first in-house EV",
    note: "CX-5 gets SKYACTIV-Z hybrid by end of 2027. Mazda's first fully in-house EV also targeting 2027-28. Watch both for Lou Fusz Mazda locations.",
    url: "https://news.mazdausa.com/concept-vehicles", sourceLabel: "Mazda USA Newsroom",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "default-8", make: "Ford", year: 2027,
    title: "Affordable electric pickup — ~$30k target",
    note: "Ford confirmed affordable EV pickup for 2027, prototypes already building in Michigan. Could drive significant traffic if priced right.",
    url: "https://www.ford.com/future-vehicles/", sourceLabel: "Ford Future Vehicles",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
];

function loadIntel() {
  try {
    const stored = JSON.parse(localStorage.getItem(INTEL_STORAGE_KEY) || "null");
    if (Array.isArray(stored)) return stored;
    // First visit — seed defaults and save so user can delete/edit them
    saveIntel(DEFAULT_INTEL);
    return DEFAULT_INTEL;
  } catch { return DEFAULT_INTEL; }
}

function saveIntel(items) {
  localStorage.setItem(INTEL_STORAGE_KEY, JSON.stringify(items));
}

function intelAccentColor(make) {
  const map = {
    Toyota: "#EB0A1E", Kia: "#BB162B", Chevrolet: "#D4B483",
    GMC: "#CF162B", Buick: "#8B6914", Cadillac: "#282828",
    Nissan: "#C3002F", Honda: "#CC0000", Hyundai: "#002C5F", Subaru: "#003399",
  };
  return map[make] || "#2f72d6";
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function wireBrandColor(make) {
  const map = {
    Toyota:"#D81E05", Kia:"#BB162B", Chevrolet:"#C4922F", GMC:"#B8112B",
    Buick:"#5A5A5A", Subaru:"#004B91", Mazda:"#8B1A2B", Ford:"#1C3FAA",
    Jeep:"#6B6B6B", Nissan:"#C3002F",
  };
  return map[make] || "#888";
}

function wireFeaturedHTML(item, isAdmin) {
  const color = wireBrandColor(item.make);
  return `<div class="wire-featured" style="position:relative">
    <div class="wire-featured-meta">
      <span class="wire-featured-label">Featured intel</span>
      <span class="wire-featured-brand">
        <span class="wire-brand-dot" style="background:${color}"></span>
        ${escapeHtml(item.make)} · ${escapeHtml(String(item.year))}
      </span>
      <span class="wire-featured-updated">${escapeHtml(timeAgo(item.createdAt))}</span>
    </div>
    <h2 class="wire-featured-h2">${escapeHtml(item.title)}</h2>
    <p class="wire-featured-body">${escapeHtml(item.note)}</p>
    ${item.url ? `<a class="wire-featured-source" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.sourceLabel || "Source")} ↗</a>` : ""}
    ${isAdmin ? `<button class="wire-featured-delete" type="button" data-delete-intel="${escapeAttr(item.id)}" aria-label="Remove">×</button>` : ""}
  </div>`;
}

function wireRowHTML(item, isAdmin) {
  const color = wireBrandColor(item.make);
  return `<div class="wire-row">
    <div class="wire-row-left">
      <span class="wire-row-year">${escapeHtml(String(item.year))}</span>
      <span class="wire-row-brand">
        <span class="wire-brand-dot" style="background:${color}"></span>
        ${escapeHtml(item.make)}
      </span>
    </div>
    <div class="wire-row-mid">
      <div class="wire-row-title">${escapeHtml(item.title)}</div>
      ${item.note ? `<div class="wire-row-note">${escapeHtml(item.note)}</div>` : ""}
    </div>
    <div class="wire-row-right">
      ${item.url ? `<a class="wire-row-source" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.sourceLabel || "Source")} ↗</a>` : ""}
      <span class="wire-row-time">${escapeHtml(timeAgo(item.createdAt))}</span>
    </div>
    ${isAdmin ? `<button class="wire-row-delete" type="button" data-delete-intel="${escapeAttr(item.id)}" aria-label="Remove">×</button>` : ""}
  </div>`;
}

function wireOemShelfHTML() {
  return `<div class="wire-oem-section">
    <div class="wire-oem-header">
      <span class="wire-oem-label">OEM Source Pages</span>
      <div class="wire-oem-rule"></div>
    </div>
    <p class="wire-oem-sublabel">Brand newsrooms · ${OEM_LINKS.length} sources</p>
    <div class="wire-oem-grid">
      ${OEM_LINKS.map((oem) => `
        <a class="wire-oem-row" href="${oem.url}" target="_blank" rel="noopener" aria-label="${oem.label}">
          <span class="wire-oem-brand">
            <span class="wire-brand-dot" style="background:${wireBrandColor(oem.make)}"></span>
            ${escapeHtml(oem.label)}
          </span>
          <span class="wire-oem-arrow">↗</span>
        </a>`).join("")}
    </div>
  </div>`;
}

function renderUpcoming() {
  const panel = document.getElementById("upcomingPanel");
  if (!panel) return;

  const isAdmin = typeof hasAdminAccess === "function" && hasAdminAccess(state.session);
  const items = loadIntel();
  const [featured, ...rest] = items;

  panel.innerHTML = `
    <div class="wire-header">
      <div class="wire-header-left">
        <p class="wire-eyebrow">Model Intel</p>
        <h1 class="wire-title">Upcoming Models</h1>
        <p class="wire-subtitle">Future model watchlist for Lou Fusz</p>
      </div>
      ${isAdmin ? `<button class="wire-add-btn" id="addIntelButton" type="button">+ Add intel</button>` : ""}
    </div>

    ${featured ? wireFeaturedHTML(featured, isAdmin) : ""}

    <div class="wire-list" id="wireList">
      ${rest.length
        ? rest.map((item) => wireRowHTML(item, isAdmin)).join("")
        : `<p class="wire-empty">No additional intel — ${isAdmin ? "click + Add intel to get started" : "check back soon"}.</p>`
      }
    </div>

    ${wireOemShelfHTML()}
  `;

  renderIntelDialog();

  document.getElementById("addIntelButton")?.addEventListener("click", () => {
    ["intelTitle","intelNote","intelUrl","intelSourceLabel"].forEach((id) => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
    document.getElementById("intelDialog")?.showModal();
  });

  panel.querySelectorAll("[data-delete-intel]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.deleteIntel;
      saveIntel(loadIntel().filter((i) => i.id !== id));
      renderUpcoming();
    });
  });
}

function renderIntelDialog() {
  if (document.getElementById("intelDialog")) return;
  const el = document.createElement("dialog");
  el.id = "intelDialog";
  el.className = "intel-dialog";
  el.innerHTML = `
    <form method="dialog" class="intel-form">
      <h3 class="intel-form-title">Add model intel</h3>
      <div class="intel-form-row">
        <label for="intelMake">Make</label>
        <select id="intelMake">
          ${OEM_LINKS.map((o) => `<option>${o.make}</option>`).join("")}
        </select>
      </div>
      <div class="intel-form-row">
        <label for="intelYear">Year</label>
        <select id="intelYear">
          ${[2027,2028,2029].map((y) => `<option>${y}</option>`).join("")}
        </select>
      </div>
      <div class="intel-form-row">
        <label for="intelTitle">Model / headline</label>
        <input id="intelTitle" type="text" placeholder="e.g. 4Runner TRD Pro — new platform" maxlength="80" required>
      </div>
      <div class="intel-form-row">
        <label for="intelNote">Your note</label>
        <textarea id="intelNote" rows="3" placeholder="Why this matters for Fusz+" maxlength="280"></textarea>
      </div>
      <div class="intel-form-row">
        <label for="intelUrl">Source URL</label>
        <input id="intelUrl" type="url" placeholder="https://pressroom.toyota.com/...">
      </div>
      <div class="intel-form-row">
        <label for="intelSourceLabel">Source label</label>
        <input id="intelSourceLabel" type="text" placeholder="e.g. Toyota Newsroom" maxlength="40">
      </div>
      <div class="intel-form-actions">
        <button type="button" class="button button-quiet" id="intelCancelBtn">Cancel</button>
        <button type="button" class="button button-primary" id="intelSaveBtn">Save</button>
      </div>
    </form>`;
  document.body.appendChild(el);

  document.getElementById("intelCancelBtn").onclick = () => el.close();
  document.getElementById("intelSaveBtn").onclick = () => {
    const title = document.getElementById("intelTitle").value.trim();
    if (!title) { document.getElementById("intelTitle").focus(); return; }
    const item = {
      id: `intel-${Date.now()}`,
      make: document.getElementById("intelMake").value,
      year: parseInt(document.getElementById("intelYear").value),
      title,
      note: document.getElementById("intelNote").value.trim(),
      url: document.getElementById("intelUrl").value.trim(),
      sourceLabel: document.getElementById("intelSourceLabel").value.trim() || "Source",
      createdAt: new Date().toISOString(),
    };
    const items = loadIntel();
    items.unshift(item);
    saveIntel(items);
    el.close();
    renderUpcoming();
    if (typeof showToast === "function") showToast("Intel saved");
  };
}



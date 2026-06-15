async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load ${url}`);
  }
  return response.json();
}

async function fetchInventoryFeed() {
  try {
    const response = await fetch("/data/inventory-feed.csv", { cache: "no-store" });
    if (!response.ok) throw new Error("feed missing");
    const csv = await response.text();
    const rows = parseCsv(csv);
    return {
      connected: rows.length > 0,
      rows,
      message: rows.length ? "CSV connected" : "CSV is empty",
    };
  } catch {
    return {
      connected: false,
      rows: [],
      message: "Waiting on CSV",
    };
  }
}

function parseCsv(csv) {
  const lines = String(csv || "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => normalizeFeedKey(header));
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = (values[index] || "").trim();
      return row;
    }, {});
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function normalizeFeedKey(key) {
  return String(key || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

async function boot() {
  applyTheme(state.selectedTheme);
  normalizeSession();
  bindEvents();
  renderAuth();
  const [tasks, sources, inventoryFeed] = [embeddedTracker, embeddedSources, await fetchInventoryFeed()];
  state.sources = sources;
  state.inventoryFeed = inventoryFeed;
  state.tasks = tasks.map((task) => ({
    ...task,
    pageStatus: normalizePageStatus(state.overrides[task.id] || demoPageStatus(task) || task.pageStatus),
    aeoStatus: state.aeoOverrides[task.id] || inferAeoStatus(state.overrides[task.id] || task.pageStatus),
    details: state.details[task.id] || {},
    inventorySignal: state.signalOverrides[task.id] || inferSignal(task),
    accent: brandAccentOverrides[task.make]?.accent || dealerAccents[task.dealer] || "#2563a9",
    accentStyle: accentStyleForTask(task),
    inventoryUrl: sourceFor(task.dealer)?.inventoryUrl || "",
  }));
  applyInventoryFeedSignals();
  populateYearFilter();
  populateDealerFilter();
  render();
}

function normalizeSession() {
  if (!state.session) return;
  if (state.session.primaryRole && typeof state.session.isAdmin === "boolean") return;

  if (state.session.role === "Admin") {
    state.session = {
      ...state.session,
      name: state.session.name || "Scott Toulou",
      primaryRole: "AEO Writer",
      role: "AEO Writer",
      isAdmin: true,
      defaultView: "admin",
    };
  } else if (state.session.role === "Builder") {
    state.session = {
      ...state.session,
      name: state.session.name || "Jnuru Goodwin",
      primaryRole: "Builder",
      role: "Builder",
      isAdmin: true,
      defaultView: state.session.defaultView || "my_work",
    };
  }

  localStorage.setItem("fusz-demo-session", JSON.stringify(state.session));
}

function demoPageStatus(task) {
  if (state.overrides[task.id]) return null;
  if (task.year !== 2027) return null;
  const model = String(task.model || "").toLowerCase();
  if (model.includes("1500 srt trx")) return "seo_done";
  if (model.includes("cx-50")) return "page_built";
  if (model.includes("seltos")) return "needs_review";
  return null;
}

function applyInventoryFeedSignals() {
  if (!state.inventoryFeed.rows.length) return;
  state.tasks.forEach((task) => {
    if (state.signalOverrides[task.id]) return;
    const feedRow = state.inventoryFeed.rows.find((row) => feedRowMatchesTask(row, task));
    if (!feedRow) return;
    task.inventorySignal = signalFromFeedStatus(feedRow.status || feedRow.vehicle_status || "");
    task.inventoryUrl = feedRow.inventory_url || feedRow.vdp_url || task.inventoryUrl;
  });
}

function feedRowMatchesTask(row, task) {
  return normalizeCompare(row.dealer) === normalizeCompare(task.dealer)
    && String(row.year || "") === String(task.year || "")
    && normalizeCompare(row.make) === normalizeCompare(task.make)
    && normalizeCompare(row.model) === normalizeCompare(task.model);
}

function signalFromFeedStatus(status) {
  const normalized = normalizeCompare(status);
  if (normalized.includes("lot") || normalized.includes("available") || normalized.includes("instock")) return "on_lot";
  if (normalized.includes("ship") || normalized.includes("transit") || normalized.includes("intransit")) return "shipped";
  return "upcoming";
}

function normalizeCompare(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function sourceFor(dealer) {
  return state.sources.find((source) => source.dealer === dealer);
}

function populateDealerFilter() {
  const dealers = [...new Set(state.tasks.map((task) => task.dealer))].sort();
  els.dealerFilter.innerHTML = [
    `<option value="all">All dealerships</option>`,
    ...dealers.map((dealer) => `<option value="${escapeAttr(dealer)}">${escapeHtml(dealer)}</option>`),
  ].join("");
}

function populateYearFilter() {
  const years = [...new Set(state.tasks.map((task) => task.year))].sort((a, b) => b - a);
  els.yearFilter.innerHTML = [
    `<option value="all">All years</option>`,
    ...years.map((year) => `<option value="${year}">${year}</option>`),
  ].join("");
  els.yearFilter.value = years.includes(2027) ? "2027" : String(years[0] || "all");
}

boot().catch((error) => {
  console.error(error);
  showToast("Some source data could not load yet");
  renderAuth();
  render();
});

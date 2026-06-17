async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load ${url}`);
  }
  return response.json();
}

function loadClassicScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${url}`));
    document.head.append(script);
  });
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
  await loadClassicScript("js/my-work-workbench.js?v=20260616");
  await loadClassicScript("js/fusz-implementation.js?v=20260616");
  normalizeSession();
  bindEvents();
  renderAuth();
  const [tasks, sources, inventoryFeed] = [embeddedTracker, embeddedSources, await fetchInventoryFeed()];
  const sourceTasks = mergeInventoryFeedTasks(tasks, inventoryFeed.rows);
  state.sources = sources;
  state.rooftops = loadRooftops(sources);
  state.inventoryFeed = inventoryFeed;
  state.tasks = sourceTasks.map((task) => {
    const pageStatus = normalizePageStatus(state.overrides[task.id] || demoPageStatus(task) || task.pageStatus);
    return {
      ...task,
      pageStatus,
      aeoStatus: state.aeoOverrides[task.id] || normalizeAeoStatus(task.aeoStatus) || demoAeoStatus(task, pageStatus),
      details: state.details[task.id] || {},
      inventorySignal: state.signalOverrides[task.id] || inferSignal(task),
      accent: brandAccentOverrides[task.make]?.accent || dealerAccents[task.dealer] || "#2563a9",
      accentStyle: accentStyleForTask(task),
      inventoryUrl: sourceFor(task.dealer)?.inventoryUrl || task.inventoryUrl || "",
    };
  });
  applyInventoryFeedSignals();
  populateYearFilter();
  populateDealerFilter();
  render();
}

function loadRooftops(sources) {
  if (Array.isArray(state.rooftops)) return state.rooftops;
  return sources.map((source) => ({
    id: normalizeCompare(source.dealer),
    name: source.dealer,
    brand: source.brands?.join(", ") || "Brand",
    feedUrl: source.inventoryUrl || "",
    active: true,
  }));
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

function mergeInventoryFeedTasks(tasks, rows = []) {
  const existing = new Set(tasks.map((task) => task.id));
  const feedTasks = rows
    .filter((row) => row.dealer && row.year && row.make && row.model)
    .map((row) => inventoryRowToTask(row))
    .filter((task) => {
      if (existing.has(task.id)) return false;
      existing.add(task.id);
      return true;
    });
  return [...tasks, ...feedTasks];
}

function inventoryRowToTask(row) {
  const task = {
    dealer: row.dealer,
    year: Number(row.year),
    make: row.make,
    model: row.model,
  };
  return {
    ...task,
    id: `${normalizeCompare(task.dealer)}|${task.year}|${normalizeCompare(task.make)}-${normalizeCompare(task.model)}`,
    pageStatus: normalizePageStatus(row.page_status || row.page_status_raw || "needs_seo"),
    aeoStatus: normalizeAeoStatus(row.aeo_status),
    trackerStatusRaw: null,
    trackerRow: null,
    source: "inventory-feed",
    inventorySignal: signalFromFeedStatus(row.status || row.vehicle_status || ""),
    inventoryUrl: row.inventory_url || row.vdp_url || sourceFor(task.dealer)?.inventoryUrl || "",
  };
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

function demoAeoStatus(task, pageStatus) {
  const title = `${task.make || ""} ${task.model || ""}`.toLowerCase();
  if (["page_built", "live"].includes(pageStatus) || task.trackerStatusRaw === true) return "done";
  if (title.includes("cx-50") || title.includes("telluride") || title.includes("land cruiser")) return "done";
  if (pageStatus === "seo_done") return "in_progress";
  return "not_started";
}

function normalizeAeoStatus(status) {
  const normalized = normalizeFeedKey(status);
  if (["not_started", "in_progress", "done", "not_needed"].includes(normalized)) return normalized;
  if (normalized === "complete" || normalized === "completed" || normalized === "aeo_done" || normalized === "aeo_complete") return "done";
  if (normalized === "pending" || normalized === "notstarted" || normalized === "aeo_not_started") return "not_started";
  if (normalized === "inprogress" || normalized === "aeo_in_progress") return "in_progress";
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
  els.yearFilter.value = "all";
}

boot().catch((error) => {
  console.error(error);
  showToast("Some source data could not load yet");
  renderAuth();
  render();
});

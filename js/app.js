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

const inventoryFeedFiles = [
  "FuszToyota.csv",
  "FuszChevrolet.csv",
  "CDJRVincennes.csv",
  "LouFuszBuickGMC.csv",
  "LouFuszGroup.csv",
  "SubaruStLouis.csv",
  "SubaruStPeters.csv",
  "NissanMoline.csv",
  "MazdaEvansville.csv",
  "LouFuszMazda.csv",
  "TerreHauteKIA.csv",
  "KIAOhio.csv",
  "KIAMoline.csv",
  "KIAEvansville.csv",
  "LouFuszKIA.csv",
  "LouFuszFord.csv",
  "LouFuszEvansville.csv",
  "FuszCDJRF.csv",
];

const dealerNameAliases = {
  "fusz toyota": "Lou Fusz Toyota",
  "fusz chevrolet": "Lou Fusz Chevrolet",
  "lou fusz chevrolet": "Lou Fusz Chevrolet",
  "lou fusz buick gmc": "Lou Fusz Buick GMC",
  "lou fusz ford": "Lou Fusz Ford",
  "lou fusz kia": "Lou Fusz Kia",
  "lou fusz mazda": "Lou Fusz Mazda",
  "fusz cdjrf": "Lou Fusz Chrysler Jeep Dodge RAM",
  "cdjr vincennes": "Lou Fusz Chrysler Jeep Dodge Ram Vincennes",
  "kia evansville": "Lou Fusz Kia Evansville",
  "kia moline": "Lou Fusz Kia of Moline",
  "kia ohio": "Lou Fusz Kia Columbus",
  "terre haute kia": "Lou Fusz Kia Terre Haute",
  "mazda evansville": "Lou Fusz Mazda Evansville",
  "nissan moline": "Lou Fusz Nissan Moline",
  "subaru st louis": "Lou Fusz Subaru St. Louis",
  "subaru st peters": "Lou Fusz Subaru O'Fallon",
};

async function fetchInventoryFeed() {
  const rows = [];
  const loadedFiles = [];
  const failedFiles = [];

  for (const file of inventoryFeedFiles) {
    try {
      const response = await fetch(`data/${file}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`feed missing: ${file}`);
      const csv = await response.text();
      const feedRows = parseCsv(csv)
        .map((row) => normalizeInventoryRow(row, file))
        .filter((row) => isInInventoryYearWindow(row.year));
      rows.push(...feedRows);
      loadedFiles.push(file);
    } catch {
      failedFiles.push(file);
    }
  }

  if (!rows.length) {
    return {
      connected: false,
      rows: [],
      files: loadedFiles,
      failedFiles,
      message: "Waiting on CSV",
    };
  }

  return {
    connected: true,
    rows,
    files: loadedFiles,
    failedFiles,
    message: `${rows.length} feed rows from ${loadedFiles.length} CSV${loadedFiles.length === 1 ? "" : "s"}`,
  };
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

function normalizeInventoryRow(row, file) {
  const dealer = normalizeDealerName(row.dealer || row.dealership || row.dealership_name);
  const vehicleStatus = row.status || row.vehicle_status || "";
  const inventoryUrl = row.inventory_url || row.vdp_url || row.vdp_urls || "";
  const stockDate = row.last_updated || row.updated_at || row.date_in_stock || row.date_instock || row.date_instock_raw || "";

  return {
    ...row,
    dealer,
    dealership_name: dealer,
    year: row.year,
    make: row.make,
    model: row.model,
    trim: row.trim,
    status: vehicleStatus,
    vehicle_status: vehicleStatus,
    stock_number: row.stock_number,
    vin: row.vin,
    date_in_stock: row.date_in_stock || row.date_instock || row.date_instock_raw,
    last_updated: stockDate,
    inventory_url: inventoryUrl,
    vdp_url: row.vdp_url || row.vdp_urls || row.inventory_url,
    feedFile: file,
  };
}

function normalizeDealerName(name) {
  const clean = String(name || "").trim();
  return dealerNameAliases[normalizeWords(clean)] || clean;
}

function normalizeWords(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function minimumInventoryYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month < 2 ? year - 1 : year;
}

function isInInventoryYearWindow(year) {
  const numericYear = Number(year);
  return Number.isFinite(numericYear) && numericYear >= minimumInventoryYear();
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
    source: row.feedFile || "inventory-feed",
    inventorySignal: signalFromFeedStatus(row.vehicle_status || row.status || "", row),
    inventoryUrl: row.inventory_url || row.vdp_url || sourceFor(task.dealer)?.inventoryUrl || "",
    vin: row.vin || "",
    stockNumber: row.stock_number || "",
    trim: row.trim || "",
    dateInStock: row.date_in_stock || "",
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
    task.inventorySignal = signalFromFeedStatus(feedRow.status || feedRow.vehicle_status || "", feedRow);
    task.inventoryUrl = feedRow.inventory_url || feedRow.vdp_url || task.inventoryUrl;
  });
}

function feedRowMatchesTask(row, task) {
  return normalizeCompare(row.dealer) === normalizeCompare(task.dealer)
    && String(row.year || "") === String(task.year || "")
    && normalizeCompare(row.make) === normalizeCompare(task.make)
    && normalizeCompare(row.model) === normalizeCompare(task.model);
}

function signalFromFeedStatus(status, row = {}) {
  const normalized = normalizeCompare(status);
  if (normalized.includes("lot") || normalized.includes("available") || normalized.includes("instock")) return "on_lot";
  if (normalized.includes("ship") || normalized.includes("transit") || normalized.includes("intransit")) return "shipped";
  if (row.stock_number || row.vin || row.inventory_url || row.vdp_url || row.vdp_urls) return "on_lot";
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

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
  "lou fusz kia evansville": "Lou Fusz Kia Evansville",
  "lou fusz kia of moline": "Lou Fusz Kia of Moline",
  "lou fusz kia columbus": "Lou Fusz Kia Columbus",
  "lou fusz kia terre haute": "Lou Fusz Kia Terre Haute",
  "lou fusz mazda": "Lou Fusz Mazda",
  "lou fusz mazda evansville": "Lou Fusz Mazda Evansville",
  "lou fusz cdjrf": "Lou Fusz Chrysler Jeep Dodge RAM",
  "fusz cdjrf": "Lou Fusz Chrysler Jeep Dodge RAM",
  "lou fusz cdjr vincennes": "Lou Fusz Chrysler Jeep Dodge Ram Vincennes",
  "cdjr vincennes": "Lou Fusz Chrysler Jeep Dodge Ram Vincennes",
  "kia evansville": "Lou Fusz Kia Evansville",
  "kiaevansville": "Lou Fusz Kia Evansville",
  "kia moline": "Lou Fusz Kia of Moline",
  "kia of moline": "Lou Fusz Kia of Moline",
  "kia ohio": "Lou Fusz Kia Columbus",
  "terre haute kia": "Lou Fusz Kia Terre Haute",
  "mazda evansville": "Lou Fusz Mazda Evansville",
  "nissan moline": "Lou Fusz Nissan Moline",
  "nissan of moline": "Lou Fusz Nissan Moline",
  "mazda of evansville": "Lou Fusz Mazda Evansville",
  "lou fusz evansville": "Lou Fusz Mazda Evansville",
  "subaru st louis": "Lou Fusz Subaru St. Louis",
  "lou fusz subaru st louis": "Lou Fusz Subaru St. Louis",
  "subaru st peters": "Lou Fusz Subaru O'Fallon",
  "lou fusz subaru st peters": "Lou Fusz Subaru O'Fallon",
};

const completedModelOverrideKeys = new Set(`
loufuszbuickgmc|2026|acadia
loufuszbuickgmc|2026|canyon
loufuszbuickgmc|2026|enclave
loufuszbuickgmc|2026|encoregx
loufuszbuickgmc|2026|envision
loufuszbuickgmc|2026|envista
loufuszbuickgmc|2026|hummerevpickup
loufuszbuickgmc|2026|hummerevsuv
loufuszbuickgmc|2026|sierra1500
loufuszbuickgmc|2026|sierra2500
loufuszbuickgmc|2026|sierraev
loufuszbuickgmc|2026|terrain
loufuszbuickgmc|2026|yukon
loufuszbuickgmc|2026|yukonxl
loufuszchevrolet|2026|blazer
loufuszchevrolet|2026|blazerev
loufuszchevrolet|2026|colorado
loufuszchevrolet|2026|corvettestingray
loufuszchevrolet|2026|equinox
loufuszchevrolet|2026|equinoxev
loufuszchevrolet|2026|silverado1500
loufuszchevrolet|2026|silverado2500
loufuszchevrolet|2026|suburban
loufuszchevrolet|2026|tahoe
loufuszchevrolet|2026|trailblazer
loufuszchevrolet|2026|traverse
loufuszchevrolet|2026|trax
loufuszchevrolet|2027|bolt
loufuszchryslerjeepdodgeramvincennes|2026|1500
loufuszchryslerjeepdodgeramvincennes|2026|1500rho
loufuszchryslerjeepdodgeramvincennes|2026|2500
loufuszchryslerjeepdodgeramvincennes|2026|3500
loufuszchryslerjeepdodgeramvincennes|2026|cherokee
loufuszchryslerjeepdodgeramvincennes|2026|compass
loufuszchryslerjeepdodgeramvincennes|2026|dodgecharger
loufuszchryslerjeepdodgeramvincennes|2026|durango
loufuszchryslerjeepdodgeramvincennes|2026|gladiator
loufuszchryslerjeepdodgeramvincennes|2026|grandcherokee
loufuszchryslerjeepdodgeramvincennes|2026|grandwagoneer
loufuszchryslerjeepdodgeramvincennes|2026|pacifica
loufuszchryslerjeepdodgeramvincennes|2026|voyager
loufuszchryslerjeepdodgeramvincennes|2026|wrangler
loufuszchryslerjeepdodgeramvincennes|2027|pacifica
loufuszchryslerjeepdodgeram|2026|1500
loufuszchryslerjeepdodgeram|2026|2500
loufuszchryslerjeepdodgeram|2026|charger
loufuszchryslerjeepdodgeram|2026|cherokee
loufuszchryslerjeepdodgeram|2026|compass
loufuszchryslerjeepdodgeram|2026|durango
loufuszchryslerjeepdodgeram|2026|gladiator
loufuszchryslerjeepdodgeram|2026|grandcherokee
loufuszchryslerjeepdodgeram|2026|grandwagoneer
loufuszchryslerjeepdodgeram|2026|pacifica
loufuszchryslerjeepdodgeram|2026|voyager
loufuszchryslerjeepdodgeram|2026|wrangler
loufuszchryslerjeepdodgeram|2027|pacifica
loufuszford|2026|bronco
loufuszford|2026|broncosport
loufuszford|2026|escape
loufuszford|2026|expedition
loufuszford|2026|explorer
loufuszford|2026|f150
loufuszford|2026|maverick
loufuszford|2026|mustang
loufuszford|2026|mustangmache
loufuszford|2026|ranger
loufuszford|2026|superdutyf250
loufuszkiacolumbus|2026|carnivalhybrid
loufuszkiacolumbus|2026|ev9
loufuszkiacolumbus|2026|k4
loufuszkiacolumbus|2026|k4hatchback
loufuszkiacolumbus|2026|k5
loufuszkiacolumbus|2026|niro
loufuszkiacolumbus|2026|seltos
loufuszkiacolumbus|2026|sorento
loufuszkiacolumbus|2026|sportage
loufuszkiacolumbus|2027|kiatelluride
loufuszkiaevansville|2026|carnivalhybrid
loufuszkiaevansville|2026|ev9
loufuszkiaevansville|2026|k4
loufuszkiaevansville|2026|k4hatchback
loufuszkiaevansville|2026|k5
loufuszkiaevansville|2026|niro
loufuszkiaevansville|2026|seltos
loufuszkiaevansville|2026|sorento
loufuszkiaevansville|2026|sportage
loufuszkiaevansville|2027|kiatelluride
loufuszkiaofmoline|2026|carnivalhybrid
loufuszkiaofmoline|2026|ev9
loufuszkiaofmoline|2026|k4
loufuszkiaofmoline|2026|k4hatchback
loufuszkiaofmoline|2026|k5
loufuszkiaofmoline|2026|niro
loufuszkiaofmoline|2026|seltos
loufuszkiaofmoline|2026|sorento
loufuszkiaofmoline|2026|sportage
loufuszkiaofmoline|2027|kiatelluride
loufuszkiaterrehaute|2026|carnivalhybrid
loufuszkiaterrehaute|2026|ev9
loufuszkiaterrehaute|2026|k4
loufuszkiaterrehaute|2026|k4hatchback
loufuszkiaterrehaute|2026|k5
loufuszkiaterrehaute|2026|niro
loufuszkiaterrehaute|2026|seltos
loufuszkiaterrehaute|2026|sorento
loufuszkiaterrehaute|2026|sportage
loufuszkiaterrehaute|2027|kiatelluride
loufuszkia|2026|carnivalhybrid
loufuszkia|2026|ev9
loufuszkia|2026|k4
loufuszkia|2026|k4hatchback
loufuszkia|2026|k5
loufuszkia|2026|niro
loufuszkia|2026|seltos
loufuszkia|2026|sorento
loufuszkia|2026|sportage
loufuszkia|2027|kiatelluride
loufuszmazdaevansville|2026|cx30
loufuszmazdaevansville|2026|cx5
loufuszmazdaevansville|2026|cx50
loufuszmazdaevansville|2026|cx70
loufuszmazdaevansville|2026|cx90
loufuszmazdaevansville|2026|mazda3hatchback
loufuszmazdaevansville|2026|mazda3sedan
loufuszmazdaevansville|2026|mazdamx5miata
loufuszmazdaevansville|2026|mazdamx5miatarf
loufuszmazda|2026|cx5
loufuszmazda|2026|mazda3hatchback
loufuszmazda|2026|mazda3sedan
loufuszmazda|2026|mazdacx30
loufuszmazda|2026|mazdacx50
loufuszmazda|2026|mazdacx70
loufuszmazda|2026|mazdacx90
loufuszmazda|2026|mazdamx5miata
loufuszmazda|2026|mazdamx5miatarf
loufusznissanmoline|2026|altima
loufusznissanmoline|2026|armada
loufusznissanmoline|2026|frontier
loufusznissanmoline|2026|kicks
loufusznissanmoline|2026|leaf
loufusznissanmoline|2026|murano
loufusznissanmoline|2026|pathfinder
loufusznissanmoline|2026|rogue
loufusznissanmoline|2026|sentra
loufusznissanmoline|2026|z
loufuszsubaruofallon|2026|ascent
loufuszsubaruofallon|2026|brz
loufuszsubaruofallon|2026|crosstrekhybrid
loufuszsubaruofallon|2026|forester
loufuszsubaruofallon|2026|impreza
loufuszsubaruofallon|2026|outback
loufuszsubaruofallon|2026|solterra
loufuszsubaruofallon|2026|trailseeker
loufuszsubaruofallon|2026|uncharted
loufuszsubaruofallon|2026|wrx
loufuszsubarustlouis|2026|ascent
loufuszsubarustlouis|2026|brz
loufuszsubarustlouis|2026|crosstrekhybrid
loufuszsubarustlouis|2026|forester
loufuszsubarustlouis|2026|impreza
loufuszsubarustlouis|2026|outback
loufuszsubarustlouis|2026|solterra
loufuszsubarustlouis|2026|trailseeker
loufuszsubarustlouis|2026|uncharted
loufuszsubarustlouis|2026|wrx
loufusztoyota|2026|4runner
loufusztoyota|2026|bz
loufusztoyota|2026|camry
loufusztoyota|2026|chr
loufusztoyota|2026|corolla
loufusztoyota|2026|corollacross
loufusztoyota|2026|corollahatchback
loufusztoyota|2026|crown
loufusztoyota|2026|gr86
loufusztoyota|2026|grandhighlander
loufusztoyota|2026|grcorolla
loufusztoyota|2026|grsupra
loufusztoyota|2026|highlander
loufusztoyota|2026|landcruiser
loufusztoyota|2026|prius
loufusztoyota|2026|rav4
loufusztoyota|2026|rav4pluginhybrid
loufusztoyota|2026|sequoia
loufusztoyota|2026|sienna
loufusztoyota|2026|tacoma
loufusztoyota|2026|tundra
`.trim().split(/\s+/));

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

  const dedupedRows = dedupeInventoryRows(rows);

  if (!dedupedRows.length) {
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
    rows: dedupedRows,
    files: loadedFiles,
    failedFiles,
    duplicateRowsRemoved: rows.length - dedupedRows.length,
    message: `${dedupedRows.length} feed rows from ${loadedFiles.length} CSV${loadedFiles.length === 1 ? "" : "s"}`,
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

  const rawModel = String(row.model || "").trim();
  const rawMake = String(row.make || "").trim();
  const model = rawMake && rawModel.toLowerCase().startsWith(rawMake.toLowerCase() + " ")
    ? rawModel.slice(rawMake.length).trim()
    : rawModel;

  return {
    ...row,
    dealer,
    dealership_name: dealer,
    year: row.year,
    make: rawMake,
    model,
    trim: String(row.trim || "").trim(),
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

function dedupeInventoryRows(rows = []) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = inventoryRowKey(row);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inventoryRowKey(row = {}) {
  const vin = normalizeCompare(row.vin);
  if (vin) return `vin:${vin}`;
  return `row:${normalizeCompare(row.dealer)}|${row.year}|${normalizeCompare(row.make)}|${normalizeCompare(row.model)}|${normalizeCompare(row.trim)}|${normalizeCompare(row.stock_number)}`;
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

function completedOverrideFor(task) {
  if (!task) return null;
  const modelCandidates = [task.model, modelWithoutMake(task)].filter(Boolean);
  const hasCompletedMatch = modelCandidates.some((model) => completedModelOverrideKeys.has(completedOverrideKey(task.dealer, task.year, model)));
  return hasCompletedMatch ? { pageStatus: "page_built", aeoStatus: "done" } : null;
}

function completedOverrideKey(dealer, year, model) {
  return `${normalizeCompare(dealer)}|${year}|${normalizeCompare(model)}`;
}

function modelWithoutMake(task) {
  const model = String(task.model || "").trim();
  const make = String(task.make || "").trim();
  return make && model.toLowerCase().startsWith(`${make.toLowerCase()} `) ? model.slice(make.length).trim() : model;
}

async function boot() {
  const bar = document.getElementById("load-bar");
  const prog = (pct) => { if (bar) bar.style.width = pct + "%"; };
  prog(10);
  applyTheme(state.selectedTheme);

  // Detect invite link: ?invite=seo-writer → personalise welcome screen
  const inviteParam = new URLSearchParams(window.location.search).get("invite");
  if (inviteParam) {
    const roleMap = {
      "seo-writer":  { label: "SEO Writer",  initials: "SW" },
      "builder":     { label: "Builder",      initials: "BU" },
      "admin":       { label: "Admin",        initials: "AD" },
      "aeo-writer":  { label: "AEO Writer",   initials: "AW" },
    };
    const invitee = roleMap[inviteParam] || { label: inviteParam, initials: inviteParam.slice(0,2).toUpperCase() };
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("authEyebrow",  "You've been invited");
    set("authHeading",  "Welcome to Fusz+");
    set("authCopy",     `Your role is set to ${invitee.label}. Fusz+ will open your workspace so you can get started right away.`);
    set("authAvatar",   invitee.initials);
    set("authName",     "New team member");
    set("authRole",     invitee.label);
    const btn = document.getElementById("continueLoginButton");
    if (btn) btn.textContent = `Continue as ${invitee.label}`;
  }
  await loadClassicScript("js/my-work-workbench.js?v=20260616");
  prog(38);
  await loadClassicScript("js/fusz-implementation.js?v=20260616");
  prog(60);
  normalizeSession();
  bindEvents();
  renderAuth();
  const [tasks, sources, inventoryFeed] = [embeddedTracker, embeddedSources, await fetchInventoryFeed()];
  prog(82);
  const sourceTasks = mergeInventoryFeedTasks(tasks, inventoryFeed.rows);
  state.sources = sources;
  state.rooftops = loadRooftops(sources);
  state.inventoryFeed = inventoryFeed;
  state.tasks = sourceTasks.map((task) => {
    const completedOverride = completedOverrideFor(task);
    const existingLiveStatus = task.pageStatus === "live" ? "live" : null;
    const pageStatus = normalizePageStatus(state.overrides[task.id] || existingLiveStatus || completedOverride?.pageStatus || demoPageStatus(task) || task.pageStatus);
    return {
      ...task,
      pageStatus,
      aeoStatus: state.aeoOverrides[task.id] || completedOverride?.aeoStatus || normalizeAeoStatus(task.aeoStatus) || demoAeoStatus(task, pageStatus),
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
  prog(100);
  document.body.dataset.loaded = "true";
  const _veil = document.getElementById("app-veil");
  if (_veil) { _veil.classList.add("is-hidden"); setTimeout(() => _veil.remove(), 260); }
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

  // If session has an email, reconcile against roster (handles stale localStorage)
  const member = rosterByEmail(state.session.email) || null;
  if (member) {
    state.session = {
      email: member.email,
      name: member.name,
      initials: member.initials,
      primaryRole: member.primaryRole,
      isAdmin: member.isAdmin,
      defaultView: member.defaultView,
    };
    localStorage.setItem("fusz-demo-session", JSON.stringify(state.session));
    return;
  }

  // Legacy fallback: sessions without email
  if (state.session.primaryRole && typeof state.session.isAdmin === "boolean") return;
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
  if (normalized.includes("lot") || normalized.includes("available") || normalized.includes("instock") || normalized.includes("dealership")) return "on_lot";
  if (normalized.includes("ship") || normalized.includes("transit") || normalized.includes("intransit")) return "shipped";
  if (row.stock_number || row.vin || row.inventory_url || row.vdp_url || row.vdp_urls) return "on_lot";
  return "upcoming";
}

function normalizeCompare(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function sourceFor(dealer) {
  return state.sources.find((source) => normalizeCompare(source.dealer) === normalizeCompare(dealer));
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
  // Remove veil FIRST — nothing should block the user seeing the app
  const _veil2 = document.getElementById("app-veil");
  if (_veil2) { _veil2.classList.add("is-hidden"); setTimeout(() => _veil2.remove(), 220); }
  try { showToast("Some source data could not load yet"); } catch (e) { console.warn("showToast failed during boot recovery:", e); }
  try { renderAuth(); } catch (e) { console.error("renderAuth() failed during boot recovery:", e); document.body.dataset.auth = "signed_out"; }
  try { render(); } catch (e) {
    console.error("render() failed during boot recovery:", e);
    const _panels = document.querySelector(".main-panels") || document.getElementById("app");
    if (_panels) _panels.insertAdjacentHTML("afterbegin", '<p class="render-error" style="padding:1rem">Dashboard failed to load — refresh the page or press F12 for details.</p>');
  }
});

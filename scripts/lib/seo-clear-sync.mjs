/**
 * Match Slack SEO clears to Team Pipeline rows and plan the status write.
 *
 * Catalog rows live in js/data.js (`embeddedTracker`). The live board reads
 * `pageStatus` from that seed unless Firebase Realtime Database
 * `overrides/pageStatus/<taskId>` is set (see js/firebase.js). "Needs SEO" is
 * pageStatus "needs_seo". The in-app "Mark SEO done" action moves a row to
 * "seo_done" (label: "SEO ready"). This module only plans that transition.
 */

import fs from "node:fs";
import vm from "node:vm";

export const SEO_CLEAR_FROM = ["needs_seo", "seo_in_progress"];
export const SEO_CLEAR_TO = "seo_done";

const MAKES = ["chevrolet", "chrysler", "subaru", "nissan", "toyota", "mazda", "buick", "dodge", "jeep", "ford", "gmc", "kia", "ram"];

const MODEL_ALIASES = {
  "carnival mpv": "carnival",
  "carnival mpv hybrid": "carnival hybrid",
  "carnival hybrid": "carnival hybrid",
};

const DEALER_ALIASES = {
  "lou fusz toyota": "Lou Fusz Toyota",
  "fusz toyota": "Lou Fusz Toyota",
  "lou fusz chevrolet": "Lou Fusz Chevrolet",
  "lou fusz buick gmc": "Lou Fusz Buick GMC",
  "lou fusz ford": "Lou Fusz Ford",
  "lou fusz kia": "Lou Fusz Kia",
  "lou fusz kia evansville": "Lou Fusz Kia Evansville",
  "kia evansville": "Lou Fusz Kia Evansville",
  "lou fusz kia of moline": "Lou Fusz Kia of Moline",
  "kia of moline": "Lou Fusz Kia of Moline",
  "kia moline": "Lou Fusz Kia of Moline",
  "lou fusz kia terre haute": "Lou Fusz Kia Terre Haute",
  "kia terre haute": "Lou Fusz Kia Terre Haute",
  "terre haute kia": "Lou Fusz Kia Terre Haute",
  "lou fusz kia columbus": "Lou Fusz Kia Columbus",
  "kia columbus": "Lou Fusz Kia Columbus",
  "kia ohio": "Lou Fusz Kia Columbus",
  "lou fusz kia wentzville": "Lou Fusz Kia Wentzville",
  "lou fusz mazda": "Lou Fusz Mazda",
  "lou fusz mazda evansville": "Lou Fusz Mazda Evansville",
  "mazda evansville": "Lou Fusz Mazda Evansville",
  "lou fusz nissan moline": "Lou Fusz Nissan Moline",
  "nissan moline": "Lou Fusz Nissan Moline",
  "nissan of moline": "Lou Fusz Nissan Moline",
  "lou fusz subaru st louis": "Lou Fusz Subaru St. Louis",
  "subaru st louis": "Lou Fusz Subaru St. Louis",
  "lou fusz subaru o fallon": "Lou Fusz Subaru O'Fallon",
  "subaru o fallon": "Lou Fusz Subaru O'Fallon",
  "subaru st peters": "Lou Fusz Subaru O'Fallon",
  "lou fusz subaru st peters": "Lou Fusz Subaru O'Fallon",
  "lou fusz cjdr": "Lou Fusz Chrysler Jeep Dodge RAM",
  "lou fusz chrysler jeep dodge ram": "Lou Fusz Chrysler Jeep Dodge RAM",
  "lou fusz cjdr vincennes": "Lou Fusz Chrysler Jeep Dodge Ram Vincennes",
  "lou fusz chrysler jeep dodge ram vincennes": "Lou Fusz Chrysler Jeep Dodge Ram Vincennes",
};

const ROOFTOPS = [
  { token: "terre haute", dealers: { kia: "Lou Fusz Kia Terre Haute" } },
  { token: "st louis", dealers: { subaru: "Lou Fusz Subaru St. Louis" } },
  { token: "saint louis", dealers: { subaru: "Lou Fusz Subaru St. Louis" } },
  { token: "o fallon", dealers: { subaru: "Lou Fusz Subaru O'Fallon" } },
  { token: "st peters", dealers: { subaru: "Lou Fusz Subaru O'Fallon" } },
  { token: "wentzville", dealers: { kia: "Lou Fusz Kia Wentzville" } },
  { token: "evansville", dealers: { kia: "Lou Fusz Kia Evansville", mazda: "Lou Fusz Mazda Evansville" } },
  { token: "columbus", dealers: { kia: "Lou Fusz Kia Columbus" } },
  { token: "ohio", dealers: { kia: "Lou Fusz Kia Columbus" } },
  { token: "moline", dealers: { kia: "Lou Fusz Kia of Moline", nissan: "Lou Fusz Nissan Moline" } },
  { token: "vincennes", dealers: { "*": "Lou Fusz Chrysler Jeep Dodge Ram Vincennes" } },
];

export function normalizeLabel(value) {
  return String(value || "")
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalModel(make, model) {
  let label = normalizeLabel(model);
  const makeLabel = normalizeLabel(make);
  if (makeLabel && (label === makeLabel || label.startsWith(`${makeLabel} `))) {
    label = label.slice(makeLabel.length).trim();
  }
  return MODEL_ALIASES[label] || label;
}

export function loadCatalog(dataJsPath) {
  const code = `${fs.readFileSync(dataJsPath, "utf8")}\nthis.embeddedTracker = embeddedTracker;\n`;
  const context = {};
  vm.createContext(context);
  vm.runInContext(code, context, { filename: dataJsPath });
  const tracker = context.embeddedTracker;
  if (!tracker || typeof tracker.length !== "number") {
    throw new Error(`No embeddedTracker array in ${dataJsPath}`);
  }
  return Array.from(tracker, (task) => ({
    id: String(task.id),
    dealer: String(task.dealer),
    year: Number(task.year),
    make: String(task.make),
    model: String(task.model),
    pageStatus: String(task.pageStatus),
    seedStatus: String(task.pageStatus),
    details: JSON.parse(JSON.stringify(task.details || {})),
  }));
}

export function withEffectiveStatus(catalog, overrides = {}) {
  const pageStatus = overrides.pageStatus || {};
  const details = overrides.details || {};
  return catalog.map((task) => ({
    ...task,
    seedStatus: task.seedStatus || task.pageStatus,
    pageStatus: pageStatus[task.id] || task.seedStatus || task.pageStatus,
    details: { ...(task.details || {}), ...(details[task.id] || {}) },
  }));
}

function peelRooftop(modelLabel, make) {
  const ordered = [...ROOFTOPS].sort((a, b) => b.token.length - a.token.length);
  for (const rooftop of ordered) {
    if (modelLabel === rooftop.token) continue;
    if (!modelLabel.endsWith(` ${rooftop.token}`)) continue;
    const model = modelLabel.slice(0, -rooftop.token.length).trim();
    if (!model) continue;
    return { model, dealer: dealerForRooftop(rooftop, make) };
  }
  return null;
}

function dealerForRooftop(rooftop, make) {
  if (!rooftop) return null;
  if (make && rooftop.dealers[make]) return rooftop.dealers[make];
  if (rooftop.dealers["*"]) return rooftop.dealers["*"];
  const options = Object.values(rooftop.dealers);
  return options.length === 1 ? options[0] : null;
}

export function resolveDealerName(dealerText, make) {
  if (!dealerText) return null;
  const norm = normalizeLabel(dealerText);
  if (DEALER_ALIASES[norm]) return DEALER_ALIASES[norm];
  const rooftop = ROOFTOPS.find((entry) => entry.token === norm);
  return dealerForRooftop(rooftop, normalizeLabel(make));
}

function dealerEquals(taskDealer, query, make) {
  const resolved = resolveDealerName(query, make) || query;
  return normalizeLabel(taskDealer) === normalizeLabel(resolved);
}

export function parseVehicleDisplay(display) {
  let text = String(display || "").replace(/[’‘]/g, "'").trim();
  text = text.replace(/^done\s+/i, "").trim();
  let dealerPart = "";
  const pieces = text.split(/\s+[—–]\s+|\s+·\s+|\s+-\s+/);
  if (pieces.length > 1) {
    text = pieces[0].trim();
    dealerPart = pieces.slice(1).join(" - ")
      .split("·")[0]
      .replace(/\b(on lot|shipped|upcoming)\b/ig, "")
      .trim();
  }
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  const rest = normalizeLabel(text.replace(/\b20\d{2}\b/g, " "));
  let make = null;
  let model = rest;
  for (const candidate of [...MAKES].sort((a, b) => b.length - a.length)) {
    if (rest === candidate || rest.startsWith(`${candidate} `)) {
      make = candidate;
      model = rest.slice(candidate.length).trim();
      break;
    }
  }
  const peeled = peelRooftop(model, make);
  if (peeled) model = peeled.model;
  const dealer = dealerPart || peeled?.dealer || null;
  return { year, make, model: canonicalModel(make, model), dealer };
}

export function parseDoneMessage(text) {
  return String(text || "")
    .replace(/[’‘]/g, "'")
    .split(/,|\n/)
    .map((part) => part.trim().replace(/^done\s+/i, "").trim())
    .filter(Boolean);
}

export function parseDigestLines(text) {
  const stripped = String(text || "")
    .replace(/:[a-z0-9_+-]+:/g, " ")
    .replace(/[_*]/g, " ");
  const lines = [];
  for (const line of stripped.split("\n")) {
    const match = line.match(/(20\d{2}\s+.+?)\s+[—–-]\s+([^·\n]+)/);
    if (!match) continue;
    const display = match[1].replace(/\s+/g, " ").trim();
    const dealer = match[2].replace(/\b(on lot|shipped|upcoming)\b/ig, "").replace(/\s+/g, " ").trim();
    if (!display || !dealer) continue;
    lines.push({ display, dealer });
  }
  return lines;
}

export function scopeIdsFromDigest(catalog, digestText) {
  const ids = [];
  for (const line of parseDigestLines(digestText)) {
    const parsed = parseVehicleDisplay(`${line.display} — ${line.dealer}`);
    const matches = matchTasks(catalog, parsed, line.dealer);
    if (matches.length === 1) ids.push(matches[0].id);
  }
  return ids;
}

function matchTasks(tasks, parsed, dealerQuery) {
  let matches = tasks.filter((task) => {
    if (parsed.year && Number(task.year) !== Number(parsed.year)) return false;
    if (parsed.make && normalizeLabel(task.make) !== parsed.make) return false;
    if (!parsed.model) return false;
    if (canonicalModel(task.make, task.model) !== parsed.model) return false;
    if (dealerQuery && !dealerEquals(task.dealer, dealerQuery, parsed.make || task.make)) return false;
    return true;
  });
  if (!parsed.year && !dealerQuery && matches.length > 1) {
    const open = matches.filter((task) => SEO_CLEAR_FROM.includes(task.pageStatus));
    const years = new Set(open.map((task) => Number(task.year)));
    if (open.length && years.size === 1) matches = open;
  }
  return matches;
}

function summarize(task) {
  return {
    id: task.id,
    dealer: task.dealer,
    year: task.year,
    make: task.make,
    model: task.model,
    pageStatus: task.pageStatus,
  };
}

function decideTarget(task, clear, seen, ledger, now) {
  const from = seen.has(task.id) ? seen.get(task.id) : task.pageStatus;
  const base = {
    id: task.id,
    dealer: task.dealer,
    year: task.year,
    make: task.make,
    model: task.model,
    seedStatus: task.seedStatus || task.pageStatus,
    from,
    to: from,
  };
  const recorded = ledger?.[task.id];
  if (clear.slack_ts && recorded?.slack_ts === clear.slack_ts) {
    return { ...base, action: "noop", reason: "same slack_ts already applied" };
  }
  if (!SEO_CLEAR_FROM.includes(from)) {
    return { ...base, action: "noop", reason: `already ${from}` };
  }
  const details = { stagedAt: clear.cleared_at || now };
  if (!task.details?.seoOwner && clear.cleared_by) details.seoOwner = clear.cleared_by;
  seen.set(task.id, SEO_CLEAR_TO);
  return {
    ...base,
    to: SEO_CLEAR_TO,
    action: "update",
    reason: `${from} → ${SEO_CLEAR_TO}`,
    details,
  };
}

/**
 * @param {Array<object>} tasks catalog rows (pageStatus is the effective status)
 * @param {Array<{id?: string, display?: string, dealer?: string, cleared_by?: string, cleared_at?: string, slack_ts?: string}>} clears
 * @param {{ scopeIds?: string[], ledger?: Record<string, {slack_ts?: string}>, now?: string }} [options]
 */
export function planSeoClears(tasks, clears, options = {}) {
  const scopeIds = options.scopeIds ? new Set([...options.scopeIds].map((id) => String(id))) : null;
  const ledger = options.ledger || {};
  const now = options.now || new Date().toISOString();
  const seen = new Map();
  const results = [];

  for (const clear of clears) {
    if (clear?.id) {
      const matches = tasks.filter((task) => task.id === clear.id);
      if (!matches.length) {
        results.push({ status: "unmatched", clear, targets: [], candidates: [], reason: "no pipeline row for id" });
        continue;
      }
      const targets = matches.map((task) => decideTarget(task, clear, seen, ledger, now));
      results.push({ status: targets.some((target) => target.action === "update") ? "update" : "noop", clear, targets, candidates: [] });
      continue;
    }

    const display = clear?.display || clear?.text || "";
    const parsed = parseVehicleDisplay(display);
    const dealerQuery = clear?.dealer || parsed.dealer;
    let matches = matchTasks(tasks, parsed, dealerQuery);
    let narrowedByScope = false;
    if (!dealerQuery && matches.length > 1 && scopeIds) {
      const scoped = matches.filter((task) => scopeIds.has(String(task.id)));
      if (scoped.length) {
        matches = scoped;
        narrowedByScope = true;
      }
    }
    if (!matches.length) {
      results.push({ status: "unmatched", clear, targets: [], candidates: [], reason: "no pipeline row for year + make + model" });
      continue;
    }
    if (!dealerQuery && matches.length > 1 && !narrowedByScope) {
      results.push({
        status: "ambiguous",
        clear,
        targets: [],
        candidates: matches.map(summarize),
        reason: "multiple rooftops; name the dealer or pass the digest that listed them",
      });
      continue;
    }
    const targets = matches.map((task) => decideTarget(task, clear, seen, ledger, now));
    results.push({
      status: targets.some((target) => target.action === "update") ? "update" : "noop",
      clear,
      targets,
      candidates: [],
    });
  }

  return results;
}

export function clearsFromDoneText(text, meta = {}) {
  return parseDoneMessage(text).map((display) => ({ display, ...meta }));
}

export function formatPlan(results, { firebaseNote = "" } = {}) {
  const lines = [
    `Transition: ${SEO_CLEAR_FROM.join(" | ")} → ${SEO_CLEAR_TO} (same as Mark SEO done).`,
    "Needs SEO is pageStatus needs_seo. This does not change lot signal, AEO, or Ready to build (needs_build).",
  ];
  if (firebaseNote) lines.push(firebaseNote);
  lines.push("");
  for (const result of results) {
    const label = result.clear?.id || result.clear?.display || "(clear)";
    const dealer = result.clear?.dealer ? ` · ${result.clear.dealer}` : "";
    lines.push(`${result.status.toUpperCase()}  ${label}${dealer}`);
    if (result.reason && !result.targets?.length) lines.push(`  ${result.reason}`);
    for (const target of result.targets || []) {
      lines.push(`  ${target.id}`);
      lines.push(`  ${target.year} ${target.make} ${target.model} · ${target.dealer}`);
      lines.push(`  ${target.action === "update" ? `${target.from} → ${target.to}` : `${target.reason} (${target.from})`}`);
      if (target.action === "update" && target.details) {
        if (target.details.stagedAt) lines.push(`  details.stagedAt = ${target.details.stagedAt}`);
        if (target.details.seoOwner) lines.push(`  details.seoOwner = ${target.details.seoOwner} (only if empty)`);
      }
    }
    if (result.status === "ambiguous") {
      for (const candidate of result.candidates) {
        lines.push(`  candidate ${candidate.id} · ${candidate.dealer} · ${candidate.pageStatus}`);
      }
    }
    lines.push("");
  }
  const targets = results.flatMap((result) => result.targets || []);
  const updates = targets.filter((target) => target.action === "update").length;
  const noops = targets.filter((target) => target.action === "noop").length;
  const ambiguous = results.filter((result) => result.status === "ambiguous").length;
  const unmatched = results.filter((result) => result.status === "unmatched").length;
  lines.push(`Summary: ${updates} update, ${noops} noop, ${ambiguous} ambiguous, ${unmatched} unmatched.`);
  return lines.join("\n");
}

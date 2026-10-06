import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { writeSeoClear } from "./lib/firebase-pipeline.mjs";
import { patchTrackerSource } from "./lib/patch-tracker.mjs";
import {
  SEO_CLEAR_TO,
  canonicalModel,
  clearsFromDoneText,
  loadCatalog,
  parseDigestLines,
  parseDoneMessage,
  parseVehicleDisplay,
  planSeoClears,
  scopeIdsFromDigest,
  withEffectiveStatus,
} from "./lib/seo-clear-sync.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = loadCatalog(path.join(root, "js", "data.js"));
const pending = JSON.parse(fs.readFileSync(path.join(root, "scripts", "pending-seo-clears.json"), "utf8")).clears;

const FRIDAY_CORRECTION = `
:large_blue_circle: _2027 Ford Expedition_ — Lou Fusz Ford · On lot
:white_circle: _2027 Nissan Kicks_ — Lou Fusz Nissan Moline · On lot
:white_circle: _2027 Nissan Sentra_ — Lou Fusz Nissan Moline · On lot
:large_blue_circle: _2027 Subaru Ascent_ — Lou Fusz Subaru O'Fallon · On lot
:large_blue_circle: _2027 Subaru Ascent_ — Lou Fusz Subaru St. Louis · On lot
`;

const MONDAY_DIGEST = `
:red_circle: _2027 Kia Seltos_ — Lou Fusz Kia · On lot
:red_circle: _2027 Kia Seltos_ — Lou Fusz Kia Columbus · On lot
:red_circle: _2027 Toyota Corolla_ — Lou Fusz Toyota · On lot
:red_circle: _2027 Toyota Corolla Hatchback_ — Lou Fusz Toyota · On lot
:red_circle: _2027 Toyota bZ Woodland_ — Lou Fusz Toyota · On lot
`;

function ids(results) {
  return results.flatMap((result) => (result.targets || []).map((target) => target.id));
}

test("parses a multi-model Slack done reply without merging names", () => {
  const text = "done 2027 Ford Explorer, Done 2027 Nissan Kicks, done 2027 Nissan Sentra, done 2027 Subaru Ascent";
  assert.deepEqual(parseDoneMessage(text), [
    "2027 Ford Explorer",
    "2027 Nissan Kicks",
    "2027 Nissan Sentra",
    "2027 Subaru Ascent",
  ]);
  assert.equal(parseVehicleDisplay("2027 Toyota Corolla").model, "corolla");
  assert.equal(parseVehicleDisplay("2027 Toyota Corolla Hatchback").model, "corolla hatchback");
  assert.equal(parseVehicleDisplay("2027 Toyota bZ Woodland").model, "bz woodland");
  assert.equal(canonicalModel("Kia", "Carnival MPV"), "carnival");
});

const PENDING_UPDATE_IDS = [
  "lou-fusz-ford|2027|expedition",
  "lou-fusz-ford|2027|explorer",
  "lou-fusz-nissan-moline|2027|kicks",
  "lou-fusz-nissan-moline|2027|sentra",
  "lou-fusz-subaru-o-fallon|2027|ascent",
  "lou-fusz-subaru-st-louis|2027|ascent",
  "lou-fusz-toyota|2027|bz-woodland",
  "lou-fusz-toyota|2027|corolla",
  "lou-fusz-toyota|2027|corolla-hatchback",
];

test("dry-run of the pending Slack clears", () => {
  const open = catalog.map((task) => PENDING_UPDATE_IDS.includes(task.id)
    ? { ...task, pageStatus: "needs_seo", seedStatus: "needs_seo", details: { notes: task.details?.notes || "" } }
    : task);
  const results = planSeoClears(open, pending);
  const updates = results.flatMap((result) => result.targets).filter((target) => target.action === "update");
  const updateIds = updates.map((target) => target.id).sort();
  assert.deepEqual(updateIds, [
    "lou-fusz-ford|2027|expedition",
    "lou-fusz-ford|2027|explorer",
    "lou-fusz-nissan-moline|2027|kicks",
    "lou-fusz-nissan-moline|2027|sentra",
    "lou-fusz-subaru-o-fallon|2027|ascent",
    "lou-fusz-subaru-st-louis|2027|ascent",
    "lou-fusz-toyota|2027|bz-woodland",
    "lou-fusz-toyota|2027|corolla",
    "lou-fusz-toyota|2027|corolla-hatchback",
  ].sort());
  for (const target of updates) {
    assert.equal(target.from, "needs_seo");
    assert.equal(target.to, SEO_CLEAR_TO);
    assert.equal(target.details.seoOwner, "Chris Pajda");
  }
  const seltos = results.flatMap((result) => result.targets).filter((target) => target.model === "Seltos");
  assert.deepEqual(seltos.map((target) => target.id).sort(), [
    "lou-fusz-kia-columbus|2027|seltos",
    "lou-fusz-kia|2027|seltos",
  ].sort());
  assert.ok(seltos.every((target) => target.action === "noop" && target.from === "needs_build"));
  assert.equal(results.some((result) => result.status === "ambiguous" || result.status === "unmatched"), false);
  assert.equal(ids(results).includes("lou-fusz-kia-evansville|2027|seltos"), false);
  assert.equal(ids(results).includes("lou-fusz-toyota|2027|corolla-hybrid"), false);
});

test("applied catalog is seo_done and a second clear is a no-op", () => {
  for (const id of PENDING_UPDATE_IDS) {
    const task = catalog.find((row) => row.id === id);
    assert.equal(task.pageStatus, "seo_done", id);
    assert.equal(task.details.seoOwner, "Chris Pajda", id);
    assert.ok(task.details.stagedAt, id);
    assert.ok(task.details.notes, id);
  }
  assert.equal(catalog.find((row) => row.id === "lou-fusz-kia|2027|seltos").pageStatus, "needs_build");
  assert.equal(catalog.find((row) => row.id === "lou-fusz-kia-columbus|2027|seltos").pageStatus, "needs_build");
  assert.equal(catalog.find((row) => row.id === "lou-fusz-kia-evansville|2027|seltos").pageStatus, "needs_build");
  assert.equal(catalog.find((row) => row.id === "lou-fusz-toyota|2027|corolla-hybrid").pageStatus, "needs_seo");
  const again = planSeoClears(catalog, pending);
  assert.equal(again.some((result) => result.status === "update" || result.status === "ambiguous"), false);
  assert.ok(again.every((result) => result.targets.every((target) => target.action === "noop")));
});

test("re-running the same plan is a no-op", () => {
  const first = planSeoClears(catalog, pending);
  const advanced = catalog.map((task) => {
    const update = first.flatMap((result) => result.targets).find((target) => target.id === task.id && target.action === "update");
    if (!update) return task;
    return {
      ...task,
      pageStatus: update.to,
      details: { ...task.details, ...update.details },
    };
  });
  const second = planSeoClears(advanced, pending);
  assert.equal(second.some((result) => result.status === "update"), false);
  assert.ok(second.every((result) => result.targets.every((target) => target.action === "noop")));
});

test("same slack_ts is a no-op even if status was put back to needs_seo", () => {
  const [expedition] = pending;
  const tasks = catalog.map((task) => task.id === "lou-fusz-ford|2027|expedition"
    ? { ...task, pageStatus: "needs_seo" }
    : task);
  const results = planSeoClears(tasks, [expedition], {
    ledger: { "lou-fusz-ford|2027|expedition": { slack_ts: expedition.slack_ts } },
  });
  assert.equal(results[0].targets[0].action, "noop");
  assert.match(results[0].targets[0].reason, /slack_ts/);
});

test("Ascent and Seltos rooftops stay split unless the digest listed them", () => {
  const ascent = planSeoClears(catalog, [{ display: "2027 Subaru Ascent", cleared_by: "Chris Pajda" }]);
  assert.equal(ascent[0].status, "ambiguous");
  assert.deepEqual(ascent[0].candidates.map((row) => row.id).sort(), [
    "lou-fusz-subaru-o-fallon|2027|ascent",
    "lou-fusz-subaru-st-louis|2027|ascent",
  ]);

  const bareSeltos = planSeoClears(catalog, [{ display: "2027 Kia Seltos" }]);
  assert.equal(bareSeltos[0].status, "ambiguous");
  assert.ok(bareSeltos[0].candidates.some((row) => row.id === "lou-fusz-kia-evansville|2027|seltos"));
  assert.equal(bareSeltos[0].targets.length, 0);

  const fridayIds = scopeIdsFromDigest(catalog, FRIDAY_CORRECTION);
  const scopedAscent = planSeoClears(catalog, clearsFromDoneText("done 2027 Subaru Ascent"), { scopeIds: fridayIds });
  assert.deepEqual(scopedAscent[0].targets.map((target) => target.id).sort(), [
    "lou-fusz-subaru-o-fallon|2027|ascent",
    "lou-fusz-subaru-st-louis|2027|ascent",
  ]);

  const mondayIds = scopeIdsFromDigest(catalog, MONDAY_DIGEST);
  const scopedSeltos = planSeoClears(catalog, clearsFromDoneText("done 2027 Kia Seltos"), { scopeIds: mondayIds });
  assert.deepEqual(scopedSeltos[0].targets.map((target) => target.id).sort(), [
    "lou-fusz-kia-columbus|2027|seltos",
    "lou-fusz-kia|2027|seltos",
  ]);
  assert.equal(scopedSeltos[0].targets.some((target) => target.id.includes("evansville")), false);
});

test("Corolla does not clear Hatchback, Hybrid, or bZ", () => {
  const results = planSeoClears(catalog, [{ display: "2027 Toyota Corolla", dealer: "Lou Fusz Toyota", cleared_by: "Chris Pajda", cleared_at: "2026-09-28T18:52:05.385Z" }]);
  assert.deepEqual(results[0].targets.map((target) => target.id), ["lou-fusz-toyota|2027|corolla"]);
  assert.equal(parseDigestLines(MONDAY_DIGEST).length, 5);
});

test("a later Firebase status is not pulled back to seo_done", () => {
  const tasks = withEffectiveStatus(catalog, {
    pageStatus: { "lou-fusz-ford|2027|expedition": "needs_build" },
  });
  const results = planSeoClears(tasks, [pending[0]]);
  assert.equal(results[0].targets[0].action, "noop");
  assert.equal(results[0].targets[0].from, "needs_build");
});

test("firebase needs_seo override still updates when the seed is already needs_build", () => {
  const tasks = withEffectiveStatus(catalog, {
    pageStatus: { "lou-fusz-kia|2027|seltos": "needs_seo" },
  });
  const results = planSeoClears(tasks, [pending.find((clear) => clear.dealer === "Lou Fusz Kia" && clear.display.includes("Seltos"))]);
  assert.equal(results[0].targets[0].action, "update");
  assert.equal(results[0].targets[0].from, "needs_seo");
  assert.equal(results[0].targets[0].seedStatus, "needs_build");
  assert.equal(results[0].targets[0].to, "seo_done");
});

test("seed patch rewrites only the open row and is idempotent", () => {
  const source = [
    '{ id: "lou-fusz-ford|2027|expedition", dealer: "Lou Fusz Ford", year: 2027, make: "Ford", model: "Expedition", pageStatus: "needs_seo", details: { notes: "2 units in latest feed" } },',
    '{ id: "lou-fusz-kia|2027|seltos", dealer: "Lou Fusz Kia", year: 2027, make: "Kia", model: "Seltos", pageStatus: "needs_build", details: { seoOwner: "Chris Pajda", buildOwner: "Jnuru Goodwin" } },',
  ].join("\n");
  const patched = patchTrackerSource(source, [
    { id: "lou-fusz-ford|2027|expedition", to: "seo_done", seedStatus: "needs_seo", details: { seoOwner: "Chris Pajda", stagedAt: "2026-09-28T17:58:35.341Z" } },
    { id: "lou-fusz-kia|2027|seltos", to: "seo_done", seedStatus: "needs_build", details: { seoOwner: "Chris Pajda", stagedAt: "2026-09-28T18:10:49.639Z" } },
  ]);
  assert.match(patched, /id: "lou-fusz-ford\|2027\|expedition".*pageStatus: "seo_done"/);
  assert.match(patched, /seoOwner: "Chris Pajda", stagedAt: "2026-09-28T17:58:35.341Z", notes: "2 units in latest feed"/);
  assert.match(patched, /id: "lou-fusz-kia\|2027\|seltos".*pageStatus: "needs_build"/);
  assert.equal(patched.includes("buildOwner"), true);
  const again = patchTrackerSource(patched, [
    { id: "lou-fusz-ford|2027|expedition", to: "seo_done", details: { seoOwner: "Chris Pajda", stagedAt: "2026-09-28T17:58:35.341Z" } },
  ]);
  assert.equal(again, patched);
});

test("firebase write patches one task and keeps existing detail fields", async () => {
  const store = {
    "overrides/details/lou-fusz-ford%7C2027%7Cexpedition": { notes: "2 units in latest feed", buildOwner: "Jnuru Goodwin" },
  };
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const target = url instanceof URL ? url : new URL(url);
    assert.equal(target.searchParams.get("auth"), "token");
    const key = target.pathname.replace(/^\//, "").replace(/\.json$/, "");
    calls.push({ method: options.method || "GET", key, body: options.body });
    if ((options.method || "GET") === "GET") {
      return { ok: true, status: 200, text: async () => JSON.stringify(store[key] ?? null) };
    }
    store[key] = JSON.parse(options.body);
    return { ok: true, status: 200, text: async () => options.body };
  };
  await writeSeoClear({
    fetchImpl,
    databaseUrl: "https://fuszplus-default-rtdb.firebaseio.com",
    auth: "token",
    clear: pending[0],
    target: {
      id: "lou-fusz-ford|2027|expedition",
      from: "needs_seo",
      to: "seo_done",
      details: { stagedAt: "2026-09-28T17:58:35.341Z", seoOwner: "Chris Pajda" },
    },
  });
  assert.equal(store["overrides/pageStatus/lou-fusz-ford%7C2027%7Cexpedition"], "seo_done");
  assert.deepEqual(store["overrides/details/lou-fusz-ford%7C2027%7Cexpedition"], {
    notes: "2 units in latest feed",
    buildOwner: "Jnuru Goodwin",
    stagedAt: "2026-09-28T17:58:35.341Z",
    seoOwner: "Chris Pajda",
  });
  assert.equal(store["overrides/seoClears/lou-fusz-ford%7C2027%7Cexpedition"].slack_ts, pending[0].slack_ts);
  assert.ok(calls.every((call) => !call.key.includes("aeo") && !call.key.includes("signal")));
});

test("builder queue keeps assigned builds and shows SEO Chris just finished", () => {
  const source = fs.readFileSync(path.join(root, "js", "renderers.js"), "utf8");
  const match = source.match(/function builderWorkTasks\(tasks = \[\], me = ""\) \{[\s\S]*?\n\}/);
  assert.ok(match, "builderWorkTasks should be a pure function");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${match[0]}\nthis.builderWorkTasks = builderWorkTasks;`, sandbox);
  const tasks = [
    { id: "owned", year: 2027, pageStatus: "needs_build", details: { buildOwner: "Jnuru Goodwin" } },
    { id: "lou-fusz-ford|2027|expedition", year: 2027, pageStatus: "seo_done", details: { seoOwner: "Chris Pajda" } },
    { id: "still-writing", year: 2027, pageStatus: "needs_seo", details: { seoOwner: "Chris Pajda" } },
    { id: "live-page", year: 2027, pageStatus: "live", details: { buildOwner: "Jnuru Goodwin" } },
    { id: "lou-fusz-kia|2027|seltos", year: 2027, pageStatus: "needs_build", details: { buildOwner: "Jnuru Goodwin", seoOwner: "Chris Pajda" } },
  ];
  const shown = sandbox.builderWorkTasks(tasks, "Jnuru Goodwin").map((task) => task.id);
  assert.ok(shown.includes("lou-fusz-ford|2027|expedition"));
  assert.ok(shown.includes("owned"));
  assert.ok(shown.includes("lou-fusz-kia|2027|seltos"));
  assert.equal(shown.includes("still-writing"), false);
  assert.equal(shown.includes("live-page"), false);
});

test("a page you just started stays ahead of SEO-ready pages", () => {
  const source = fs.readFileSync(path.join(root, "js", "renderers.js"), "utf8");
  const match = source.match(/function builderFocusRank\(task\) \{[\s\S]*?\n\}/);
  assert.ok(match, "builderFocusRank should be a pure function");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${match[0]}\nthis.builderFocusRank = builderFocusRank;`, sandbox);
  const started = { id: "lou-fusz-subaru-st.-louis|2027|crosstrek-hybrid", pageStatus: "needs_build", inventorySignal: "shipped" };
  const ready = { id: "lou-fusz-chrysler-jeep-dodge-ram|2027|wrangler", pageStatus: "seo_done", inventorySignal: "on_lot" };
  assert.ok(sandbox.builderFocusRank(started) < sandbox.builderFocusRank(ready));
});

test("October 2 Slack clears are ready to build and Getaway EV stays Needs SEO", () => {
  const byId = new Map(catalog.map((task) => [task.id, task]));
  for (const id of [
    "lou-fusz-chevrolet|2027|silverado-1500",
    "lou-fusz-subaru-st.-louis|2027|crosstrek-hybrid",
    "lou-fusz-subaru-o'fallon|2027|crosstrek-hybrid",
  ]) {
    assert.equal(byId.get(id).pageStatus, "seo_done", id);
    assert.equal(byId.get(id).details.seoOwner, "Chris Pajda");
  }
  assert.equal(byId.get("lou-fusz-subaru-st.-louis|2027|getaway-ev").pageStatus, "needs_seo");
  assert.equal(byId.get("lou-fusz-subaru-o'fallon|2027|getaway-ev").pageStatus, "needs_seo");
  assert.equal(byId.get("lou-fusz-subaru-st.-louis|2027|crosstrek").pageStatus, "needs_seo");
  assert.equal(byId.get("lou-fusz-chrysler-jeep-dodge-ram|2027|wrangler").pageStatus, "needs_build");
  const vincennesWrangler = byId.get("lou-fusz-chrysler-jeep-dodge-ram-vincennes|2027|wrangler");
  assert.equal(vincennesWrangler.pageStatus, "seo_done");
  assert.equal(vincennesWrangler.details.seoOwner, "Chris Pajda");
  const hidden = fs.readFileSync(path.join(root, "js", "fusz-implementation.js"), "utf8");
  for (const id of [
    "lou-fusz-chrysler-jeep-dodge-ram|2027|wrangler",
    "lou-fusz-buick-gmc|2027|acadia",
    "lou-fusz-kia|2027|sportage",
  ]) {
    assert.equal(hidden.includes(`"${id}"`), false, id);
  }
});

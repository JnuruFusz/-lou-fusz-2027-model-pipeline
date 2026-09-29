#!/usr/bin/env node
/**
 * Apply Slack SEO clears to the Team Pipeline.
 *
 *   node scripts/sync-seo-clears.mjs --dry-run --file scripts/pending-seo-clears.json
 *   node scripts/sync-seo-clears.mjs --apply --file scripts/pending-seo-clears.json
 *   node scripts/sync-seo-clears.mjs --dry-run --text "done 2027 Ford Expedition, done 2027 Subaru Ascent" --digest "<parent message>"
 *
 * --apply updates js/data.js when the seed row is still Needs SEO, and patches
 * Firebase overrides/pageStatus when FIREBASE_ID_TOKEN, FIREBASE_AUTH_TOKEN, or
 * FIREBASE_DATABASE_SECRET is set and the current overrides were read successfully.
 * Re-running the same slack_ts is a no-op. Ambiguous rooftops are not written.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  clearsFromDoneText,
  formatPlan,
  loadCatalog,
  planSeoClears,
  scopeIdsFromDigest,
  withEffectiveStatus,
} from "./lib/seo-clear-sync.mjs";
import { patchTrackerSource } from "./lib/patch-tracker.mjs";
import {
  firebaseAuthFromEnv,
  firebaseDatabaseUrl,
  readPipelineOverrides,
  writeSeoClear,
} from "./lib/firebase-pipeline.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataJsPath = path.join(root, "js", "data.js");

function argValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) return "";
  return argv[index + 1] || "";
}

function loadClears(argv) {
  const file = argValue(argv, "--file");
  const text = argValue(argv, "--text");
  const clears = [];
  if (file) {
    const payload = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
    clears.push(...(payload.clears || payload));
  }
  if (text) {
    clears.push(...clearsFromDoneText(text, {
      cleared_by: argValue(argv, "--cleared-by") || "Chris Pajda",
      cleared_at: argValue(argv, "--cleared-at") || new Date().toISOString(),
      slack_ts: argValue(argv, "--slack-ts") || "",
    }));
  }
  return clears;
}

async function main(argv = process.argv.slice(2)) {
  const apply = argv.includes("--apply");
  const clears = loadClears(argv);
  if (!clears.length) {
    console.error("Pass --file <clears.json> or --text \"done 2027 Ford Expedition\".");
    process.exitCode = 1;
    return;
  }

  const catalog = loadCatalog(dataJsPath);
  const digest = argValue(argv, "--digest") || (argValue(argv, "--digest-file") ? fs.readFileSync(path.resolve(argValue(argv, "--digest-file")), "utf8") : "");
  const scopeIds = digest ? scopeIdsFromDigest(catalog, digest) : [];

  let remote = null;
  let firebaseNote = "Firebase overrides were not read. Plan uses the catalog status in js/data.js.";
  const auth = firebaseAuthFromEnv();
  if (auth) {
    try {
      remote = await readPipelineOverrides({ databaseUrl: firebaseDatabaseUrl(), auth });
      firebaseNote = "Firebase overrides/pageStatus were read and override the catalog when present.";
    } catch (error) {
      firebaseNote = `Firebase read failed (${error.message}). Plan uses the catalog status in js/data.js.`;
      if (apply) {
        console.error(firebaseNote);
        console.error("Refusing to write Firebase without a current read.");
      }
    }
  }

  const tasks = withEffectiveStatus(catalog, remote || {});
  const ledger = remote?.seoClears || {};
  const results = planSeoClears(tasks, clears, { scopeIds, ledger });
  const report = formatPlan(results, { firebaseNote });
  console.log(report);

  const blocked = results.some((result) => result.status === "ambiguous" || result.status === "unmatched");
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to write.");
    if (blocked) process.exitCode = 2;
    return;
  }
  if (blocked) {
    console.error("Apply aborted. Resolve ambiguous or unmatched clears before writing.");
    process.exitCode = 2;
    return;
  }

  const updates = results.flatMap((result) => (result.targets || []).filter((target) => target.action === "update").map((target) => ({ result, target })));
  const seedUpdates = updates.filter(({ target }) => ["needs_seo", "seo_in_progress"].includes(target.seedStatus));
  if (seedUpdates.length) {
    const source = fs.readFileSync(dataJsPath, "utf8");
    const patched = patchTrackerSource(source, seedUpdates.map(({ target }) => target));
    fs.writeFileSync(dataJsPath, patched);
    console.log(`Updated ${seedUpdates.length} seed row(s) in js/data.js.`);
  } else {
    console.log("No seed rows still in Needs SEO.");
  }

  if (remote && auth) {
    for (const { result, target } of updates) {
      await writeSeoClear({
        databaseUrl: firebaseDatabaseUrl(),
        auth,
        target,
        clear: result.clear,
      });
      console.log(`Firebase ${target.id}: ${target.from} → ${target.to}`);
    }
  } else if (updates.length) {
    console.log("Firebase was not written. Set FIREBASE_ID_TOKEN (or FIREBASE_DATABASE_SECRET) and re-run --apply to patch overrides/pageStatus.");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { main };

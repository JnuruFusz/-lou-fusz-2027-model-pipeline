#!/usr/bin/env node
/**
 * Scan #seo-page-builder for Chris's "done 2027 …" replies and publish them
 * to the builder queue.
 *
 *   node scripts/scan-slack-seo-clears.mjs
 *   node scripts/scan-slack-seo-clears.mjs --apply
 *
 * Requires SLACK_BOT_TOKEN. The bot must be in #seo-page-builder and have
 * channels:history (and groups:history if the channel is private).
 * --apply rewrites open Needs SEO rows in js/data.js and data/seo-clears.json.
 * The open Fusz+ app polls that file and moves those pages to SEO ready.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatPlan, loadCatalog } from "./lib/seo-clear-sync.mjs";
import { patchTrackerSource } from "./lib/patch-tracker.mjs";
import {
  firebaseAuthFromEnv,
  firebaseDatabaseUrl,
  readPipelineOverrides,
  writeSeoClear,
} from "./lib/firebase-pipeline.mjs";
import {
  CHRIS_SLACK_USER_ID,
  SEO_PAGE_BUILDER_CHANNEL,
  fetchChannelMessages,
  fetchThreadMessages,
  mergeClearFile,
  planScannedReplies,
  selectDoneReplies,
  threadIdsWithReplies,
} from "./lib/slack-seo-scan.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataJsPath = path.join(root, "js", "data.js");
const clearFilePath = path.join(root, "data", "seo-clears.json");
const LOOKBACK_SECONDS = 45 * 24 * 60 * 60;

function readClearFile() {
  if (!fs.existsSync(clearFilePath)) {
    return { channel: SEO_PAGE_BUILDER_CHANNEL, author: "Chris Pajda", clears: [] };
  }
  return JSON.parse(fs.readFileSync(clearFilePath, "utf8"));
}

function ledgerFromFile(file) {
  const ledger = {};
  for (const clear of file.clears || []) {
    if (clear?.id && clear.slackTs) ledger[clear.id] = { slack_ts: clear.slackTs };
  }
  return ledger;
}

async function main(argv = process.argv.slice(2)) {
  const apply = argv.includes("--apply");
  const token = process.env.SLACK_BOT_TOKEN || process.env.SLACK_USER_TOKEN || "";
  if (!token) {
    console.error("Set SLACK_BOT_TOKEN. Invite that bot to #seo-page-builder with channels:history.");
    process.exitCode = 1;
    return;
  }

  const channel = process.env.SLACK_SEO_CHANNEL || SEO_PAGE_BUILDER_CHANNEL;
  const authorId = process.env.SLACK_SEO_AUTHOR || CHRIS_SLACK_USER_ID;
  const oldest = String(Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS);
  const channelMessages = await fetchChannelMessages(token, channel, { oldest });
  const threadIds = threadIdsWithReplies(channelMessages);
  const { messages: threadMessages, parents } = await fetchThreadMessages(token, channel, threadIds);
  const replies = selectDoneReplies([...channelMessages, ...threadMessages], parents, { authorId });
  console.log(`Scanned ${channelMessages.length} channel messages and ${threadMessages.length} thread messages. ${replies.length} done repl${replies.length === 1 ? "y" : "ies"} from Chris.`);
  if (!replies.length) return;

  const catalog = loadCatalog(dataJsPath);
  let remote = null;
  let firebaseNote = "Firebase overrides were not read. Plan uses js/data.js.";
  const auth = firebaseAuthFromEnv();
  if (auth) {
    try {
      remote = await readPipelineOverrides({ databaseUrl: firebaseDatabaseUrl(), auth });
      firebaseNote = "Firebase overrides/pageStatus were read and override the catalog when present.";
    } catch (error) {
      firebaseNote = `Firebase read failed (${error.message}). Plan uses js/data.js.`;
      if (apply) console.error(firebaseNote);
    }
  }

  const file = readClearFile();
  const tasks = catalog.map((task) => ({
    ...task,
    pageStatus: remote?.pageStatus?.[task.id] || task.pageStatus,
  }));
  const { results, applied } = planScannedReplies(tasks, replies, { ledger: ledgerFromFile(file) });
  console.log(formatPlan(results, { firebaseNote }));

  const updates = applied.filter((item) => item.action === "update");
  const ambiguous = results.filter((result) => result.status === "ambiguous").length;
  const unmatched = results.filter((result) => result.status === "unmatched").length;
  if (ambiguous || unmatched) {
    console.log("Ambiguous or unmatched replies were left unchanged. The matched replies still publish.");
  }
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to write js/data.js and data/seo-clears.json.");
    return;
  }
  if (!updates.length && applied.every((item) => file.clears?.some((clear) => clear.id === item.id && clear.slackTs === item.slackTs))) {
    console.log("Nothing new to publish.");
    return;
  }

  const seedUpdates = updates.filter((item) => ["needs_seo", "seo_in_progress"].includes(item.seedStatus));
  if (seedUpdates.length) {
    const source = fs.readFileSync(dataJsPath, "utf8");
    fs.writeFileSync(dataJsPath, patchTrackerSource(source, seedUpdates.map((item) => ({
      id: item.id,
      to: "seo_done",
      details: item.details,
    }))));
    console.log(`Updated ${seedUpdates.length} seed row(s) in js/data.js.`);
  }

  const published = mergeClearFile(file, applied);
  fs.writeFileSync(clearFilePath, `${JSON.stringify(published, null, 2)}\n`);
  console.log(`Published ${published.clears.length} clear(s) to data/seo-clears.json.`);

  if (remote && auth) {
    for (const item of updates) {
      await writeSeoClear({
        databaseUrl: firebaseDatabaseUrl(),
        auth,
        target: { id: item.id, from: item.from, to: "seo_done", details: item.details },
        clear: { cleared_by: item.clearedBy, cleared_at: item.clearedAt, slack_ts: item.slackTs },
      });
      console.log(`Firebase ${item.id}: ${item.from} → seo_done`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    if (error.slackError === "not_in_channel") {
      console.error("The Slack bot is not in #seo-page-builder. Invite it, then rerun.");
    } else if (error.slackError === "missing_scope") {
      console.error("SLACK_BOT_TOKEN needs channels:history. Add groups:history too if the channel is private.");
    }
    console.error(error);
    process.exitCode = 1;
  });
}

export { main };

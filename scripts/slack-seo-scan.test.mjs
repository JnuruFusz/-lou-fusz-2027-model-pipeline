import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "./lib/seo-clear-sync.mjs";
import {
  CHRIS_SLACK_USER_ID,
  isSeoDoneReply,
  mergeClearFile,
  planScannedReplies,
  selectDoneReplies,
  slackTsToIso,
} from "./lib/slack-seo-scan.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = loadCatalog(path.join(root, "js", "data.js"));

const OCT2_DIGEST = `
:black_circle: 2027 Jeep Wrangler — Lou Fusz Chrysler Jeep Dodge Ram Vincennes · On lot
:large_yellow_circle: 2027 Chevrolet Silverado 1500 — Lou Fusz Chevrolet · Upcoming
:large_blue_circle: 2027 Subaru Crosstrek Hybrid — Lou Fusz Subaru St. Louis · Upcoming
:large_blue_circle: 2027 Subaru Crosstrek Hybrid — Lou Fusz Subaru O'Fallon · Upcoming
:large_blue_circle: 2027 Subaru Getaway EV — Lou Fusz Subaru St. Louis · Upcoming
`;

test("slack timestamps become the same ISO time the board already stores", () => {
  assert.equal(slackTsToIso("1790974090.844789"), "2026-10-02T20:48:10.844Z");
  assert.equal(slackTsToIso("1790618315.341449"), "2026-09-28T17:58:35.341Z");
});

test("only Chris's done replies are scanned", () => {
  assert.equal(isSeoDoneReply("done 2027 Ford Expedition"), true);
  assert.equal(isSeoDoneReply("Done 2027 Nissan Kicks, done 2027 Nissan Sentra"), true);
  assert.equal(isSeoDoneReply("write queue for Mon Oct 5"), false);
  const parents = new Map([["1790947525.207189", OCT2_DIGEST]]);
  const replies = selectDoneReplies([
    { type: "message", user: "U06HWKA6YMU", text: OCT2_DIGEST, ts: "1790947525.207189" },
    { type: "message", user: CHRIS_SLACK_USER_ID, text: "done 2027 Jeep Wrangler, done 2027 Silverado 1500", ts: "1790974090.844789", thread_ts: "1790947525.207189" },
    { type: "message", subtype: "bot_message", bot_id: "B1", user: CHRIS_SLACK_USER_ID, text: "done 2027 Ford Expedition", ts: "1" },
    { type: "message", user: CHRIS_SLACK_USER_ID, text: "on it", ts: "2" },
  ], parents);
  assert.equal(replies.length, 1);
  assert.equal(replies[0].digest.includes("Getaway EV"), true);
  assert.equal(replies[0].clearedAt, "2026-10-02T20:48:10.844Z");
});

test("October 2 reply readies the digest models and leaves Getaway EV in Needs SEO", () => {
  const tasks = catalog.map((task) => ({ ...task }));
  for (const id of [
    "lou-fusz-chevrolet|2027|silverado-1500",
    "lou-fusz-subaru-st.-louis|2027|crosstrek-hybrid",
    "lou-fusz-subaru-o'fallon|2027|crosstrek-hybrid",
    "lou-fusz-chrysler-jeep-dodge-ram-vincennes|2027|wrangler",
  ]) {
    const task = tasks.find((candidate) => candidate.id === id);
    task.pageStatus = "needs_seo";
    task.seedStatus = "needs_seo";
    task.details = {};
  }
  const { applied, tasks: next } = planScannedReplies(tasks, [{
    ts: "1790974090.844789",
    text: "done 2027 Jeep Wrangler, done 2027 Silverado 1500, done 2027 Crosstrek Hybrid, done 2027 Crosstrek Hybrid",
    clearedAt: "2026-10-02T20:48:10.844Z",
    clearedBy: "Chris Pajda",
    digest: OCT2_DIGEST,
  }]);
  const updated = new Set(applied.filter((item) => item.action === "update").map((item) => item.id));
  assert.deepEqual([...updated].sort(), [
    "lou-fusz-chevrolet|2027|silverado-1500",
    "lou-fusz-chrysler-jeep-dodge-ram-vincennes|2027|wrangler",
    "lou-fusz-subaru-o'fallon|2027|crosstrek-hybrid",
    "lou-fusz-subaru-st.-louis|2027|crosstrek-hybrid",
  ].sort());
  assert.equal(next.find((task) => task.id === "lou-fusz-subaru-st.-louis|2027|getaway-ev").pageStatus, "needs_seo");
  assert.equal(next.find((task) => task.id === "lou-fusz-chrysler-jeep-dodge-ram|2027|wrangler").pageStatus, "needs_build");
  assert.equal(next.find((task) => task.id === "lou-fusz-subaru-st.-louis|2027|crosstrek").pageStatus, "needs_seo");
});

test("a done reply with no digest does not guess a rooftop", () => {
  const tasks = catalog.map((task) => ({ ...task, pageStatus: task.id.includes("seltos") ? "needs_seo" : task.pageStatus, seedStatus: task.id.includes("seltos") ? "needs_seo" : task.seedStatus }));
  const { results, applied } = planScannedReplies(tasks, [{
    ts: "1790619049.639689",
    text: "done 2027 Kia Seltos",
    clearedAt: "2026-09-28T18:10:49.639Z",
    digest: "",
  }]);
  assert.equal(results.some((result) => result.status === "ambiguous"), true);
  assert.equal(applied.some((item) => item.action === "update"), false);
});

test("publishing a clear file keeps earlier rows and does not duplicate ids", () => {
  const merged = mergeClearFile({
    channel: "C0C3KGH1DJ8",
    author: "Chris Pajda",
    clears: [{ id: "lou-fusz-ford|2027|expedition", clearedBy: "Chris Pajda", clearedAt: "2026-09-28T17:58:35.341Z", slackTs: "1790618315.341449" }],
  }, [
    { id: "lou-fusz-ford|2027|expedition", clearedBy: "Chris Pajda", clearedAt: "2026-09-28T17:58:35.341Z", slackTs: "1790618315.341449" },
    { id: "lou-fusz-chevrolet|2027|silverado-1500", clearedBy: "Chris Pajda", clearedAt: "2026-10-02T20:48:10.844Z", slackTs: "1790974090.844789" },
  ]);
  assert.equal(merged.clears.length, 2);
  assert.equal(merged.clears[1].id, "lou-fusz-chevrolet|2027|silverado-1500");
});

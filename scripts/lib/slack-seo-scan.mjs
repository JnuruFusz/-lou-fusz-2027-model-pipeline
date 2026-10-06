/**
 * Turn Chris's "done 2027 …" replies in #seo-page-builder into pipeline clears.
 * Chris does not use Fusz+. The scanner reads Slack and the app publishes the result.
 */

import {
  clearsFromDoneText,
  planSeoClears,
  scopeIdsFromDigest,
} from "./seo-clear-sync.mjs";

export const SEO_PAGE_BUILDER_CHANNEL = "C0C3KGH1DJ8";
export const CHRIS_SLACK_USER_ID = "U0C3FP7L3MY";
export const CHRIS_CLEAR_NAME = "Chris Pajda";

export function slackTsToIso(ts) {
  const [seconds, fraction = "0"] = String(ts || "").split(".");
  const millis = Number(fraction.slice(0, 3).padEnd(3, "0"));
  const stamp = Number(seconds) * 1000 + millis;
  if (!Number.isFinite(stamp)) return "";
  return new Date(stamp).toISOString();
}

export function isSeoDoneReply(text) {
  return String(text || "")
    .replace(/[’‘]/g, "'")
    .split(/,|\n/)
    .some((part) => /^done\s+20\d{2}\b/i.test(part.trim()));
}

export function isPlainSlackMessage(message) {
  return Boolean(message && message.type === "message" && !message.subtype && !message.bot_id && message.user && message.text);
}

export function selectDoneReplies(messages = [], parentsByTs = new Map(), options = {}) {
  const authorId = options.authorId || CHRIS_SLACK_USER_ID;
  const authorName = options.authorName || CHRIS_CLEAR_NAME;
  return messages
    .filter((message) => isPlainSlackMessage(message) && message.user === authorId && isSeoDoneReply(message.text))
    .map((message) => {
      const threadTs = message.thread_ts && message.thread_ts !== message.ts ? message.thread_ts : "";
      return {
        ts: message.ts,
        threadTs,
        text: message.text,
        clearedAt: slackTsToIso(message.ts),
        clearedBy: authorName,
        digest: threadTs ? (parentsByTs.get(threadTs) || "") : "",
      };
    })
    .sort((a, b) => Number(a.ts) - Number(b.ts));
}

export function planScannedReplies(catalog = [], replies = [], options = {}) {
  const tasks = catalog.map((task) => ({ ...task, details: { ...(task.details || {}) } }));
  const ledger = { ...(options.ledger || {}) };
  const results = [];
  const applied = [];

  for (const reply of replies) {
    const scopeIds = reply.digest ? scopeIdsFromDigest(tasks, reply.digest) : [];
    const clears = clearsFromDoneText(reply.text, {
      cleared_by: reply.clearedBy || CHRIS_CLEAR_NAME,
      cleared_at: reply.clearedAt,
      slack_ts: reply.ts,
    });
    const planned = planSeoClears(tasks, clears, { scopeIds, ledger });
    results.push(...planned);
    for (const result of planned) {
      for (const target of result.targets || []) {
        if (target.action === "update") {
          const task = tasks.find((candidate) => candidate.id === target.id);
          if (task) {
            task.pageStatus = target.to;
            task.details = { ...(task.details || {}), ...(target.details || {}) };
          }
          ledger[target.id] = { slack_ts: reply.ts };
        }
        if (target.action === "update" || target.action === "noop") {
          applied.push({
            id: target.id,
            clearedBy: reply.clearedBy || CHRIS_CLEAR_NAME,
            clearedAt: reply.clearedAt,
            slackTs: reply.ts,
            action: target.action,
            from: target.from,
            to: target.to,
            seedStatus: target.seedStatus,
            details: target.details,
          });
        }
      }
    }
  }

  return { results, applied, tasks };
}

export function mergeClearFile(existing = {}, applied = []) {
  const clears = (Array.isArray(existing.clears) ? existing.clears : [])
    .filter((clear) => clear && clear.id)
    .map((clear) => ({ ...clear }));
  const byId = new Map(clears.map((clear) => [clear.id, clear]));
  for (const item of applied) {
    if (!item?.id) continue;
    const next = {
      id: item.id,
      clearedBy: item.clearedBy || CHRIS_CLEAR_NAME,
      clearedAt: item.clearedAt || "",
      slackTs: item.slackTs || "",
    };
    const previous = byId.get(item.id);
    if (previous) Object.assign(previous, next);
    else {
      clears.push(next);
      byId.set(item.id, next);
    }
  }
  return {
    channel: existing.channel || SEO_PAGE_BUILDER_CHANNEL,
    author: existing.author || CHRIS_CLEAR_NAME,
    clears,
  };
}

export async function slackApi(token, method, params, fetchImpl = fetch) {
  const query = new URLSearchParams(params);
  const response = await fetchImpl(`https://slack.com/api/${method}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.ok) {
    const error = new Error(`Slack ${method} failed: ${data.error || response.status}`);
    error.slackError = data.error || "";
    throw error;
  }
  return data;
}

export async function fetchChannelMessages(token, channel, { oldest = "", fetchImpl = fetch } = {}) {
  const messages = [];
  let cursor = "";
  do {
    const params = { channel, limit: "200" };
    if (oldest) params.oldest = String(oldest);
    if (cursor) params.cursor = cursor;
    const data = await slackApi(token, "conversations.history", params, fetchImpl);
    messages.push(...(data.messages || []));
    cursor = data.response_metadata?.next_cursor || "";
  } while (cursor);
  return messages;
}

export async function fetchThreadParents(token, channel, threadIds = [], fetchImpl = fetch) {
  const parents = new Map();
  for (const ts of threadIds) {
    if (!ts || parents.has(ts)) continue;
    const data = await slackApi(token, "conversations.replies", {
      channel,
      ts,
      limit: "1",
      inclusive: "true",
    }, fetchImpl);
    const parent = (data.messages || [])[0];
    if (parent?.text) parents.set(ts, parent.text);
  }
  return parents;
}

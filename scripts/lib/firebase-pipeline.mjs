/**
 * Firebase Realtime Database is the live Team Pipeline override store.
 * js/firebase.js writes the whole maps; this client patches one task at a time.
 *
 *   overrides/pageStatus/<taskId>  → pageStatus string
 *   overrides/details/<taskId>     → { seoOwner, stagedAt, notes, ... }
 *   overrides/seoClears/<taskId>   → { slack_ts, cleared_by, cleared_at, from, to }
 */

import { decodeFirebaseMap, firebaseTaskKey } from "./firebase-keys.mjs";

const DEFAULT_DATABASE_URL = "https://fuszplus-default-rtdb.firebaseio.com";

export function firebaseAuthFromEnv(env = process.env) {
  return env.FIREBASE_ID_TOKEN || env.FIREBASE_AUTH_TOKEN || env.FIREBASE_DATABASE_SECRET || "";
}

export function firebaseDatabaseUrl(env = process.env) {
  return (env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL).replace(/\/$/, "");
}

function taskPath(base, id) {
  return `${base}/${encodeURIComponent(firebaseTaskKey(id))}`;
}

async function requestJson(fetchImpl, url, { method = "GET", body, auth } = {}) {
  const target = new URL(url);
  if (auth) target.searchParams.set("auth", auth);
  const response = await fetchImpl(target, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok || (payload && payload.error)) {
    const message = payload?.error || `${response.status} ${response.statusText}`;
    const error = new Error(`Firebase ${method} ${target.pathname} failed: ${message}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function readPipelineOverrides({ fetchImpl = fetch, databaseUrl, auth }) {
  const root = databaseUrl.replace(/\/$/, "");
  const [pageStatus, details, seoClears] = await Promise.all([
    requestJson(fetchImpl, `${root}/overrides/pageStatus.json`, { auth }),
    requestJson(fetchImpl, `${root}/overrides/details.json`, { auth }),
    requestJson(fetchImpl, `${root}/overrides/seoClears.json`, { auth }),
  ]);
  return {
    pageStatus: decodeFirebaseMap(pageStatus),
    details: decodeFirebaseMap(details),
    seoClears: decodeFirebaseMap(seoClears),
  };
}

export async function writeSeoClear({ fetchImpl = fetch, databaseUrl, auth, target, clear }) {
  const root = databaseUrl.replace(/\/$/, "");
  const currentDetails = await requestJson(fetchImpl, `${root}/${taskPath("overrides/details", target.id)}.json`, { auth });
  const details = { ...(currentDetails || {}), ...target.details };
  await requestJson(fetchImpl, `${root}/${taskPath("overrides/pageStatus", target.id)}.json`, {
    method: "PUT",
    auth,
    body: target.to,
  });
  await requestJson(fetchImpl, `${root}/${taskPath("overrides/details", target.id)}.json`, {
    method: "PUT",
    auth,
    body: details,
  });
  await requestJson(fetchImpl, `${root}/${taskPath("overrides/seoClears", target.id)}.json`, {
    method: "PUT",
    auth,
    body: {
      slack_ts: clear.slack_ts || null,
      cleared_by: clear.cleared_by || null,
      cleared_at: clear.cleared_at || target.details?.stagedAt || null,
      from: target.from,
      to: target.to,
    },
  });
}

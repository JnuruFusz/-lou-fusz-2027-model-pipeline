import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { firebaseTaskKey, taskIdFromFirebaseKey } from "./lib/firebase-keys.mjs";
import { readPipelineOverrides, writeSeoClear } from "./lib/firebase-pipeline.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ST_LOUIS = "lou-fusz-subaru-st.-louis|2027|crosstrek-hybrid";
const FORD = "lou-fusz-ford|2027|expedition";
const FORBIDDEN = /[.#$/[\]]/;

function assertFirebaseValue(value, where) {
  if (!value || typeof value !== "object") return;
  Object.keys(value).forEach((key) => {
    if (FORBIDDEN.test(key)) {
      throw new Error(`set failed: value argument contains an invalid key (${key}) in property '${where}'`);
    }
    assertFirebaseValue(value[key], `${where}/${key}`);
  });
}

function loadFirebase() {
  const writes = [];
  const listeners = [];
  const storage = new Map();
  function makeRef(refPath) {
    return {
      set(value) {
        assertFirebaseValue(value, refPath);
        writes.push({ op: "set", path: refPath, value });
        return Promise.resolve();
      },
      update(value) {
        assertFirebaseValue(value, refPath);
        writes.push({ op: "update", path: refPath, value });
        return Promise.resolve();
      },
      child(key) {
        if (FORBIDDEN.test(key)) {
          throw new Error(`child failed: invalid key (${key}) in '${refPath}'`);
        }
        return makeRef(`${refPath}/${key}`);
      },
      on(_event, callback) {
        listeners.push(callback);
      },
    };
  }
  const sandbox = {
    console,
    state: { overrides: {}, aeoOverrides: {}, signalOverrides: {}, details: {}, tasks: [{ id: ST_LOUIS }] },
    localStorage: {
      setItem(key, value) { storage.set(key, String(value)); },
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      removeItem(key) { storage.delete(key); },
    },
    document: {
      createElement() {
        return { src: "", onload: null, onerror: null };
      },
      head: {
        appendChild(el) {
          if (el.onload) el.onload();
        },
      },
    },
    firebase: {
      initializeApp() { return {}; },
      database() { return { ref: makeRef }; },
      auth() {
        return { onAuthStateChanged(cb) { cb(null); } };
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "js", "firebase.js"), "utf8"), sandbox);
  return { sandbox, writes, listeners, storage };
}

test("st. louis task ids round-trip to a legal Firebase key", () => {
  const key = firebaseTaskKey(ST_LOUIS);
  assert.equal(FORBIDDEN.test(key), false);
  assert.equal(taskIdFromFirebaseKey(key), ST_LOUIS);
  assert.equal(firebaseTaskKey(FORD), FORD);
  assert.equal(firebaseTaskKey("a#b$c/d[e]"), "a%23b%24c%2Fd%5Be%5D");
});

test("browser and scanner encode the same st. louis key", () => {
  const { sandbox } = loadFirebase();
  assert.equal(sandbox.firebaseTaskKey(ST_LOUIS), firebaseTaskKey(ST_LOUIS));
  assert.equal(sandbox.taskIdFromFirebaseKey(firebaseTaskKey(ST_LOUIS)), ST_LOUIS);
});

test("saving every page status no longer throws on the st. louis Crosstrek", () => {
  const { sandbox, writes, listeners, storage } = loadFirebase();
  const { state } = sandbox;
  state.overrides = {
    [ST_LOUIS]: "seo_done",
    [FORD]: "needs_build",
  };
  assert.throws(() => assertFirebaseValue(state.overrides, "overrides.pageStatus"), /invalid key/);

  assert.doesNotThrow(() => sandbox.fbSetPageStatus(state.overrides));
  state.overrides[ST_LOUIS] = "needs_build";
  assert.doesNotThrow(() => sandbox.fbSetPageStatus(state.overrides));
  state.details[ST_LOUIS] = {
    seoOwner: "Chris Pajda",
    buildOwner: "Jnuru Goodwin",
    stagedAt: "2026-10-06T20:40:00.000Z",
  };
  assert.doesNotThrow(() => sandbox.fbSetDetails(state.details));

  const statusWrite = writes.find((write) => write.path === "overrides/pageStatus" && write.value[firebaseTaskKey(ST_LOUIS)] === "needs_build");
  assert.ok(statusWrite, "encoded status write");
  assert.equal(statusWrite.value[FORD], "needs_build");
  assert.equal(Object.keys(statusWrite.value).some((key) => FORBIDDEN.test(key)), false);
  assert.equal(JSON.parse(storage.get("pipeline-status-overrides"))[ST_LOUIS], "needs_build");

  const detailWrite = writes.find((write) => write.path === "overrides/details");
  assert.equal(detailWrite.value[firebaseTaskKey(ST_LOUIS)].buildOwner, "Jnuru Goodwin");

  listeners[0]({
    val() {
      return {
        pageStatus: statusWrite.value,
        details: detailWrite.value,
      };
    },
  });
  assert.equal(state.overrides[ST_LOUIS], "needs_build");
  assert.equal(state.details[ST_LOUIS].seoOwner, "Chris Pajda");
  assert.equal(state.overrides[FORD], "needs_build");
});

test("a single st. louis patch uses the encoded child key", () => {
  const { sandbox, writes } = loadFirebase();
  sandbox.fbPatchPageStatus(ST_LOUIS, "seo_done");
  sandbox.fbPatchTaskDetails(ST_LOUIS, { seoOwner: "Chris Pajda" });
  assert.equal(sandbox.state.overrides[ST_LOUIS], "seo_done");
  assert.equal(writes[0].path, `overrides/pageStatus/${firebaseTaskKey(ST_LOUIS)}`);
  assert.equal(writes[0].value, "seo_done");
  assert.equal(writes[1].path, `overrides/details/${firebaseTaskKey(ST_LOUIS)}`);
  assert.deepEqual(JSON.parse(JSON.stringify(writes[1].value)), { seoOwner: "Chris Pajda" });
});

test("scanner writes and reads the st. louis Crosstrek under the encoded key", async () => {
  const encoded = firebaseTaskKey(ST_LOUIS);
  const store = {
    "overrides/pageStatus": {
      [encoded]: "seo_done",
      [FORD]: "needs_build",
    },
    "overrides/details": {
      [encoded]: { seoOwner: "Chris Pajda" },
    },
    "overrides/seoClears": {},
  };
  const fetchImpl = async (url, options = {}) => {
    const target = url instanceof URL ? url : new URL(url);
    const key = target.pathname.replace(/^\//, "").replace(/\.json$/, "");
    if ((options.method || "GET") === "GET") {
      return { ok: true, status: 200, text: async () => JSON.stringify(store[key] ?? null) };
    }
    store[key] = JSON.parse(options.body);
    return { ok: true, status: 200, text: async () => options.body };
  };

  const remote = await readPipelineOverrides({
    fetchImpl,
    databaseUrl: "https://fuszplus-default-rtdb.firebaseio.com",
    auth: "token",
  });
  assert.equal(remote.pageStatus[ST_LOUIS], "seo_done");
  assert.equal(remote.details[ST_LOUIS].seoOwner, "Chris Pajda");
  assert.equal(remote.pageStatus[FORD], "needs_build");

  await writeSeoClear({
    fetchImpl,
    databaseUrl: "https://fuszplus-default-rtdb.firebaseio.com",
    auth: "token",
    clear: { slack_ts: "1.2", cleared_by: "Chris Pajda", cleared_at: "2026-10-02T20:48:10.844Z" },
    target: {
      id: ST_LOUIS,
      from: "needs_seo",
      to: "needs_build",
      details: { stagedAt: "2026-10-06T20:40:00.000Z", buildOwner: "Jnuru Goodwin" },
    },
  });
  const writtenKey = `overrides/pageStatus/${encodeURIComponent(encoded)}`;
  assert.equal(store[writtenKey], "needs_build");
  assert.equal(FORBIDDEN.test(decodeURIComponent(writtenKey.split("/").pop())), false);
});

/* ---------------------------------------------------------------
   firebase.js — shared real-time state + Google Auth for Fusz+
   Replaces localStorage for the four shared keys:
     pipeline-status-overrides
     pipeline-aeo-overrides
     pipeline-signal-overrides
     pipeline-task-details
   Session + theme stay in localStorage (they're per-device).
   --------------------------------------------------------------- */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBJabh6fhMvDs7U5L1EHoQPTRBbr_PpZt0",
  authDomain: "fuszplus.firebaseapp.com",
  databaseURL: "https://fuszplus-default-rtdb.firebaseio.com",
  projectId: "fuszplus",
  storageBucket: "fuszplus.firebasestorage.app",
  messagingSenderId: "661147314154",
  appId: "1:661147314154:web:215144227c2e31e6b0f493",
};

let _db   = null;
let _auth = null;
let _firebaseReady = false;
let _fbAuthReady   = false;
const _pendingWrites = [];
const _pendingPatches = [];

/* Auth promise — resolves with the Firebase user (or null) once
   onAuthStateChanged fires for the first time on page load. */
let _authResolve;
const _authPromise = new Promise((resolve) => { _authResolve = resolve; });

/* Wait for Firebase Auth to resolve (with optional timeout). */
function fbWaitForAuth(timeoutMs = 5000) {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([_authPromise, timeout]);
}

/* Sign in with Google popup. Returns a Promise that resolves with the
   UserCredential so the caller can read result.user immediately.
   If the popup is blocked, throws auth/popup-blocked — caller should
   show a message asking the user to allow popups for this site. */
function fbSignInWithGoogle() {
  if (!_auth) return Promise.reject(new Error("Auth not ready"));
  const provider = new firebase.auth.GoogleAuthProvider();
  return _auth.signInWithPopup(provider);
}

/* Not used in the popup flow but kept for emergencies. */
function fbGetRedirectResult() {
  if (!_auth) return Promise.resolve(null);
  return _auth.getRedirectResult();
}

/* Sign out */
function fbSignOut() {
  if (!_auth) return Promise.resolve();
  return _auth.signOut();
}

/* Current signed-in user (or null) */
function fbGetCurrentUser() {
  return _auth ? _auth.currentUser : null;
}

/* Load Firebase SDKs from CDN, then connect */
(function initFirebase() {
  const appScript = document.createElement("script");
  appScript.src = "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js";
  appScript.onload = () => {
    /* Load database + auth SDKs in parallel */
    let loaded = 0;
    const onBothLoaded = () => {
      loaded++;
      if (loaded < 2) return;

      try {
        const app = firebase.initializeApp(FIREBASE_CONFIG);

        /* --- Realtime Database --- */
        _db = firebase.database(app);
        _firebaseReady = true;

        /* Flush any writes queued before Firebase was ready.
           Values are already encoded by the write helpers. */
        _pendingWrites.forEach(([path, value]) => {
          try { _db.ref(path).set(value); }
          catch (err) { console.warn("[Fusz+] Firebase write failed", path, err); }
        });
        _pendingWrites.length = 0;
        _pendingPatches.splice(0).forEach(([kind, taskKey, value]) => {
          try {
            if (kind === "pageStatus") _db.ref("overrides/pageStatus").child(taskKey).set(value);
            if (kind === "details") _db.ref("overrides/details").child(taskKey).update(value);
          } catch (err) {
            console.warn("[Fusz+] Firebase patch failed", kind, err);
          }
        });

        /* Listen for remote changes and merge into state + re-render.
           Guard with state.tasks check — the listener fires on connect, before
           boot() has populated tasks, which caused "cannot read .id of undefined".
           Keys are decoded so task ids like "st.-louis" match the catalog. */
        _db.ref("overrides").on("value", (snap) => {
          const data = snap.val() || {};
          state.overrides       = decodeFirebaseMap(data.pageStatus);
          state.aeoOverrides    = decodeFirebaseMap(data.aeoStatus);
          state.signalOverrides = decodeFirebaseMap(data.signal);
          state.details         = decodeFirebaseMap(data.details);
          if (typeof applyRemoteOverrides === "function") applyRemoteOverrides();
          else if (typeof render === "function" && Array.isArray(state.tasks) && state.tasks.length) render();
        });

        /* --- Auth ---
        /* --- Auth (popup flow — simple onAuthStateChanged) --- */
        _auth = firebase.auth(app);
        _auth.onAuthStateChanged((user) => {
          _fbAuthReady = true;
          _authResolve(user);
        });

        console.log("[Fusz+] Firebase connected — real-time sync + auth active");
      } catch (err) {
        console.warn("[Fusz+] Firebase failed to connect, falling back to localStorage", err);
        _fbAuthReady = true;
        _authResolve(null); // unblock boot()
      }
    };

    const dbScript = document.createElement("script");
    dbScript.src = "https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js";
    dbScript.onload = onBothLoaded;
    dbScript.onerror = onBothLoaded; // don't hang on CDN error

    const authScript = document.createElement("script");
    authScript.src = "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js";
    authScript.onload = onBothLoaded;
    authScript.onerror = onBothLoaded;

    document.head.appendChild(dbScript);
    document.head.appendChild(authScript);
  };
  appScript.onerror = () => {
    _fbAuthReady = true;
    _authResolve(null); // unblock boot() on CDN failure
  };
  document.head.appendChild(appScript);
})();

/* ---------------------------------------------------------------
   Write helpers — fall back to localStorage if Firebase isn't ready.

   Realtime Database keys cannot contain . # $ / [ ]
   Task ids such as lou-fusz-subaru-st.-louis|2027|crosstrek-hybrid
   are stored under a reversible encoded key. localStorage and the
   in-app state keep the real task id.
   Keep in sync with scripts/lib/firebase-keys.mjs.
   --------------------------------------------------------------- */
function firebaseTaskKey(taskId) {
  return String(taskId || "").replace(/[.#$/[\]]/g, (char) => {
    const hex = char.charCodeAt(0).toString(16).toUpperCase();
    return `%${hex.length < 2 ? "0" : ""}${hex}`;
  });
}

function taskIdFromFirebaseKey(key) {
  return String(key || "").replace(/%(2E|23|24|2F|5B|5D)/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function encodeFirebaseMap(map) {
  const encoded = {};
  Object.keys(map || {}).forEach((key) => {
    if (!key) return;
    encoded[firebaseTaskKey(key)] = map[key];
  });
  return encoded;
}

function decodeFirebaseMap(map) {
  const decoded = {};
  Object.keys(map || {}).forEach((key) => {
    decoded[taskIdFromFirebaseKey(key)] = map[key];
  });
  return decoded;
}

function writeFirebaseMap(path, map) {
  const payload = encodeFirebaseMap(map);
  try {
    if (_firebaseReady && _db) _db.ref(path).set(payload);
    else _pendingWrites.push([path, payload]);
  } catch (err) {
    console.warn("[Fusz+] Firebase write failed", path, err);
  }
}

function writeFirebaseChild(kind, taskId, value, method) {
  const taskKey = firebaseTaskKey(taskId);
  if (!taskKey) return;
  const path = kind === "pageStatus" ? "overrides/pageStatus" : "overrides/details";
  try {
    if (_firebaseReady && _db) {
      const ref = _db.ref(path).child(taskKey);
      if (method === "update") ref.update(value);
      else ref.set(value);
    } else {
      _pendingPatches.push([kind, taskKey, value]);
    }
  } catch (err) {
    console.warn("[Fusz+] Firebase patch failed", path, err);
  }
}

function fbSetPageStatus(overrides) {
  localStorage.setItem("pipeline-status-overrides", JSON.stringify(overrides));
  writeFirebaseMap("overrides/pageStatus", overrides);
}

function fbSetAeoStatus(aeoOverrides) {
  localStorage.setItem("pipeline-aeo-overrides", JSON.stringify(aeoOverrides));
  writeFirebaseMap("overrides/aeoStatus", aeoOverrides);
}

function fbSetSignal(signalOverrides) {
  localStorage.setItem("pipeline-signal-overrides", JSON.stringify(signalOverrides));
  writeFirebaseMap("overrides/signal", signalOverrides);
}

function fbSetDetails(details) {
  localStorage.setItem("pipeline-task-details", JSON.stringify(details));
  writeFirebaseMap("overrides/details", details);
}

/* Patch one task. Never replace the whole override map. */
function fbPatchPageStatus(taskId, status) {
  if (!taskId) return;
  state.overrides[taskId] = status;
  localStorage.setItem("pipeline-status-overrides", JSON.stringify(state.overrides));
  writeFirebaseChild("pageStatus", taskId, status, "set");
}

function fbPatchTaskDetails(taskId, patch) {
  if (!taskId || !patch) return;
  const nextPatch = {};
  Object.keys(patch).forEach((key) => {
    if (patch[key] != null && patch[key] !== "") nextPatch[key] = patch[key];
  });
  if (!Object.keys(nextPatch).length) return;
  state.details[taskId] = { ...(state.details[taskId] || {}), ...nextPatch };
  localStorage.setItem("pipeline-task-details", JSON.stringify(state.details));
  writeFirebaseChild("details", taskId, nextPatch, "update");
}

function fbClearAll() {
  ["pipeline-status-overrides","pipeline-aeo-overrides","pipeline-signal-overrides","pipeline-task-details"]
    .forEach((k) => localStorage.removeItem(k));
  if (_firebaseReady) {
    _db.ref("overrides").set(null);
  }
}

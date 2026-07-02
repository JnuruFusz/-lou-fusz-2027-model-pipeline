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

/* Auth promise — resolves with user (or null) once Firebase Auth is ready */
let _authResolve;
const _authPromise = new Promise((resolve) => { _authResolve = resolve; });

/* Wait for Firebase Auth to resolve (with optional timeout) */
function fbWaitForAuth(timeoutMs = 5000) {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([_authPromise, timeout]);
}

/* Sign in with Google — uses redirect so popup blockers can't interfere.
   The page navigates away to Google, then returns to the app.
   Boot() picks up the signed-in user via onAuthStateChanged / fbWaitForAuth(). */
function fbSignInWithGoogle() {
  if (!_auth) return Promise.reject(new Error("Auth not ready"));
  const provider = new firebase.auth.GoogleAuthProvider();
  return _auth.signInWithRedirect(provider);
}

/* Check for a pending redirect result (call once in boot() after auth is ready).
   Resolves with the UserCredential if the page just returned from a redirect sign-in,
   or null if there was no pending redirect. Rejects on auth errors. */
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

        /* Flush any writes queued before Firebase was ready */
        _pendingWrites.forEach(([path, value]) => _db.ref(path).set(value));
        _pendingWrites.length = 0;

        /* Listen for remote changes and merge into state + re-render.
           Guard with state.tasks check — the listener fires on connect, before
           boot() has populated tasks, which caused "cannot read .id of undefined". */
        _db.ref("overrides").on("value", (snap) => {
          const data = snap.val() || {};
          state.overrides      = data.pageStatus || {};
          state.aeoOverrides   = data.aeoStatus  || {};
          state.signalOverrides = data.signal    || {};
          state.details        = data.details    || {};
          if (typeof render === "function" && Array.isArray(state.tasks) && state.tasks.length) render();
        });

        /* --- Auth --- */
        _auth = firebase.auth(app);
        _auth.onAuthStateChanged((user) => {
          _fbAuthReady = true;
          _authResolve(user); // resolves fbWaitForAuth()
        });

        console.log("[Fusz+] Firebase connected — real-time sync + auth active");
      } catch (err) {
        console.warn("[Fusz+] Firebase failed to connect, falling back to localStorage", err);
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
  appScript.onerror = () => _authResolve(null); // unblock boot() on CDN failure
  document.head.appendChild(appScript);
})();

/* ---------------------------------------------------------------
   Write helpers — fall back to localStorage if Firebase isn't ready
   --------------------------------------------------------------- */
function fbSetPageStatus(overrides) {
  localStorage.setItem("pipeline-status-overrides", JSON.stringify(overrides));
  if (_firebaseReady) {
    _db.ref("overrides/pageStatus").set(overrides);
  } else {
    _pendingWrites.push(["overrides/pageStatus", overrides]);
  }
}

function fbSetAeoStatus(aeoOverrides) {
  localStorage.setItem("pipeline-aeo-overrides", JSON.stringify(aeoOverrides));
  if (_firebaseReady) {
    _db.ref("overrides/aeoStatus").set(aeoOverrides);
  } else {
    _pendingWrites.push(["overrides/aeoStatus", aeoOverrides]);
  }
}

function fbSetSignal(signalOverrides) {
  localStorage.setItem("pipeline-signal-overrides", JSON.stringify(signalOverrides));
  if (_firebaseReady) {
    _db.ref("overrides/signal").set(signalOverrides);
  } else {
    _pendingWrites.push(["overrides/signal", signalOverrides]);
  }
}

function fbSetDetails(details) {
  localStorage.setItem("pipeline-task-details", JSON.stringify(details));
  if (_firebaseReady) {
    _db.ref("overrides/details").set(details);
  } else {
    _pendingWrites.push(["overrides/details", details]);
  }
}

function fbClearAll() {
  ["pipeline-status-overrides","pipeline-aeo-overrides","pipeline-signal-overrides","pipeline-task-details"]
    .forEach((k) => localStorage.removeItem(k));
  if (_firebaseReady) {
    _db.ref("overrides").set(null);
  }
}

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

/* ---------------------------------------------------------------
   Auth promise — THE KEY FIX
   -----------------------------------------------------------------
   With signInWithRedirect, onAuthStateChanged fires TWICE on the
   return page load:
     1. Immediately with null  (redirect is still being processed)
     2. A moment later with the signed-in user  (redirect done)

   A one-shot Promise that resolves on the first fire always captures
   null and misses the user entirely.

   Fix: we resolve only AFTER getRedirectResult() has been awaited.
   getRedirectResult() is what consumes the stored redirect token and
   causes Firebase to emit the second onAuthStateChanged(user). We
   call it inside initFirebase, then resolve the promise with the
   definitive auth state.

   Sequence on redirect return:
     1. onAuthStateChanged(null)  — we do NOT resolve yet
     2. getRedirectResult()       — consumes redirect token
     3. onAuthStateChanged(user)  — now we resolve with the real user

   Sequence on fresh load (no pending redirect):
     1. onAuthStateChanged(null/user)  — we call getRedirectResult()
     2. getRedirectResult() → null     — no pending redirect
     3. We resolve with whatever onAuthStateChanged gave us
   ----------------------------------------------------------------- */
let _authResolve;
const _authPromise = new Promise((resolve) => { _authResolve = resolve; });

/* Wait for Firebase Auth to resolve with the definitive user (or null).
   Includes a timeout so boot() is never blocked forever on CDN failure. */
function fbWaitForAuth(timeoutMs = 8000) {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([_authPromise, timeout]);
}

/* Sign in with Google — uses redirect so popup blockers can't interfere.
   The page navigates away to Google, then returns to the app.
   boot() picks up the signed-in user via fbWaitForAuth(). */
function fbSignInWithGoogle() {
  if (!_auth) return Promise.reject(new Error("Auth not ready"));
  const provider = new firebase.auth.GoogleAuthProvider();
  return _auth.signInWithRedirect(provider);
}

/* Exposed for boot() to call if it needs the raw redirect credential
   (e.g. to surface auth errors). The real redirect processing happens
   inside initFirebase before fbWaitForAuth resolves. */
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
          state.overrides       = data.pageStatus || {};
          state.aeoOverrides    = data.aeoStatus  || {};
          state.signalOverrides = data.signal      || {};
          state.details         = data.details     || {};
          if (typeof render === "function" && Array.isArray(state.tasks) && state.tasks.length) render();
        });

        /* --- Auth ---
           THE FIX: We must call getRedirectResult() BEFORE settling
           _authPromise. This ensures:
             (a) The redirect token is consumed and the real user lands
                 in onAuthStateChanged before we resolve.
             (b) Any redirect auth error is captured here, not lost.

           Flow:
             - onAuthStateChanged registers a one-time listener.
             - We call getRedirectResult() which triggers Firebase to
               process any pending redirect credential.
             - If there was a redirect, onAuthStateChanged fires again
               with the signed-in user. We resolve with that user.
             - If there was no redirect, getRedirectResult() resolves
               null quickly and the existing onAuthStateChanged result
               (null or a previously-cached user) is used to resolve.
        */
        _auth = firebase.auth(app);

        /* Track the most recent user from onAuthStateChanged */
        let _latestUser = undefined; // undefined = not yet fired
        let _redirectResultDone = false;

        const tryResolve = () => {
          /* Only resolve once both signals are in */
          if (_latestUser === undefined || !_redirectResultDone) return;
          _fbAuthReady = true;
          _authResolve(_latestUser);
        };

        _auth.onAuthStateChanged((user) => {
          _latestUser = user;
          tryResolve();
        });

        /* Call getRedirectResult immediately after setting up the
           onAuthStateChanged listener. It may trigger a second
           onAuthStateChanged(user) call which updates _latestUser
           before tryResolve() sees it — that's exactly what we want. */
        _auth.getRedirectResult()
          .then((result) => {
            /* result.user is set if the page just returned from a redirect.
               onAuthStateChanged will have already fired (or will fire
               shortly) with that user — we don't need to use result.user
               directly. Just mark redirect processing done. */
            if (result && result.operationType && !result.user) {
              console.warn("[Fusz+] Redirect result missing user:", result);
            }
          })
          .catch((err) => {
            /* Auth error from the Google redirect (e.g. wrong account,
               popup closed, auth/account-exists-with-different-credential).
               Store it so boot() can surface a toast after UI is ready. */
            console.warn("[Fusz+] Google redirect sign-in error:", err.code, err.message);
            state._pendingAuthError = err.code || "auth/unknown";
          })
          .finally(() => {
            _redirectResultDone = true;
            tryResolve();
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

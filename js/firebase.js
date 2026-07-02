/* ---------------------------------------------------------------
   firebase.js — shared real-time state for Fusz+
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

let _db = null;
let _firebaseReady = false;
const _pendingWrites = [];

/* Load Firebase SDK from CDN, then connect */
(function initFirebase() {
  const script = document.createElement("script");
  script.src = "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js";
  script.onload = () => {
    const dbScript = document.createElement("script");
    dbScript.src = "https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js";
    dbScript.onload = () => {
      try {
        const app = firebase.initializeApp(FIREBASE_CONFIG);
        _db = firebase.database(app);
        _firebaseReady = true;

        /* Flush any writes that happened before Firebase was ready */
        _pendingWrites.forEach(([path, value]) => _db.ref(path).set(value));
        _pendingWrites.length = 0;

        /* Listen for remote changes and merge into state + re-render */
        _db.ref("overrides").on("value", (snap) => {
          const data = snap.val() || {};
          state.overrides = data.pageStatus || {};
          state.aeoOverrides = data.aeoStatus || {};
          state.signalOverrides = data.signal || {};
          state.details = data.details || {};
          if (typeof render === "function") render();
        });

        console.log("[Fusz+] Firebase connected — real-time sync active");
      } catch (err) {
        console.warn("[Fusz+] Firebase failed to connect, falling back to localStorage", err);
      }
    };
    document.head.appendChild(dbScript);
  };
  document.head.appendChild(script);
})();

/* Write helpers — fall back to localStorage if Firebase isn't ready */
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

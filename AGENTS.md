# AGENTS.md

Project-specific context lives in `CLAUDE.md` (architecture, data model, file map). Read it first.

## Cursor Cloud specific instructions

### What this is
Fusz+ is a **static, no-build single-page app** — plain `index.html` + vanilla JS modules (`js/*.js`) + CSS (`css/*.css`). There is **no `package.json`, no bundler, no lint config, and no test suite**. Nothing needs to be installed to develop it; the base image already has `python3` (and `node`, used only for ad-hoc `node --check` syntax checks).

### Running it (dev)
The app fetches the dealer inventory feeds with `fetch("data/*.csv")`, so it **must be served over HTTP** — opening `index.html` from `file://` fails the CSV fetches. Serve the repo root with any static server, e.g.:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`. There is no separate build/run command — editing a file and reloading the page is the whole dev loop.

### Lint / test / build
None are configured. The only mechanical check available is a JS syntax check: `for f in js/*.js; do node --check "$f"; done`.

### Auth gotcha (important for testing)
Sign-in uses **Firebase Google Sign-In via `signInWithPopup`** (see `js/firebase.js`). The Google OAuth popup cannot be completed in a headless/cloud browser, so the "Open My Work" button won't get you in here. To reach the workspace for manual testing, open the browser devtools console on the loaded page and run:

```js
completeOnboarding(TEAM_ROSTER[0]); // signs in as Jnuru (admin); [1]=Chris SEO, [2]=Scott AEO
```

`completeOnboarding`, `TEAM_ROSTER`, `state`, and `render` are all globals. This sets the `fusz-demo-session` in localStorage and renders the app without touching Google. Append `?demo=reset` to the URL to wipe local session/overrides.

### External services
Firebase Realtime Database + Google Fonts load from CDNs at runtime. If egress to `gstatic.com` / `firebaseio.com` is blocked, the app **still boots** — `js/firebase.js` falls back to `localStorage` for the shared override keys and the UI works fully offline. So blocked CDNs are not a blocker for local dev/testing.

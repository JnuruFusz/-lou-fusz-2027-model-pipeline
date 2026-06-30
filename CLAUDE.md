# Fusz+ — Claude Session Briefing

Internal SEO/Build pipeline dashboard for **Lou Fusz Automotive** (17 dealerships).
Tracks 2027 model pages through: `needs_seo → seo_done → needs_build → page_built → live`.

**Repo:** `https://github.com/JnuruFusz/-lou-fusz-2027-model-pipeline`
**Deploy:** Static HTML — no build step, no framework. Open `index.html` directly.
**Owner:** Jnuru Goodwin — jnurugoodwin48@gmail.com

---

## Architecture

Single-page app. One HTML file, vanilla JS modules loaded with `<script defer>`, CSS cascade in load order.

### CSS load order (never change this)
```
tokens.css → base.css → layout.css → components.css → pages.css → workbench.css → responsive.css → wins.css
```

### JS load order
```
data.js → state.js → renderers.js → navigation.js → theme.js → events.js → upcoming.js → wins.js → app.js
```
Plus two dynamic scripts loaded by `boot()`:
- `js/my-work-workbench.js` — My Work queue renderer
- `js/fusz-implementation.js` — brand accents, dealer data, transitions

---

## Key files

| File | Purpose |
|------|---------|
| `css/tokens.css` | All CSS variables. Light = `body[data-theme="light"]`, Dark = `body[data-theme="gray"]` |
| `js/state.js` | Global `state` object + `els` DOM cache. Theme defaults to `"system"`. |
| `js/app.js` | `boot()`, inventory CSV feed parsing, `dealerNameAliases`, `completedModelOverrideKeys` |
| `js/events.js` | All event bindings. Onboarding via `configureInviteOnboarding()`. |
| `js/renderers.js` | `render()` orchestrator + all HTML builders. `renderWins()` called from here. |
| `js/theme.js` | `applyTheme()`, `setThemePreference()`, system preference listener |
| `js/wins.js` | Wins page — counters, brand shelf, team leaderboard, recent feed |
| `js/navigation.js` | `setWorkspaceView()`, `workspaceLabel()` |
| `data/*.csv` | 17 real dealer inventory feeds (VIN-level data) |

---

## Theme system

User sees: **System / Light / Dark**
Stored as: `"system"` | `"light"` | `"dark"` in localStorage key `fusz-theme`
Applied as: `body[data-theme="light"]` or `body[data-theme="gray"]` (never `"dark"`)

```js
resolveTheme("dark")   // → "gray"  (sets body[data-theme="gray"])
resolveTheme("light")  // → "light"
resolveTheme("system") // → "light" or "gray" based on OS preference
```

**Do not add a `body[data-theme="dark"]` CSS block** — it is never set and was removed intentionally.

---

## Workspace views

Valid values for `state.workspaceView`:

| Value | Page |
|-------|------|
| `my_work` | Builder queue (role-filtered) |
| `team_board` | Full pipeline table |
| `admin` | Admin command center |
| `upcoming` | Future model watchlist |
| `wins` | Celebration / achievements page |
| `docs` | Resources / source hub |
| `settings` | Settings |

Admin panel and Team & permissions section are hidden for non-admin users via `data-admin-only` attribute. `state.session.isAdmin` controls access.

---

## Data model

Each task:
```js
{
  id: "loufusztoyota|2027|toyota-rav4",
  dealer: "Lou Fusz Toyota",
  year: 2027,
  make: "Toyota",
  model: "RAV4",          // make prefix already stripped
  pageStatus: "needs_seo" | "seo_in_progress" | "seo_done" | "needs_build" | "page_built" | "live" | "needs_review" | "ignored" | "snoozed",
  aeoStatus: "not_started" | "in_progress" | "done" | "not_needed",
  inventorySignal: "upcoming" | "shipped" | "on_lot",
  details: { seoOwner, aeoOwner, buildOwner, notes, aeoNotes, updatedAt },
  accent: "#hex",
  accentStyle: "--accent:...",
  inventoryUrl: "...",
}
```

Tasks come from two sources merged in `boot()`:
1. `embeddedTracker` in `data.js` — manually curated seed tasks
2. `fetchInventoryFeed()` — parsed from `data/*.csv` files

---

## Invite / onboarding

- Invite URL pattern: `?invite=seo-writer` | `builder` | `admin` | `aeo-writer`
- `configureInviteOnboarding()` in `events.js` always replaces `.auth-shell` innerHTML
- Auth screen HTML in `index.html` is just a placeholder comment — don't edit it there
- Auth styles live in `css/pages.css` under `/* Auth / Onboarding screen */`
- Invite sends `mailto:` with pre-written message and invite URL

---

## Demo / session state

Everything persists in `localStorage`:
```
fusz-demo-session         → session object (name, role, isAdmin, defaultView)
fusz-theme                → "system" | "light" | "dark"
pipeline-workspace-view   → last active view
pipeline-status-overrides → { taskId: pageStatus }
pipeline-aeo-overrides    → { taskId: aeoStatus }
pipeline-signal-overrides → { taskId: signal }
pipeline-task-details     → { taskId: { seoOwner, buildOwner, notes, ... } }
```

Reset everything: `?demo=reset` in URL.

---

## What's done

- ✅ Full pipeline tracking end to end
- ✅ My Work queue (role-filtered: Builder / SEO / AEO)
- ✅ Team Pipeline table with filters + brand accent pills
- ✅ Admin panel with working nav buttons
- ✅ Settings: theme, notifications, integrations, team table
- ✅ System/Light/Dark theme with warm stone dark mode
- ✅ Invite email flow + onboarding personalisation
- ✅ Admin gating (`data-admin-only`)
- ✅ Real inventory CSV feed (17 dealerships, VIN-level)
- ✅ Task details modal with AEO notes
- ✅ Wins page: animated counters, brand trophy shelf, team leaderboard, recent feed
- ✅ Mobile responsive
- ✅ Digest preview
- ✅ Upcoming Models watchlist

## What's pending

- ⏳ Google Drive SEO folder connection (waiting on shared folder from user)
- ⏳ Role editing for team members (Manage button shows "coming soon")
- ⏳ Real authentication (currently demo session in localStorage)

---

## Push pattern

```bash
git config user.email "jnurugoodwin48@gmail.com"
git config user.name "Jnuru Goodwin"
git add <files>
git commit -m "..."
git remote set-url origin https://TOKEN@github.com/JnuruFusz/-lou-fusz-2027-model-pipeline.git
git push origin main
git remote set-url origin https://github.com/JnuruFusz/-lou-fusz-2027-model-pipeline.git
```

Token is sensitive — never leave it in the remote URL after pushing.

---

## Quick orientation for a new session

1. Clone repo or verify `/tmp/-lou-fusz-2027-model-pipeline/` exists
2. Read this file
3. Check `git log --oneline -10` to see recent changes
4. Ask user what they want to work on

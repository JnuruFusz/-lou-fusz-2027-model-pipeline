# Fusz+ — Claude Session Briefing

Internal SEO/Build pipeline dashboard for **Lou Fusz Automotive** (17 dealerships).
Tracks 2027 model pages through: `needs_seo → seo_done → needs_build → page_built → live`.
AEO (Automotive Email Optimization) runs as a parallel track owned by Scott.

**Repo:** `https://github.com/JnuruFusz/-lou-fusz-2027-model-pipeline`
**Live:** `https://lou-fusz-2027-model-pipeline.netlify.app`
**Deploy:** Static HTML — no build step, no framework. Open `index.html` directly.
**Owner:** Jnuru Goodwin — jnurugoodwin48@gmail.com

---

## Team

| Name | Role | Email | Invite link |
|------|------|-------|-------------|
| Jnuru Goodwin | Builder / Admin | jnurugoodwin48@gmail.com | (admin) |
| Chris Pajda | SEO Writer | chris.pajda@fusz.com | `?invite=chris` |
| Scott Toulou | AEO | scott.toulou@fusz.com | `?invite=scott` |

Invites to Chris and Scott scheduled: **Monday July 6, 2026 at 7:30 AM CT** via Gmail scheduled task.

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
- `js/fusz-implementation.js` — rooftop management, feed health monitoring, Drive connection, builder action handling

---

## Key files

| File | Purpose |
|------|---------|
| `css/tokens.css` | All CSS variables. Light = `body[data-theme="light"]`, Dark = `body[data-theme="gray"]` |
| `js/data.js` | `TEAM_ROSTER`, status/aeo/signal labels, `dealerAccents`, `brandAccentOverrides`, `transitions`, `embeddedTracker`, `embeddedSources` |
| `js/state.js` | Global `state` object + `els` DOM cache. Theme defaults to `"system"`. |
| `js/app.js` | `boot()`, inventory CSV feed parsing, `dealerNameAliases`, `completedModelOverrideKeys`, `populateOwnerFilter()` |
| `js/events.js` | All event bindings. Onboarding via `configureInviteOnboarding()`. Pipeline group toggle + show-all toggle handlers. |
| `js/renderers.js` | `render()` orchestrator + all HTML builders. Pipeline groups, row rendering, AEO section. |
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

**CRITICAL: Do not add a `body[data-theme="dark"]` CSS block** — it is never set and was removed intentionally.
**CRITICAL: Theme is only `"light"` or `"gray"` on body — never `"dark"`.**

Current palette is warm cream/off-white for light mode. All hardcoded hex values in CSS and JS were audited and replaced with CSS variables.

---

## Workspace views

| Value | Page |
|-------|------|
| `my_work` | Builder queue (role-filtered) |
| `team_board` | Full pipeline (grouped urgency tiers) |
| `admin` | Admin command center |
| `upcoming` | Future model watchlist |
| `wins` | Celebration / achievements page |
| `docs` | Resources / source hub |
| `settings` | Settings |

---

## Data model

Each task:
```js
{
  id: "loufusztoyota|2027|toyota-rav4",
  dealer: "Lou Fusz Toyota",
  year: 2027,
  make: "Toyota",
  model: "RAV4",
  pageStatus: "needs_seo" | "seo_in_progress" | "seo_done" | "needs_build" | "page_built" | "live" | "needs_review" | "ignored" | "snoozed",
  aeoStatus: "not_started" | "in_progress" | "done" | "not_needed",
  inventorySignal: "upcoming" | "shipped" | "on_lot",
  details: { seoOwner, buildOwner, aeoOwner, notes, aeoNotes, updatedAt },
  accent: "#hex",
  accentStyle: "--accent:...",
  inventoryUrl: "...",
}
```

**Note:** Most tasks in `embeddedTracker` do NOT have `aeoOwner` in details. The wins page defaults to "Scott Toulou" when `aeoStatus === "done"` and `aeoOwner` is missing. The pipeline AEO tier hardcodes Scott as owner for all AEO rows.

---

## Team Pipeline — grouped urgency tiers

Pipeline replaced the flat table. Groups are rendered in `renderTable()` in `renderers.js`.

### Tiers (mutually exclusive, in priority order)
| Key | Color | Dot | Match condition | Default |
|-----|-------|-----|-----------------|---------|
| `on_lot` | Red | 🔴 | `inventorySignal === "on_lot"` AND not live/ignored/snoozed | Open |
| `blocked` | Violet | 🟣 | `pageStatus === "needs_review"` | Open |
| `ready` | Blue | 🔵 | `pageStatus` in `["seo_done","needs_build"]` | Collapsed |
| `in_progress` | Blue | 🔵 | `pageStatus` in `["seo_in_progress","page_built"]` | Collapsed |
| `needs_seo` | Amber | 🟡 | `pageStatus === "needs_seo"` | Collapsed |

### AEO tier (independent — NOT mutually exclusive)
| Key | Color | Dot | Match condition | Default |
|-----|-------|-----|-----------------|---------|
| `needs_aeo` | Teal | 🩵 | `aeoStatus` not in `["done","not_needed"]` AND not live/ignored/snoozed | Collapsed |

Rendered separately at bottom of pipeline via `renderPipelineGroup(aeoTier, aeoTasks, "Scott Toulou")`. Owner override passed as 3rd arg — all rows in this group show Scott regardless of task's actual seoOwner/buildOwner.

### Pipeline features
- **Collapsible groups** — toggle handler in `events.js` updates localStorage then calls `render()`
- **Row cap** — `PIPELINE_ROW_CAP = 6` — first 6 rows visible, rest in `.pipeline-hidden-rows` div
- **Show all / Show less** — button toggles between expanded/collapsed state, stores total in `data-pipeline-total`
- **Owner filter** — dropdown in toolbar; includes Scott automatically if any AEO-pending tasks exist
- **Owner avatars** — colored initials in each row. Colors: Jnuru=#4D8DF6, Chris=#3DB67A, Scott=#9B5CF6

### Key functions in renderers.js
```js
pipelineOwnerForTask(task)         // SEO stages → seoOwner, build stages → buildOwner
pipelineRowData(task)              // computes all display data for a row
renderPipelineTableRow(task, ownerOverride)  // 6-col grid row (ownerOverride optional)
renderPipelineGroup(tier, tasks, ownerOverride)  // full group with header + rows
renderTable(tasks)                 // renders header + all tier groups + AEO section
filteredTasks()                    // applies status/owner/search filters; Scott filter checks aeoStatus
```

---

## My Work — focus card

Hero layout redesigned. When user clicks a task card, it enters "focus mode":
- `#myWorkPanel` gets `is-focus-mode` class → overrides grid to `1fr`
- Focus card renders full-width hero with large title, status pills, primary action
- Exit focus button returns to queue view

---

## Wins page

`js/wins.js` — driven entirely by real `state.tasks` data.

- Stat cards: pages live, pages built, SEO copy done, words written (est.)
- Brand trophy shelf: progress bars per make
- Team leaderboard: pre-seeded from `TEAM_ROSTER`, layered with real counts
  - Builder wins: `pageStatus` in `["page_built","live"]` → credits `buildOwner`
  - SEO wins: `pageStatus` in `["seo_done","needs_build","page_built","live"]` → credits `seoOwner`
  - AEO wins: `aeoStatus === "done"` → credits `details.aeoOwner` OR defaults to `"Scott Toulou"`
- Recent wins: last 10 live 2027+ pages
- Milestone banner: dynamic based on SEO count

---

## Auth

Firebase Auth with Google Sign-In (`signInWithPopup`). Auth screen is rendered by `configureInviteOnboarding()` in `events.js` — the HTML in `index.html` is just a placeholder.

Invite URL pattern: `?invite=chris` | `?invite=scott` | `?invite=admin`

---

## localStorage keys

```
fusz-demo-session              → session object (name, role, isAdmin, defaultView)
fusz-theme                     → "system" | "light" | "dark"
pipeline-workspace-view        → last active view
pipeline-status-overrides      → { taskId: pageStatus }
pipeline-aeo-overrides         → { taskId: aeoStatus }
pipeline-signal-overrides      → { taskId: signal }
pipeline-task-details          → { taskId: { seoOwner, buildOwner, notes, ... } }
fusz-pipeline-group-collapsed  → { tierKey: boolean } — pipeline group collapse state
```

Reset everything: `?demo=reset` in URL.

---

## What's done

- ✅ Full pipeline tracking end to end
- ✅ My Work queue (role-filtered: Builder / SEO / AEO)
- ✅ My Work focus card — hero layout, full-width focus mode
- ✅ Team Pipeline — grouped urgency tiers (1C design), collapsible, row-capped
- ✅ Team Pipeline — owner column, avatars, time-in-stage badge, nudge button
- ✅ Team Pipeline — AEO tier (teal, Scott's lane)
- ✅ Team Pipeline — owner filter dropdown (includes Scott for AEO tasks)
- ✅ Team Pipeline — Show all / Show less toggle
- ✅ Admin panel with working nav buttons
- ✅ Settings: theme, notifications, integrations, team table
- ✅ System/Light/Dark theme — warm cream light mode, stone dark mode
- ✅ Invite email flow + onboarding personalisation
- ✅ Admin gating (`data-admin-only`)
- ✅ Real inventory CSV feed (17 dealerships, VIN-level)
- ✅ Task details modal with AEO notes
- ✅ Wins page: animated counters, brand shelf, team leaderboard (all 3 roles), recent feed
- ✅ Mobile responsive
- ✅ Upcoming Models watchlist
- ✅ Firebase Auth — Google Sign-In
- ✅ Invite emails to Chris + Scott scheduled (Monday July 6, 7:30 AM CT)

## What's pending

- ⏳ Real `aeoOwner` field on task records in data.js (currently defaults to Scott in wins logic)
- ⏳ Real `stagedAt` timestamps on tasks (time-in-stage badge uses deterministic fake ages from task ID seed)
- ⏳ Google Drive SEO folder connection (waiting on shared folder)
- ⏳ Role editing for team members (Manage button shows "coming soon")
- ⏳ Onboarding flow / first-run experience for new team members
- ⏳ Brand color system documentation

---

## Push pattern

```bash
cd /tmp/repo  # or wherever the repo is cloned
git config user.email "jnurugoodwin48@gmail.com"
git config user.name "Jnuru Goodwin"
git add <files>
git commit -m "..."
git remote set-url origin https://TOKEN@github.com/JnuruFusz/-lou-fusz-2027-model-pipeline.git
git push origin main
git remote set-url origin https://github.com/JnuruFusz/-lou-fusz-2027-model-pipeline.git
```

Token is sensitive — never leave it in the remote URL after pushing. Always clear immediately after.

---

## Quick orientation for a new session

1. `ls /tmp/repo` — check if repo is already cloned; if not, clone it
2. `git log --oneline -10` — see recent changes
3. Read this file top to bottom
4. Ask what to work on — don't assume, the user has context you don't

let toastTimer;

function filteredTasks() {
  const year = els.yearFilter?.value || "all";
  const dealer = els.dealerFilter?.value || "all";
  const status = els.statusFilter?.value || "all";
  const query = (els.searchInput?.value || "").trim().toLowerCase();
  return state.tasks.filter((task) => {
    if (year !== "all" && String(task.year) !== year) return false;
    if (dealer !== "all" && task.dealer !== dealer) return false;
    if (status !== "all" && task.pageStatus !== status && task.aeoStatus !== status) return false;
    if (!query) return true;
    return `${taskTitle(task)} ${task.dealer} ${ownerBucket(task)}`.toLowerCase().includes(query);
  });
}

const DEFAULT_TEAM_PAGE_STATUSES = ["needs_seo", "seo_in_progress", "seo_done", "needs_build", "needs_review"];
const MY_WORK_GROUP_COLLAPSE_KEY = "fusz-my-work-collapsed-groups";
const MY_WORK_GROUP_VISIBLE_LIMIT = 8;
const MY_WORK_HEAVY_GROUP_THRESHOLD = 10;

function currentRoleKey() {
  return primaryRole(state.session).toLowerCase();
}

function isBuilderMyWorkView() {
  return state.workspaceView === "my_work" && currentRoleKey().includes("builder");
}

function usesDefaultTeamPipelineView() {
  return state.workspaceView === "team_board" && (els.statusFilter?.value || "all") === "all";
}

function teamPipelineTasks(tasks = []) {
  if (!usesDefaultTeamPipelineView()) return tasks;
  return tasks.filter((task) => DEFAULT_TEAM_PAGE_STATUSES.includes(task.pageStatus));
}

function personalWorkTasks(tasks = []) {
  if (state.workspaceView !== "my_work") return tasks;
  const role = currentRoleKey();
  if (role.includes("builder")) {
    return tasks.filter((task) => ["seo_done", "needs_build", "page_built", "needs_review"].includes(task.pageStatus));
  }
  if (role.includes("seo")) {
    return tasks.filter((task) => ["needs_seo", "seo_in_progress", "needs_review"].includes(task.pageStatus));
  }
  if (role.includes("aeo")) {
    return tasks.filter((task) => !["live", "ignored", "snoozed"].includes(task.pageStatus) && !["done", "not_needed"].includes(task.aeoStatus));
  }
  return tasks.filter((task) => !["live", "ignored", "snoozed"].includes(task.pageStatus));
}

function personalStatusTags(task) {
  const tags = [statusPill(task.pageStatus), signalPill(task.inventorySignal)];
  if (!isBuilderMyWorkView()) tags.push(aeoPill(task.aeoStatus));
  return tags.join(" ");
}

function removeBuilderAeoNoise() {
  if (!isBuilderMyWorkView()) return;
  document.querySelectorAll('body[data-workspace-view="my_work"] .workbench-meta').forEach((meta) => {
    meta.textContent = meta.textContent.replace(/\s-\sAEO (complete|in progress|not needed|pending)$/i, "");
  });
  document.querySelectorAll('body[data-workspace-view="my_work"] .aeo-status').forEach((pill) => pill.remove());
  document.querySelectorAll('body[data-workspace-view="my_work"] .workbench-step').forEach((step) => {
    if (step.textContent.toLowerCase().includes("aeo review")) step.remove();
  });
}

function collapsedMyWorkGroups() {
  try {
    return JSON.parse(localStorage.getItem(MY_WORK_GROUP_COLLAPSE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCollapsedMyWorkGroups(value) {
  localStorage.setItem(MY_WORK_GROUP_COLLAPSE_KEY, JSON.stringify(value));
}

function myWorkBucketName(section) {
  return (section.querySelector(".workbench-section-head span")?.textContent || "bucket").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "bucket";
}

function myWorkGroupStorageKey(bucketName, groupName) {
  return `${bucketName}:${groupName}`;
}

function installMyWorkGroupingStyles() { /* styles moved to css/workbench.css */ }

function myWorkGroupNameForRow(row) {
  const task = state.tasks.find((candidate) => candidate.id === row.dataset.workbenchTask);
  return task?.make || task?.brand || "Other";
}

function myWorkRowTitleKey(row) {
  const task = state.tasks.find((candidate) => candidate.id === row.dataset.workbenchTask);
  if (!task) return row.textContent.trim().toLowerCase();
  return `${task.year}|${task.make}|${displayModel(task)}`.toLowerCase();
}

function cleanMyWorkRow(row, shouldShowDealer = false) {
  const task = state.tasks.find((candidate) => candidate.id === row.dataset.workbenchTask);
  if (!task) return;
  const title = row.querySelector(".workbench-title");
  const meta = row.querySelector(".workbench-meta");
  if (title) title.textContent = `${task.year || ""} ${displayModel(task)}`.trim() || taskTitle(task);
  if (!meta) return;
  const current = meta.textContent;
  const built = current.match(/Built\s+[^-]+/i)?.[0];
  const seoReady = current.match(/SEO ready\s+[^-]+/i)?.[0];
  let cleaned;
  if (task.pageStatus === "page_built" && built) cleaned = built.trim();
  else if (["seo_done", "needs_build"].includes(task.pageStatus) && seoReady) cleaned = seoReady.trim();
  else cleaned = current.replace(/^.*?\s-\s/, "").replace(/\s-\sAEO .*$/i, "");
  meta.textContent = shouldShowDealer ? `${cleaned} · ${dealerShortName(task.dealer)}` : cleaned;
}

function groupRowsByBrand(rows = []) {
  return Object.values(rows.reduce((groups, row) => {
    const groupName = myWorkGroupNameForRow(row);
    if (!groups[groupName]) groups[groupName] = { groupName, rows: [] };
    groups[groupName].rows.push(row);
    return groups;
  }, {})).sort((a, b) => a.groupName.localeCompare(b.groupName));
}

function duplicateTitleCounts(rows = []) {
  return rows.reduce((counts, row) => {
    const key = myWorkRowTitleKey(row);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function isMyWorkGroupCollapsed(groupKey, rows, selectedId) {
  const stored = collapsedMyWorkGroups();
  const containsSelected = selectedId && rows.some((row) => row.dataset.workbenchTask === selectedId);
  if (containsSelected && stored[groupKey] === undefined) return false;
  return stored[groupKey] !== false;
}

function applyMyWorkGroupVisibility(groupElement, collapsed) {
  const rows = [...groupElement.querySelectorAll(".workbench-row")];
  const selectedIndex = rows.findIndex((row) => row.classList.contains("is-selected"));
  const start = selectedIndex >= MY_WORK_GROUP_VISIBLE_LIMIT
    ? Math.max(0, selectedIndex - Math.floor(MY_WORK_GROUP_VISIBLE_LIMIT / 2))
    : 0;
  const end = start + MY_WORK_GROUP_VISIBLE_LIMIT;
  rows.forEach((row, index) => {
    row.hidden = collapsed || index < start || index >= end;
  });
  const items = groupElement.querySelector(".workbench-group-items");
  if (items) items.hidden = collapsed;
  const header = groupElement.querySelector(".workbench-group-head");
  if (header) header.setAttribute("aria-expanded", String(!collapsed));
  const chevron = groupElement.querySelector(".workbench-group-chevron");
  if (chevron) chevron.classList.toggle("collapsed", collapsed);
  const more = groupElement.querySelector(".workbench-group-more");
  if (more) more.hidden = collapsed || rows.length <= MY_WORK_GROUP_VISIBLE_LIMIT;
}

function groupMyWorkSections() {
  if (state.workspaceView !== "my_work") return;
  installMyWorkGroupingStyles();
  document.querySelectorAll(".workbench-section").forEach((section) => {
    if (section.querySelector(".workbench-group")) return;
    const directRows = [...section.children].filter((child) => child.classList?.contains("workbench-row"));
    if (!directRows.length) return;
    const bucketName = myWorkBucketName(section);
    const selectedId = section.querySelector(".workbench-row.is-selected")?.dataset.workbenchTask || document.querySelector(".workbench-row.is-selected")?.dataset.workbenchTask;
    const groups = groupRowsByBrand(directRows);
    const singleGroup = groups.length === 1;
    groups.forEach((group) => {
      const groupKey = myWorkGroupStorageKey(bucketName, group.groupName);
      const collapsed = isMyWorkGroupCollapsed(groupKey, group.rows, selectedId);
      const titleCounts = duplicateTitleCounts(group.rows);
      const wrapper = document.createElement("div");
      wrapper.className = "workbench-group";
      wrapper.dataset.workbenchGroup = group.groupName;
      wrapper.dataset.workbenchGroupKey = groupKey;
      const heavyClass = group.rows.length >= MY_WORK_HEAVY_GROUP_THRESHOLD ? " heavy" : "";
      const groupAccent = (brandAccentOverrides[group.groupName]?.accent) || "#9aa0aa";
      const countBadge = singleGroup ? "" : `<span class="workbench-group-count${heavyClass}">${group.rows.length}</span>`;
      wrapper.innerHTML = `<button class="workbench-group-head" type="button" data-workbench-group-toggle="${escapeAttr(groupKey)}" aria-expanded="${String(!collapsed)}" style="--group-accent:${groupAccent}"><span class="workbench-group-bar"></span><span class="workbench-group-chevron${collapsed ? " collapsed" : ""}"></span><span class="workbench-group-name">${escapeHtml(group.groupName)}</span>${countBadge}</button><div class="workbench-group-items"${collapsed ? " hidden" : ""}></div>`;
      const items = wrapper.querySelector(".workbench-group-items");
      group.rows.forEach((row) => {
        cleanMyWorkRow(row, titleCounts[myWorkRowTitleKey(row)] > 1);
        items.append(row);
      });
      if (group.rows.length > MY_WORK_GROUP_VISIBLE_LIMIT) {
        const more = document.createElement("div");
        more.className = "workbench-group-more";
        more.textContent = `Showing ${Math.min(MY_WORK_GROUP_VISIBLE_LIMIT, group.rows.length)} of ${group.rows.length}`;
        items.append(more);
      }
      section.append(wrapper);
      applyMyWorkGroupVisibility(wrapper, collapsed);
    });
  });
  removeBuilderAeoNoise();
}

function toggleMyWorkGroup(button) {
  const groupKey = button.dataset.workbenchGroupToggle;
  const groupElement = button.closest(".workbench-group");
  if (!groupKey || !groupElement) return;
  const expanded = button.getAttribute("aria-expanded") === "true";
  const collapsed = expanded;
  const stored = collapsedMyWorkGroups();
  stored[groupKey] = collapsed;
  saveCollapsedMyWorkGroups(stored);
  applyMyWorkGroupVisibility(groupElement, collapsed);
}

function capMyWorkSections() {
  groupMyWorkSections();
}

function render() {
  const tasks = filteredTasks();
  const personalTasks = personalWorkTasks(tasks);
  const visiblePipelineTasks = teamPipelineTasks(tasks);
  document.body.dataset.view = "focus";
  document.body.dataset.workspaceView = state.workspaceView;
  document.body.dataset.adminAccess = String(hasAdminAccess(state.session));
  renderWorkspaceView();
  renderMetrics(tasks);
  renderAchievements(tasks);
  renderFocusTask(personalTasks);
  renderMyWork(personalTasks);
  capMyWorkSections();
  if (typeof renderUpcoming === 'function') renderUpcoming();
  renderInventoryFeedStatus();
  if (typeof renderWins === "function") renderWins();
  if (isAeoTableFilter()) {
    renderQueue(els.seoQueue, [], "seo");
    renderQueue(els.aeoQueue, visiblePipelineTasks, "aeo");
    renderQueue(els.buildQueue, [], "build");
  } else {
    renderQueue(els.seoQueue, visiblePipelineTasks.filter((task) => ["needs_seo", "seo_in_progress"].includes(task.pageStatus)), "seo");
    renderQueue(els.aeoQueue, visiblePipelineTasks.filter((task) => !["done", "not_needed"].includes(task.aeoStatus)), "aeo");
    renderQueue(els.buildQueue, visiblePipelineTasks.filter((task) => ["seo_done", "needs_build"].includes(task.pageStatus)), "build");
  }
  renderTable(visiblePipelineTasks);
}

function renderAuth() {
  const signedIn = Boolean(state.session);
  document.body.dataset.auth = signedIn ? "signed_in" : "signed_out";
  els.authCards?.forEach((card) => card.classList.toggle("is-active", card.dataset.authStep === state.onboardingStep));
  els.flowDots?.forEach((dot) => dot.classList.toggle("is-active", dot.dataset.flowDot === state.onboardingStep));
  applyAdminGating();
}

function applyAdminGating() {
  const isAdmin = state.session?.isAdmin === true;
  document.querySelectorAll("[data-admin-only]").forEach((el) => {
    el.style.display = isAdmin ? "" : "none";
  });
}

function renderSettingsProfile() {
  if (!state.session) return;
  if (els.settingsAvatar) els.settingsAvatar.textContent = initials(state.session.name);
  if (els.settingsName) els.settingsName.textContent = state.session.name;
  if (els.settingsRole) els.settingsRole.textContent = rolePillLabel(state.session);
  if (els.settingsLandingSelect) els.settingsLandingSelect.value = defaultLandingLabel(state.session);
  if (els.settingsAccessBadges) {
    els.settingsAccessBadges.innerHTML = [primaryRole(state.session), hasAdminAccess(state.session) ? "Admin" : null]
      .filter(Boolean)
      .map((role) => `<span>${escapeHtml(role)}</span>`)
      .join("");
  }
}

function completeOnboarding(member) {
  // member is a TEAM_ROSTER entry (or compatible object)
  state.session = {
    email:       member.email,
    name:        member.name,
    initials:    member.initials,
    primaryRole: member.primaryRole,
    isAdmin:     member.isAdmin,
    defaultView: member.defaultView,
  };
  localStorage.setItem("fusz-demo-session", JSON.stringify(state.session));
  state.workspaceView = member.defaultView;
  localStorage.setItem("pipeline-workspace-view", member.defaultView);
  renderAuth();
  render();
  showToast(`Welcome, ${member.name.split(" ")[0]} — ${member.primaryRole} workspace open`);
}

function primaryRole(session) { return session?.primaryRole || session?.role || "Builder"; }
function hasAdminAccess(session) { return Boolean(session?.isAdmin || session?.role === "Admin"); }
function rolePillLabel(session) { return hasAdminAccess(session) ? `${primaryRole(session)} + Admin` : primaryRole(session); }
function defaultLandingLabel(session) { return workspaceLabel(session?.defaultView || state.workspaceView); }
function renderTableTitle(count = 0) { return `${workspaceLabel(state.workspaceView)} (${count})`; }

function renderWorkspaceView() {
  if (els.pageTitle) els.pageTitle.textContent = workspaceTitle(state.workspaceView);
  if (els.userContext) els.userContext.textContent = workspaceSubtitle(state.workspaceView, primaryRole(state.session));
  if (els.rolePill) els.rolePill.textContent = rolePillLabel(state.session || { role: "Builder", primaryRole: "Builder" });
  els.workspaceButtons?.forEach((button) => button.classList.toggle("is-active", button.dataset.workspaceView === state.workspaceView));
  document.querySelectorAll("[data-demo-only]").forEach((el) => { el.hidden = Boolean(state.session); });
  renderSettingsProfile();
}

function workspaceTitle(view) {
  return { admin: "Admin Command Center", my_work: "My Work", team_board: "Team Pipeline", upcoming: "Upcoming Models", wins: "Wins", docs: "Resources", settings: "Settings" }[view] || "My Work";
}

function workspaceSubtitle(view, role) {
  return { admin: "Admin controls and full visibility", my_work: `${role || "Builder"} workspace`, team_board: "All active model page work", upcoming: "Future model watchlist", wins: "Celebrating what the team shipped", docs: "Source hub and handoff rules", settings: "Workspace preferences" }[view] || "Builder workspace";
}

function renderFocusTask(tasks = state.tasks) {
  const task = nextBestTask(tasks);
  if (!task) return;
  applyAccentStyle(els.focusPanel, task.accentStyle || accentStyle(task.accent || "#2563a9"));
  els.focusTitle.textContent = taskTitle(task);
  els.focusMeta.textContent = `${task.dealer} / ${builderNextStep(task)}`;
  els.focusTags.innerHTML = personalStatusTags(task);
  els.focusActions.innerHTML = actionButtons(task);
}

function renderMyWork(tasks) {
  const role = currentRoleKey();
  let work;
  let emptyMsg;
  if (role.includes("aeo")) {
    work = tasks.filter((task) => !["done", "not_needed"].includes(task.aeoStatus) && !["live", "ignored", "snoozed"].includes(task.pageStatus));
    emptyMsg = "No AEO tasks match the current filters.";
  } else if (role.includes("seo")) {
    work = tasks.filter((task) => ["needs_seo", "seo_in_progress", "needs_review"].includes(task.pageStatus));
    emptyMsg = "No SEO tasks match the current filters.";
  } else {
    work = tasks.filter((task) => ["seo_done", "needs_build", "page_built", "needs_review"].includes(task.pageStatus));
    emptyMsg = "No builder tasks match the current filters.";
  }
  work = work.sort((a, b) => workPriority(a) - workPriority(b));
  if (els.myWorkCount) els.myWorkCount.textContent = work.length;
  if (els.myWorkList) els.myWorkList.innerHTML = work.length ? work.map(renderMyWorkCard).join("") : `<div class="empty">${emptyMsg}</div>`;
  renderBuilderDetail(work[0]);
}

function renderMyWorkCard(task, index = 0) {
  return `<article class="work-card${index === 0 ? " is-selected" : ""}" style="${escapeAttr(task.accentStyle || "")}" data-details="${escapeAttr(task.id)}"><div class="work-card-main"><div class="work-card-topline"><span class="brand-badge">${escapeHtml(task.make || "Brand")}</span><span class="work-owner">${escapeHtml(ownerBucket(task))}</span></div><h3>${escapeHtml(taskTitle(task))}</h3><p class="work-card-dealer">${escapeHtml(task.dealer)}</p><div class="work-card-meta">${summaryStatusLine(task)}</div></div><div class="work-card-side"><span class="owner-avatar">${escapeHtml(initials(ownerBucket(task)))}</span>${builderActionButton(task)}</div></article>`;
}

function renderBuilderDetail(task) {
  if (!els.builderDetailPanel || !els.builderDetailContent) return;
  els.builderDetailPanel.classList.toggle("is-empty", !task);
  els.builderDetailContent.innerHTML = task ? `<p class="eyebrow">Selected task</p><h2>${escapeHtml(taskTitle(task))}</h2><p class="panel-subtitle">${escapeHtml(task.dealer)}</p><div class="selected-task-status">${personalStatusTags(task)}</div><h3 class="detail-section-title">Next step</h3><div class="next-step-card"><span>Recommended action</span><strong>${escapeHtml(builderNextStep(task))}</strong></div><div class="detail-actions">${actionButtons(task)}<button class="button button-secondary-action" type="button" data-details="${escapeAttr(task.id)}">Details</button></div>` : "";
}



function renderInventoryFeedStatus() {
  if (els.feedVehicleCount) els.feedVehicleCount.textContent = state.inventoryFeed.connected ? `${state.inventoryFeed.rows.length} feed rows` : "Feed waiting";
  if (els.feedSampleVehicle) els.feedSampleVehicle.textContent = state.inventoryFeed.rows[0]?.model || "No sample yet";
  if (els.feedConnectionStatus) {
    els.feedConnectionStatus.textContent = state.inventoryFeed.message;
    els.feedConnectionStatus.className = `resource-status ${state.inventoryFeed.connected ? "status-green" : "status-gray"}`;
  }
}

function renderMetrics(tasks) {
  const ready = tasks.filter((task) => ["seo_done", "needs_build"].includes(task.pageStatus)).length;
  const checks = tasks.filter((task) => task.pageStatus === "page_built").length;
  const blocked = tasks.filter((task) => task.pageStatus === "needs_review").length;
  const live = tasks.filter((task) => task.pageStatus === "live").length;
  const setMetric = (el, value) => { if (!el) return; el.textContent = value; el.closest(".metric")?.classList.toggle("is-zero", value === 0); };
  setMetric(els.metricDetected, ready);
  setMetric(els.metricSeo, checks);
  setMetric(els.metricAeo, blocked);
  setMetric(els.metricLive, live);
}

function renderAchievements(tasks) {
  const written = tasks.filter((task) => ["seo_done", "needs_build", "page_built", "live"].includes(task.pageStatus)).length;
  const live = tasks.filter((task) => task.pageStatus === "live").length;
  const remaining = tasks.filter((task) => !["live", "ignored"].includes(task.pageStatus)).length;
  if (els.achievementWritten) els.achievementWritten.textContent = written;
  if (els.achievementLive) els.achievementLive.textContent = live;
  if (els.achievementRemaining) els.achievementRemaining.textContent = remaining;
}

function renderQueue(container, tasks, type) {
  if (!container) return;
  container.innerHTML = tasks.length ? tasks.map((task) => renderTask(task, type)).join("") : `<div class="empty">No tasks in this queue.</div>`;
  const count = { seo: els.seoCount, aeo: els.aeoCount, build: els.buildCount }[type];
  if (count) count.textContent = tasks.length;
}

function renderTask(task, type) {
  return `<article class="task" style="${escapeAttr(task.accentStyle || "")}" data-details="${escapeAttr(task.id)}"><div class="task-state">${queuePill(task, type)}</div><h3 class="task-card-title">${escapeHtml(taskTitle(task))}</h3><p class="queue-reason">${escapeHtml(queueReason(task, type))}</p><div class="task-meta"><span class="table-dealer"><span class="dealer-dot"></span>${escapeHtml(task.dealer)}</span>${signalPill(task.inventorySignal)}${aeoPill(task.aeoStatus)}</div><div class="task-actions">${queuePrimaryActionButton(task, type)}<button class="button button-quiet" type="button" data-details="${escapeAttr(task.id)}">Details</button></div></article>`;
}

function renderTable(tasks) {
  if (els.tableTitle) els.tableTitle.textContent = renderTableTitle(tasks.length);
  if (els.visibleCount) els.visibleCount.textContent = tasks.length;
  if (!els.taskTable) return;
  const useAeoContext = isAeoTableFilter();
  els.taskTable.innerHTML = tasks.map((task) => {
    const stage = useAeoContext ? aeoWorkflowStage(task) : workflowStage(task);
    const action = useAeoContext ? aeoTableActionButton(task) : tablePrimaryActionButton(task);
    const brandOverride = brandAccentOverrides[task.make];
    const badgeStyle = brandOverride ? ` style="background:${brandOverride.ink};color:${brandOverride.visible}"` : "";
    return `<tr><td data-label="Model"><strong>${escapeHtml(taskTitle(task))}</strong></td><td data-label="Dealer"><span class="table-dealer"><span class="brand-badge"${badgeStyle}>${escapeHtml(task.make || "Brand")}</span>${escapeHtml(task.dealer)}</span></td><td data-label="Stage">${stage}</td><td data-label="Inventory"><span class="inventory-cell">${escapeHtml(signalLabels[task.inventorySignal] || task.inventorySignal)}</span></td><td data-label="Action"><div class="row-actions">${action}</div></td></tr>`;
  }).join("");
}

function isAeoTableFilter(status = els.statusFilter?.value || "all") {
  return ["not_started", "in_progress", "done", "not_needed"].includes(status);
}

function workflowStage(task) {
  const map = { needs_seo: ["Needs SEO", "amber"], seo_in_progress: ["SEO in progress", "blue"], seo_done: ["Ready to build", "blue"], needs_build: ["Ready to build", "blue"], page_built: ["Needs live check", "amber"], live: ["Complete", "green"], needs_review: ["Needs review", "red"], ignored: ["Skipped", "gray"], snoozed: ["Paused", "gray"] };
  const [label, tone] = map[task.pageStatus] || ["Queued", "gray"];
  return `<span class="stage stage-${tone}"><span></span>${escapeHtml(label)}</span>`;
}

function aeoWorkflowStage(task) {
  const map = { not_started: ["AEO not started", "gray"], in_progress: ["AEO in progress", "blue"], done: ["AEO done", "green"], not_needed: ["AEO not needed", "gray"] };
  const [label, tone] = map[task.aeoStatus] || ["AEO pending", "gray"];
  return `<span class="stage stage-${tone}"><span></span>${escapeHtml(label)}</span>`;
}

function aeoTableActionButton(task) {
  if (["done", "not_needed"].includes(task.aeoStatus)) {
    return `<button class="button button-secondary-action" type="button" data-details="${escapeAttr(task.id)}">Review Page</button>`;
  }
  return `<button class="button button-primary-action" type="button" data-task-id="${escapeAttr(task.id)}" data-aeo-status="done">Mark AEO Complete</button>`;
}

function statusPill(status) { return `<span class="status status-${escapeAttr(status)}">${escapeHtml(statusLabels[status] || status)}</span>`; }
function signalPill(signal) { return `<span class="signal signal-${escapeAttr(signal)}">${escapeHtml(signalLabels[signal] || signal)}</span>`; }
function aeoPill(status) { return `<span class="status aeo-status aeo-${escapeAttr(status)}">${escapeHtml(aeoLabels[status] || status)}</span>`; }
function summaryStatusLine(task) { return `<span>${escapeHtml(signalLabels[task.inventorySignal] || task.inventorySignal)}</span><span>/</span><span>${escapeHtml(statusLabels[task.pageStatus] || task.pageStatus)}</span><span>/</span><span>${escapeHtml(aeoLabels[task.aeoStatus] || task.aeoStatus)}</span>`; }
function queuePill(task, type) { return type === "aeo" ? aeoPill(task.aeoStatus) : statusPill(task.pageStatus); }
function queueReason(task, type) { return type === "aeo" ? `AEO layer status: ${aeoLabels[task.aeoStatus] || task.aeoStatus}.` : builderNextStep(task); }
function queuePrimaryActionButton(task, type) { return type === "aeo" ? aeoTableActionButton(task) : primaryActionButton(task); }
function actionButtons(task) { return (transitions[task.pageStatus] || []).map(([nextStatus, label]) => `<button class="button ${actionButtonClass(nextStatus, label)}" type="button" data-task-id="${escapeAttr(task.id)}" data-status="${escapeAttr(nextStatus)}">${escapeHtml(label)}</button>`).join(""); }
function primaryActionButton(task) { const primary = (transitions[task.pageStatus] || [])[0]; return primary ? `<button class="button ${actionButtonClass(primary[0], primary[1])}" type="button" data-task-id="${escapeAttr(task.id)}" data-status="${escapeAttr(primary[0])}">${escapeHtml(primary[1])}</button>` : ""; }
const tableActionLabels = { needs_seo: "Start SEO", seo_in_progress: "SEO done", seo_done: "To build", needs_build: "Build", page_built: "Check", live: "Review", needs_review: "Resolve", ignored: "Restore", snoozed: "Unsnooze" };
function tablePrimaryActionButton(task) { const primary = (transitions[task.pageStatus] || [])[0]; if (!primary) return ""; const label = tableActionLabels[task.pageStatus] || primary[1]; return `<button class="button ${actionButtonClass(primary[0], label)}" type="button" data-task-id="${escapeAttr(task.id)}" data-status="${escapeAttr(primary[0])}">${escapeHtml(label)}</button>`; }
function builderCardMeta(task) { return task.pageStatus === "page_built" ? "Needs live check" : task.pageStatus === "needs_build" ? "Page build ready" : "SEO done"; }
function builderActionButton(task) { return primaryActionButton(task); }
function actionButtonClass(nextStatus, label = "") { const lower = label.toLowerCase(); if (["send back", "return", "reopen", "unclaim", "restore", "unsnooze", "ignore", "snooze"].some((term) => lower.includes(term))) return "button-corrective-action"; if (["live", "needs_review"].includes(nextStatus) || ["review", "mark live", "already live", "keep live"].some((term) => lower.includes(term))) return "button-secondary-action"; return "button-primary-action"; }
function builderNextStep(task) { if (task.pageStatus === "page_built") return "Check the live page, then mark it live."; if (task.pageStatus === "needs_build") return "Build the model page from the SEO doc."; if (task.pageStatus === "seo_done") return "SEO is ready. Start the page build."; if (task.pageStatus === "needs_seo") return "SEO copy is the next step."; return statusLabels[task.pageStatus] || "Review task"; }
function signalButtons(task) { return Object.entries(signalLabels).map(([signal, label]) => `<button class="mini-button${task.inventorySignal === signal ? " is-active" : ""}" type="button" data-task-id="${escapeAttr(task.id)}" data-signal="${escapeAttr(signal)}">${escapeHtml(label)}</button>`).join(""); }
function aeoButtons(task) { return Object.entries(aeoLabels).map(([status, label]) => `<button class="mini-button${task.aeoStatus === status ? " is-active" : ""}" type="button" data-task-id="${escapeAttr(task.id)}" data-aeo-status="${escapeAttr(status)}">${escapeHtml(label)}</button>`).join(""); }
function nextBestTask(tasks = state.tasks) { return [...tasks].filter((task) => !["live", "ignored", "snoozed"].includes(task.pageStatus)).sort((a, b) => workPriority(a) - workPriority(b))[0]; }
function dealerShortName(dealer) { const source = state.sources?.find((item) => item.dealer === dealer); return source?.shortName || String(dealer || "Dealer").replace("Lou Fusz ", ""); }
function ownerBucket(task) { if (task.details?.buildOwner) return task.details.buildOwner; if (task.details?.seoOwner) return task.details.seoOwner; if (["seo_done", "needs_build", "page_built"].includes(task.pageStatus)) return state.session?.name || "Builder"; if (["needs_seo", "seo_in_progress"].includes(task.pageStatus)) return "SEO Writer"; return "Team"; }
function initials(name) { const words = String(name || "Team").trim().split(/\s+/).filter(Boolean); return words.length > 1 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : (words[0] || "T").slice(0, 2).toUpperCase(); }
function workPriority(task) { return ({ needs_build: 0, seo_done: 1, page_built: 2, needs_review: 3, needs_seo: 4, seo_in_progress: 5, live: 9 }[task.pageStatus] ?? 6); }
function actionLabel(task) { return builderNextStep(task); }

function modelInfoUrl(task) { return `https://www.google.com/search?q=${encodeURIComponent(`${task.year || ""} ${task.make || ""} ${displayModel(task)} official model`.trim())}`; }
function showToast(message) { els.toast.textContent = message; els.toast.classList.add("is-visible"); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2200); }
function buildDigest() { const tasks = state.tasks.filter((task) => task.year === 2027); return ["Fusz+ Daily Digest", `For: ${state.session?.name || "Team"} / ${primaryRole(state.session)}`, "", `Needs SEO: ${tasks.filter((task) => task.pageStatus === "needs_seo").length}`, ...tasks.filter((task) => task.pageStatus === "needs_seo").slice(0, 12).map((task) => `- ${task.dealer}: ${taskTitle(task)}`), "", `Ready / In Build: ${tasks.filter((task) => ["seo_done", "needs_build", "page_built"].includes(task.pageStatus)).length}`, "", `Live / Checked: ${tasks.filter((task) => task.pageStatus === "live").length}`].join("\n"); }
function showDigest(text) { els.digestText.textContent = text; els.digestDialog.showModal(); }
function formatScanErrors(errors) { return errors.slice(0, 12).map((error) => `- ${error.dealer}: ${error.message}`).join("\n"); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function displayModel(task) { const model = String(task.model || "").trim(); const make = String(task.make || "").trim(); return make && model.toLowerCase().startsWith(`${make.toLowerCase()} `) ? model.slice(make.length).trim() : model; }
function taskTitle(task) { return `${task.year} ${task.make} ${displayModel(task)}`.trim(); }
function escapeAttr(value) { return escapeHtml(value); }
function accentStyle(hex) { const rgb = hexToRgb(hex); if (!rgb) return "--accent:#2563a9;--accent-visible:#2563a9;--accent-soft:rgba(37,99,169,.18);--accent-border:rgba(37,99,169,.55);--accent-ink:#78b7ff;"; const { r, g, b } = rgb; return [`--accent:${hex}`, `--accent-visible:${hex}`, `--accent-soft:rgba(${r},${g},${b},.18)`, `--accent-card:rgba(${r},${g},${b},.13)`, `--accent-border:rgba(${r},${g},${b},.58)`, `--accent-glow:rgba(${r},${g},${b},.42)`, `--accent-ink:${brighten(hex, 42)}`].join(";"); }
function accentStyleForTask(task) { const override = brandAccentOverrides[task.make]; if (!override) return accentStyle(dealerAccents[task.dealer] || "#2563a9"); const rgb = hexToRgb(override.visible); if (!rgb) return accentStyle(override.accent); const { r, g, b } = rgb; return [`--accent:${override.accent}`, `--accent-visible:${override.visible}`, `--accent-soft:rgba(${r},${g},${b},.22)`, `--accent-card:rgba(${r},${g},${b},.16)`, `--accent-border:rgba(${r},${g},${b},.68)`, `--accent-glow:rgba(${r},${g},${b},.54)`, `--accent-ink:${override.ink}`].join(";"); }
function applyAccentStyle(element, styleText) { if (!element) return; styleText.split(";").forEach((declaration) => { const [property, value] = declaration.split(":"); if (property && value) element.style.setProperty(property.trim(), value.trim()); }); }
function hexToRgb(hex) { const clean = String(hex).replace("#", "").trim(); if (!/^[0-9a-f]{6}$/i.test(clean)) return null; return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) }; }
function brighten(hex, amount) { const rgb = hexToRgb(hex); if (!rgb) return "#78b7ff"; const toHex = (value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0"); return `#${toHex(rgb.r + amount)}${toHex(rgb.g + amount)}${toHex(rgb.b + amount)}`; }

document.addEventListener("click", (event) => {
  const groupToggle = event.target.closest("[data-workbench-group-toggle]");
  if (groupToggle) {
    event.preventDefault();
    toggleMyWorkGroup(groupToggle);
    return;
  }

  if (isBuilderMyWorkView()) {
    window.setTimeout(() => {
      groupMyWorkSections();
      removeBuilderAeoNoise();
    }, 0);
  }
});

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

function render() {
  const tasks = filteredTasks();
  document.body.dataset.view = "focus";
  document.body.dataset.workspaceView = state.workspaceView;
  document.body.dataset.adminAccess = String(hasAdminAccess(state.session));
  renderWorkspaceView();
  renderMetrics(tasks);
  renderAchievements(tasks);
  renderFocusTask();
  renderMyWork(tasks);
  renderUpcomingModels(syntheticUpcomingModels());
  renderInventoryFeedStatus();
  renderQueue(els.seoQueue, tasks.filter((task) => ["needs_seo", "seo_in_progress"].includes(task.pageStatus)), "seo");
  renderQueue(els.aeoQueue, tasks.filter((task) => !["done", "not_needed"].includes(task.aeoStatus)), "aeo");
  renderQueue(els.buildQueue, tasks.filter((task) => ["seo_done", "needs_build", "page_built"].includes(task.pageStatus)), "build");
  renderTable(tasks);
}

function renderAuth() {
  const signedIn = Boolean(state.session);
  document.body.dataset.auth = signedIn ? "signed_in" : "signed_out";
  els.authCards?.forEach((card) => card.classList.toggle("is-active", card.dataset.authStep === state.onboardingStep));
  els.flowDots?.forEach((dot) => dot.classList.toggle("is-active", dot.dataset.flowDot === state.onboardingStep));
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

function completeOnboarding(workspaceView, role = "Builder") {
  state.session = {
    name: role === "Admin" ? "Scott Toulou" : "Jnuru Goodwin",
    role,
    primaryRole: role === "Admin" ? "AEO Writer" : "Builder",
    isAdmin: true,
    defaultView: workspaceView,
  };
  localStorage.setItem("fusz-demo-session", JSON.stringify(state.session));
  state.workspaceView = workspaceView;
  localStorage.setItem("pipeline-workspace-view", workspaceView);
  renderAuth();
  showToast(`${workspaceLabel(workspaceView)} opened`);
  render();
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
  renderSettingsProfile();
}

function workspaceTitle(view) {
  return { admin: "Admin Command Center", my_work: "Builder Workspace", team_board: "Team Pipeline", upcoming: "Upcoming Models", docs: "Resources", settings: "Settings" }[view] || "Builder Workspace";
}

function workspaceSubtitle(view, role) {
  return { admin: "Admin controls and full visibility", my_work: `${role || "Builder"} workspace`, team_board: "All active model page work", upcoming: "Future model watchlist", docs: "Source hub and handoff rules", settings: "Workspace preferences" }[view] || "Builder workspace";
}

function renderFocusTask() {
  const task = nextBestTask();
  if (!task) return;
  applyAccentStyle(els.focusPanel, task.accentStyle || accentStyle(task.accent || "#2563a9"));
  els.focusTitle.textContent = taskTitle(task);
  els.focusMeta.textContent = `${task.dealer} / ${builderNextStep(task)}`;
  els.focusTags.innerHTML = `${statusPill(task.pageStatus)}${signalPill(task.inventorySignal)}${aeoPill(task.aeoStatus)}`;
  els.focusActions.innerHTML = actionButtons(task);
}

function renderMyWork(tasks) {
  const work = tasks.filter((task) => ["seo_done", "needs_build", "page_built", "needs_review"].includes(task.pageStatus)).sort((a, b) => workPriority(a) - workPriority(b));
  if (els.myWorkCount) els.myWorkCount.textContent = work.length;
  if (els.myWorkList) els.myWorkList.innerHTML = work.length ? work.map(renderMyWorkCard).join("") : `<div class="empty">No builder tasks match the current filters.</div>`;
  renderBuilderDetail(work[0]);
}

function renderMyWorkCard(task, index = 0) {
  return `<article class="work-card${index === 0 ? " is-selected" : ""}" style="${escapeAttr(task.accentStyle || "")}" data-details="${escapeAttr(task.id)}"><div class="work-card-main"><div class="work-card-topline"><span class="brand-badge">${escapeHtml(task.make || "Brand")}</span><span class="work-owner">${escapeHtml(ownerBucket(task))}</span></div><h3>${escapeHtml(taskTitle(task))}</h3><p class="work-card-dealer">${escapeHtml(task.dealer)}</p><div class="work-card-meta">${summaryStatusLine(task)}</div></div><div class="work-card-side"><span class="owner-avatar">${escapeHtml(initials(ownerBucket(task)))}</span>${builderActionButton(task)}</div></article>`;
}

function renderBuilderDetail(task) {
  if (!els.builderDetailPanel || !els.builderDetailContent) return;
  els.builderDetailPanel.classList.toggle("is-empty", !task);
  els.builderDetailContent.innerHTML = task ? `<p class="eyebrow">Selected task</p><h2>${escapeHtml(taskTitle(task))}</h2><p class="panel-subtitle">${escapeHtml(task.dealer)}</p><div class="selected-task-status">${statusPill(task.pageStatus)} ${signalPill(task.inventorySignal)} ${aeoPill(task.aeoStatus)}</div><h3 class="detail-section-title">Next step</h3><div class="next-step-card"><span>Recommended action</span><strong>${escapeHtml(builderNextStep(task))}</strong></div><div class="detail-actions">${actionButtons(task)}<button class="button button-secondary-action" type="button" data-details="${escapeAttr(task.id)}">Details</button></div>` : "";
}

function renderUpcomingModels(tasks) {
  if (els.upcomingCount) els.upcomingCount.textContent = tasks.length;
  if (els.upcomingList) els.upcomingList.innerHTML = tasks.map(renderUpcomingCard).join("");
}

function renderUpcomingCard(task) {
  return `<article class="watch-card" style="${escapeAttr(task.accentStyle || "")}"><div class="watch-card-main"><div class="watch-top">${signalPill(task.inventorySignal)}</div><h3>${escapeHtml(taskTitle(task))}</h3><p class="watch-card-summary">${escapeHtml(upcomingSummary(task))}</p><div class="watch-card-meta"><span>${escapeHtml(task.dealer)}</span></div></div><div class="watch-card-actions"><a class="button button-secondary-action" href="${escapeAttr(modelInfoUrl(task))}" target="_blank" rel="noreferrer">Open source</a></div></article>`;
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
  if (els.metricDetected) els.metricDetected.textContent = ready;
  if (els.metricSeo) els.metricSeo.textContent = checks;
  if (els.metricAeo) els.metricAeo.textContent = blocked;
  if (els.metricLive) els.metricLive.textContent = live;
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
  els.taskTable.innerHTML = tasks.map((task) => `<tr><td data-label="Model"><strong>${escapeHtml(taskTitle(task))}</strong></td><td data-label="Dealer"><span class="table-dealer"><span class="brand-badge">${escapeHtml(task.make || "Brand")}</span>${escapeHtml(task.dealer)}</span></td><td data-label="Stage">${workflowStage(task)}</td><td data-label="Inventory"><span class="inventory-cell">${escapeHtml(signalLabels[task.inventorySignal] || task.inventorySignal)}</span></td><td data-label="Action"><div class="row-actions">${primaryActionButton(task)}</div></td></tr>`).join("");
}

function workflowStage(task) {
  const map = { needs_seo: ["Needs SEO", "amber"], seo_in_progress: ["SEO in progress", "blue"], seo_done: ["Ready to build", "blue"], needs_build: ["Ready to build", "blue"], page_built: ["Needs live check", "amber"], live: ["Complete", "green"], needs_review: ["Needs review", "red"], ignored: ["Skipped", "gray"], snoozed: ["Paused", "gray"] };
  const [label, tone] = map[task.pageStatus] || ["Queued", "gray"];
  return `<span class="stage stage-${tone}"><span></span>${escapeHtml(label)}</span>`;
}

function statusPill(status) { return `<span class="status status-${escapeAttr(status)}">${escapeHtml(statusLabels[status] || status)}</span>`; }
function signalPill(signal) { return `<span class="signal signal-${escapeAttr(signal)}">${escapeHtml(signalLabels[signal] || signal)}</span>`; }
function aeoPill(status) { return `<span class="status aeo-status aeo-${escapeAttr(status)}">${escapeHtml(aeoLabels[status] || status)}</span>`; }
function summaryStatusLine(task) { return `<span>${escapeHtml(signalLabels[task.inventorySignal] || task.inventorySignal)}</span><span>/</span><span>${escapeHtml(statusLabels[task.pageStatus] || task.pageStatus)}</span><span>/</span><span>${escapeHtml(aeoLabels[task.aeoStatus] || task.aeoStatus)}</span>`; }
function queuePill(task, type) { return type === "aeo" ? aeoPill(task.aeoStatus) : statusPill(task.pageStatus); }
function queueReason(task, type) { return type === "aeo" ? `AEO layer status: ${aeoLabels[task.aeoStatus] || task.aeoStatus}.` : builderNextStep(task); }
function queuePrimaryActionButton(task, type) { return type === "aeo" ? `<button class="button button-secondary-action" type="button" data-task-id="${escapeAttr(task.id)}" data-aeo-status="${task.aeoStatus === "done" ? "not_needed" : "done"}">Mark AEO Complete</button>` : primaryActionButton(task); }
function actionButtons(task) { return (transitions[task.pageStatus] || []).map(([nextStatus, label]) => `<button class="button ${actionButtonClass(nextStatus, label)}" type="button" data-task-id="${escapeAttr(task.id)}" data-status="${escapeAttr(nextStatus)}">${escapeHtml(label)}</button>`).join(""); }
function primaryActionButton(task) { const primary = (transitions[task.pageStatus] || [])[0]; return primary ? `<button class="button ${actionButtonClass(primary[0], primary[1])}" type="button" data-task-id="${escapeAttr(task.id)}" data-status="${escapeAttr(primary[0])}">${escapeHtml(primary[1])}</button>` : ""; }
function builderCardMeta(task) { return task.pageStatus === "page_built" ? "Needs live check" : task.pageStatus === "needs_build" ? "Page build ready" : "SEO done"; }
function builderActionButton(task) { return primaryActionButton(task); }
function actionButtonClass(nextStatus, label = "") { const lower = label.toLowerCase(); if (["send back", "return", "reopen", "unclaim", "restore", "unsnooze", "ignore", "snooze"].some((term) => lower.includes(term))) return "button-corrective-action"; if (["live", "needs_review"].includes(nextStatus) || ["review", "mark live", "already live", "keep live"].some((term) => lower.includes(term))) return "button-secondary-action"; return "button-primary-action"; }
function builderNextStep(task) { if (task.pageStatus === "page_built") return "Check the live page, then mark it live."; if (task.pageStatus === "needs_build") return "Build the model page from the SEO doc."; if (task.pageStatus === "seo_done") return "SEO is ready. Start the page build."; if (task.pageStatus === "needs_seo") return "SEO copy is the next step."; return statusLabels[task.pageStatus] || "Review task"; }
function signalButtons(task) { return Object.entries(signalLabels).map(([signal, label]) => `<button class="mini-button${task.inventorySignal === signal ? " is-active" : ""}" type="button" data-task-id="${escapeAttr(task.id)}" data-signal="${escapeAttr(signal)}">${escapeHtml(label)}</button>`).join(""); }
function aeoButtons(task) { return Object.entries(aeoLabels).map(([status, label]) => `<button class="mini-button${task.aeoStatus === status ? " is-active" : ""}" type="button" data-task-id="${escapeAttr(task.id)}" data-aeo-status="${escapeAttr(status)}">${escapeHtml(label)}</button>`).join(""); }
function nextBestTask(tasks = state.tasks) { return [...tasks].filter((task) => !["live", "ignored", "snoozed"].includes(task.pageStatus)).sort((a, b) => workPriority(a) - workPriority(b))[0]; }
function ownerBucket(task) { if (task.details?.buildOwner) return task.details.buildOwner; if (task.details?.seoOwner) return task.details.seoOwner; if (["seo_done", "needs_build", "page_built"].includes(task.pageStatus)) return "Jnuru Goodwin"; if (["needs_seo", "seo_in_progress"].includes(task.pageStatus)) return "SEO Writer"; return "Team"; }
function initials(name) { const words = String(name || "Team").trim().split(/\s+/).filter(Boolean); return words.length > 1 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : (words[0] || "T").slice(0, 2).toUpperCase(); }
function workPriority(task) { return ({ needs_build: 0, seo_done: 1, page_built: 2, needs_review: 3, needs_seo: 4, seo_in_progress: 5, live: 9 }[task.pageStatus] ?? 6); }
function actionLabel(task) { return builderNextStep(task); }
function syntheticUpcomingModels() { return [{ year: 2028, make: "Toyota", model: "RAV4", dealer: "Lou Fusz Toyota", inventorySignal: "upcoming", pageStatus: "watchlist", aeoStatus: "not_started", summary: "Watchlist example for OEM-confirmed or rumored future models before inventory appears." }, { year: 2028, make: "Subaru", model: "Outback", dealer: "Lou Fusz Subaru St. Louis", inventorySignal: "upcoming", pageStatus: "watchlist", aeoStatus: "not_started", summary: "Future model placeholder. This would come from an OEM source once feeds are connected." }].map((task) => ({ ...task, accentStyle: accentStyleForTask(task) })); }
function upcomingSummary(task) { return task.summary || "Watched before it becomes active page work."; }
function modelInfoUrl(task) { return `https://www.google.com/search?q=${encodeURIComponent(`${task.year || ""} ${task.make || ""} ${displayModel(task)} official model`.trim())}`; }
function showToast(message) { els.toast.textContent = message; els.toast.classList.add("is-visible"); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2200); }
function buildDigest() { const tasks = state.tasks.filter((task) => task.year === 2027); return ["Fusz+ Daily Digest", "For: Jnuru Goodwin / Builder", "", `Needs SEO: ${tasks.filter((task) => task.pageStatus === "needs_seo").length}`, ...tasks.filter((task) => task.pageStatus === "needs_seo").slice(0, 12).map((task) => `- ${task.dealer}: ${taskTitle(task)}`), "", `Ready / In Build: ${tasks.filter((task) => ["seo_done", "needs_build", "page_built"].includes(task.pageStatus)).length}`, "", `Live / Checked: ${tasks.filter((task) => task.pageStatus === "live").length}`].join("\n"); }
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

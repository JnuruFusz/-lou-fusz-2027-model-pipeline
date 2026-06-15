function on(element, eventName, handler) {
  if (!element) return;
  element.addEventListener(eventName, handler);
}

function bindEvents() {
  on(els.continueLoginButton, "click", () => {
    state.onboardingStep = "theme";
    renderAuth();
  });

  on(els.previewAdminButton, "click", () => completeOnboarding("admin", "Admin"));

  els.themeOptions.forEach((button) => {
    on(button, "click", () => {
      state.selectedTheme = button.dataset.themeChoice;
      localStorage.setItem("fusz-theme", state.selectedTheme);
      applyTheme(state.selectedTheme);
      renderAuth();
    });
  });

  on(els.continueThemeButton, "click", () => {
    state.onboardingStep = "doorway";
    renderAuth();
  });

  on(els.enterWorkspaceButton, "click", () => completeOnboarding("my_work", "Builder"));
  on(els.skipToBoardButton, "click", () => completeOnboarding("team_board", "Builder"));

  on(els.restartDemoButton, "click", () => {
    localStorage.removeItem("fusz-demo-session");
    state.session = null;
    state.onboardingStep = "login";
    setWorkspaceView("my_work", { silent: true });
    renderAuth();
    applyTheme("gray");
    showToast("Demo restarted");
  });

  [els.yearFilter, els.dealerFilter, els.statusFilter, els.searchInput].forEach((el) => {
    on(el, "input", render);
  });

  on(els.clearFiltersButton, "click", () => {
    els.yearFilter.value = "all";
    els.dealerFilter.value = "all";
    els.statusFilter.value = "all";
    els.searchInput.value = "";
    showToast("Filters cleared");
    render();
  });

  on(els.mobileMenuButton, "click", openNavigation);
  on(els.navCloseButton, "click", closeNavigation);
  on(els.navBackdrop, "click", closeNavigation);

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (button) {
      updateStatus(button.dataset.taskId, button.dataset.status);
      return;
    }

    const aeoButton = event.target.closest("[data-aeo-status]");
    if (aeoButton) {
      updateAeoStatus(aeoButton.dataset.taskId, aeoButton.dataset.aeoStatus);
      return;
    }

    const detailsButton = event.target.closest("[data-details]");
    if (detailsButton) {
      openTaskDetails(detailsButton.dataset.taskId || detailsButton.dataset.details);
      return;
    }

    const settingsAction = event.target.closest("[data-settings-action]");
    if (settingsAction) {
      handleSettingsAction(settingsAction);
      return;
    }

    const signalButton = event.target.closest("[data-signal]");
    if (!signalButton) return;
    updateSignal(signalButton.dataset.taskId, signalButton.dataset.signal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.dataset.navOpen === "true") {
      closeNavigation();
    }
  });

  on(els.digestButton, "click", () => {
    els.digestText.textContent = buildDigest();
    els.digestDialog.showModal();
  });

  on(els.scanButton, "click", runScan);

  els.workspaceButtons.forEach((button) => {
    on(button, "click", () => setWorkspaceView(button.dataset.workspaceView));
  });

  on(els.docsDigestButton, "click", () => {
    els.digestText.textContent = buildDigest();
    els.digestDialog.showModal();
  });

  on(els.saveTaskDetailsButton, "click", saveTaskDetails);
}

function updateStatus(taskId, status) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return;

  task.pageStatus = status;
  state.overrides[taskId] = status;
  localStorage.setItem("pipeline-status-overrides", JSON.stringify(state.overrides));
  showToast(`${displayModel(task)} moved to ${statusLabels[status] || status}`);
  render();
}

function updateAeoStatus(taskId, status) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return;

  task.aeoStatus = status;
  state.aeoOverrides[taskId] = status;
  localStorage.setItem("pipeline-aeo-overrides", JSON.stringify(state.aeoOverrides));
  showToast(`${displayModel(task)} ${aeoLabels[status] || status}`);
  render();
}

function updateSignal(taskId, signal) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return;

  task.inventorySignal = signal;
  state.signalOverrides[taskId] = signal;
  localStorage.setItem("pipeline-signal-overrides", JSON.stringify(state.signalOverrides));
  showToast(`${displayModel(task)} tagged ${signalLabels[signal] || signal}`);
  render();
}

function handleSettingsAction(button) {
  if (button.disabled) return;
  const label = button.dataset.settingsAction || "Action";
  const originalText = button.textContent;
  button.disabled = true;
  button.classList.add("is-loading");
  button.textContent = "Working";
  window.setTimeout(() => {
    button.disabled = false;
    button.classList.remove("is-loading");
    button.textContent = originalText;
    showToast(`${label} queued for setup`);
  }, 650);
}

function openTaskDetails(taskId) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return;

  state.activeTaskId = taskId;
  const details = task.details || {};
  els.taskDialogTitle.textContent = taskTitle(task);
  els.detailSignalSelect.value = task.inventorySignal;
  els.detailAeoSelect.value = task.aeoStatus;
  els.seoOwnerInput.value = details.seoOwner || "";
  els.aeoOwnerInput.value = details.aeoOwner || "";
  els.buildOwnerInput.value = details.buildOwner || "";
  els.taskNotesInput.value = details.notes || "";
  els.taskDialog.showModal();
}

function saveTaskDetails() {
  const task = state.tasks.find((candidate) => candidate.id === state.activeTaskId);
  if (!task) return;

  task.inventorySignal = els.detailSignalSelect.value;
  task.aeoStatus = els.detailAeoSelect.value;
  state.signalOverrides[task.id] = task.inventorySignal;
  state.aeoOverrides[task.id] = task.aeoStatus;
  localStorage.setItem("pipeline-signal-overrides", JSON.stringify(state.signalOverrides));
  localStorage.setItem("pipeline-aeo-overrides", JSON.stringify(state.aeoOverrides));

  task.details = {
    seoOwner: els.seoOwnerInput.value.trim(),
    aeoOwner: els.aeoOwnerInput.value.trim(),
    buildOwner: els.buildOwnerInput.value.trim(),
    notes: els.taskNotesInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };
  state.details[task.id] = task.details;
  localStorage.setItem("pipeline-task-details", JSON.stringify(state.details));
  els.taskDialog.close();
  showToast(`${displayModel(task)} details saved`);
  render();
}

async function runScan() {
  els.scanButton.disabled = true;
  els.scanButton.textContent = "Scanning";
  try {
    const response = await fetch("/.netlify/functions/scan-inventory");
    if (!response.ok) throw new Error("scan unavailable");
    const result = await response.json();
    mergeScanResults(result.detected || []);
    if (result.errors?.length) {
      showDigest(`Scan completed with ${result.errors.length} blocked source(s).\n\n${formatScanErrors(result.errors)}`);
    }
  } catch {
    mergeScanResults(seedDetectedFromTracker());
    showDigest(
      "Live scan is not available in the static preview, so the dashboard is using the current 2027 tracker as its source.\n\nWhen deployed, the scanner will check the /llm/inventory/ endpoints and create one task per year + make + model.",
    );
  } finally {
    els.scanButton.disabled = false;
    els.scanButton.textContent = "Run Scan";
    render();
  }
}

function mergeScanResults(detected) {
  const existing = new Set(state.tasks.map((task) => task.id));
  detected.forEach((item) => {
    const id = `${item.dealer}|${item.year}|${item.model}`.toLowerCase().replace(/\s+/g, "-");
    if (existing.has(id)) return;
    existing.add(id);
    state.tasks.push({
      id,
      dealer: item.dealer,
      year: Number(item.year),
      make: item.make || "",
      model: item.model,
      pageStatus: "needs_seo",
      aeoStatus: "not_started",
      details: {},
      accent: brandAccentOverrides[item.make]?.accent || dealerAccents[item.dealer] || "#2563a9",
      accentStyle: accentStyleForTask(item),
      inventorySignal: "on_lot",
      inventoryUrl: sourceFor(item.dealer)?.inventoryUrl || "",
      source: "inventory-scan",
    });
  });
}

function seedDetectedFromTracker() {
  return state.tasks
    .filter((task) => task.year >= 2027 && task.pageStatus !== "live")
    .map((task) => ({
      dealer: task.dealer,
      year: task.year,
      make: task.make,
      model: task.model,
    }));
}

function inferSignal(task) {
  if (task.pageStatus === "live") return "on_lot";
  if (["seo_done", "needs_build", "page_built"].includes(task.pageStatus)) return "shipped";
  return "upcoming";
}

function inferAeoStatus(pageStatus) {
  if (pageStatus === "aeo_in_progress") return "in_progress";
  if (pageStatus === "aeo_done") return "done";
  return "not_started";
}

function normalizePageStatus(pageStatus) {
  if (pageStatus === "needs_aeo" || pageStatus === "aeo_in_progress") return "seo_done";
  if (pageStatus === "aeo_done") return "needs_build";
  return pageStatus;
}

function configureInviteOnboarding() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "reset") {
    localStorage.removeItem("fusz-demo-session");
    localStorage.removeItem("pipeline-workspace-view");
    localStorage.removeItem("pipeline-status-overrides");
    localStorage.removeItem("pipeline-aeo-overrides");
    localStorage.removeItem("pipeline-signal-overrides");
    localStorage.removeItem("pipeline-task-details");
    localStorage.setItem("fusz-theme", "gray");
    state.session = null;
    state.overrides = {};
    state.aeoOverrides = {};
    state.details = {};
    state.signalOverrides = {};
    state.workspaceView = "my_work";
    state.onboardingStep = "login";
    state.selectedTheme = "gray";
    history.replaceState({}, "", window.location.pathname);
  }

  if (!els.authScreen) return;

  const shell = els.authScreen.querySelector(".auth-shell");
  if (!shell) return;

  shell.innerHTML = `
    <div class="auth-card is-active" data-auth-step="login">
      <strong class="auth-logo">Fusz+</strong>
      <p class="eyebrow">Invite accepted</p>
      <h2>Welcome to Fusz+, Jnuru</h2>
      <p class="auth-copy">
        You've been added as a Builder. Your default workspace is My Work,
        where you'll see pages ready to build and pages that need live
        verification.
      </p>
      <div class="profile-preview" aria-label="Signed in as Jnuru Goodwin, Builder">
        <span aria-hidden="true">JG</span>
        <div>
          <strong>Jnuru Goodwin</strong>
          <small>Builder</small>
        </div>
      </div>
      <button id="continueLoginButton" class="button button-primary" type="button">
        Open My Work
      </button>
      <button id="authHelpButton" class="auth-help-link" type="button">View Builder access</button>
    </div>
  `;

  let style = document.querySelector("#auth-confirmation-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "auth-confirmation-style";
    document.head.append(style);
  }

  style.textContent = `
    body[data-view="focus"][data-workspace-view="docs"] .focus-panel,
    body[data-view="focus"][data-workspace-view="settings"] .focus-panel,
    body[data-view="focus"][data-workspace-view="upcoming"] .focus-panel {
      display: none !important;
    }

    .auth-screen {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: var(--bg); /* page bg token — dark: #151515, light: overridden below */
    }

    body[data-theme="light"] .auth-screen {
      background: linear-gradient(180deg, #f5f1eb, #f0ebe3);
    }

    .auth-shell {
      display: block;
      width: 100%;
      max-width: 480px;
      min-height: 0;
      margin-inline: auto;
      background: transparent;
    }

    .auth-card {
      display: none;
      width: 100%;
      min-height: 0;
      padding: 32px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
      animation: panelIn 220ms ease both;
    }

    .auth-card.is-active {
      display: block;
    }

    .auth-logo {
      display: block;
      margin-bottom: 28px;
      color: var(--ink);
      font-size: 18px;
      font-weight: 850;
      line-height: 1;
    }

    .auth-card h2 {
      margin-top: 4px;
      font-size: clamp(24px, 5vw, 28px);
      line-height: 1.12;
    }

    .auth-copy {
      margin: 12px 0 20px;
      color: var(--muted);
      font-size: 14px;
      font-weight: 650;
      line-height: 1.5;
    }

    .profile-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 20px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.025);
    }

    body[data-theme="light"] .profile-preview {
      background: #ede9e4;
      border-color: var(--line);
    }

    .profile-preview > span {
      display: inline-grid;
      flex: 0 0 auto;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 999px;
      background: var(--action-blue);
      color: #ffffff;
      font-size: 12px;
      font-weight: 950;
    }

    .profile-preview strong,
    .profile-preview small {
      display: block;
    }

    .profile-preview strong {
      color: var(--ink);
      font-size: 14px;
      font-weight: 850;
    }

    .profile-preview small {
      margin-top: 2px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 750;
    }

    .auth-card .button {
      width: 100%;
      min-height: 46px;
      justify-content: center;
    }

    .auth-help-link {
      display: block;
      width: fit-content;
      margin: 14px auto 0;
      padding: 4px;
      border: 0;
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 800;
    }

    .auth-help-link:hover,
    .auth-help-link:focus-visible {
      color: var(--blue);
    }

    @media (max-width: 560px) {
      .auth-screen {
        align-items: start;
        padding: 20px 16px 32px;
      }

      .auth-shell {
        max-width: none;
      }

      .auth-card {
        padding: 22px;
      }

      .auth-logo {
        margin-bottom: 24px;
      }
    }
  `;

  els.authCards = document.querySelectorAll("[data-auth-step]");
  els.flowDots = document.querySelectorAll("[data-flow-dot]");
  els.continueLoginButton = document.querySelector("#continueLoginButton");
  els.previewAdminButton = null;
  els.continueThemeButton = null;
  els.enterWorkspaceButton = null;
  els.skipToBoardButton = null;
  els.themeOptions = document.querySelectorAll("[data-theme-choice]");
  els.authHelpButton = document.querySelector("#authHelpButton");
}

function on(element, eventName, handler) {
  if (!element) return;
  element.addEventListener(eventName, handler);
}

function bindEvents() {
  configureInviteOnboarding();

  // Notification toggles
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-notif-toggle]");
    if (!toggle) return;
    const on = toggle.classList.toggle("is-active");
    toggle.setAttribute("aria-checked", on ? "true" : "false");
  });

  // "Go to Settings" shortcut from Admin page
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-nav-settings]")) {
      document.querySelector("[data-nav='settings']")?.click();
    }
  });

  // Invite modal — open
  document.addEventListener("click", (e) => {
    if (e.target.closest(".button-primary-action[type='button']")?.textContent?.trim() === "Invite member") {
      const dialog = document.getElementById("inviteDialog");
      if (dialog) {
        document.getElementById("inviteName").value = "";
        document.getElementById("inviteEmail").value = "";
        dialog.showModal();
      }
    }
  });

  // Invite modal — send (fires mailto:)
  on(document.getElementById("sendInviteButton"), "click", () => {
    const name  = document.getElementById("inviteName").value.trim();
    const email = document.getElementById("inviteEmail").value.trim();
    const role  = document.getElementById("inviteRole").value;

    if (!email) {
      showToast("Please enter an email address.");
      return;
    }

    const appUrl  = window.location.origin + window.location.pathname;
    const param   = role.toLowerCase().replace(/\s+/g, "-");
    const inviteUrl = `${appUrl}?invite=${param}`;
    const subject = encodeURIComponent(`You've been invited to Fusz+`);
    const body    = encodeURIComponent(
      `Hi ${name || "there"},\n\nYou've been added as ${role} on the Lou Fusz 2027 model pipeline dashboard.\n\nClick the link below to open your workspace:\n${inviteUrl}\n\nLet me know if you have any questions.`
    );

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    document.getElementById("inviteDialog").close();
    showToast(`Invite opened for ${email}`);
  });

  on(els.continueLoginButton, "click", (event) => {
    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = "Opening";
    completeOnboarding("my_work", "Builder");
  });

  on(els.authHelpButton, "click", () => {
    showToast("Builder access opens My Work and the Team Pipeline.");
  });

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

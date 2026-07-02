function roleAccessDescription(member) {
  if (member.primaryRole === "AEO Writer") return "Your AEO workspace is ready — you'll see pages that need AEO content added.";
  if (member.primaryRole === "SEO Writer") return "Your SEO workspace is ready — you'll see pages that need copy written.";
  return "Your My Work queue shows pages ready to build and pages that need live verification.";
}

function roleAccessHelp(member) {
  if (member.primaryRole === "AEO Writer") return member.isAdmin ? "AEO Writer + Admin access" : "View AEO Writer access";
  if (member.primaryRole === "SEO Writer") return "View SEO Writer access";
  return member.isAdmin ? "Builder + Admin access" : "View Builder access";
}

function roleAccessHelpToast(member) {
  if (member.primaryRole === "AEO Writer") return "AEO Writer access: My Work (AEO tasks)" + (member.isAdmin ? " + Team Pipeline + Admin" : "") + ".";
  if (member.primaryRole === "SEO Writer") return "SEO Writer access: My Work (SEO tasks).";
  return "Builder access: My Work + Team Pipeline" + (member.isAdmin ? " + Admin" : "") + ".";
}

function configureInviteOnboarding() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "reset") {
    localStorage.removeItem("fusz-demo-session");
    localStorage.removeItem("pipeline-workspace-view");
    
    
    
    
    fbClearAll();
    localStorage.setItem("fusz-theme", "system");
    state.session = null;
    state.overrides = {};
    state.aeoOverrides = {};
    state.details = {};
    state.signalOverrides = {};
    state.workspaceView = "my_work";
    state.onboardingStep = "login";
    state.selectedTheme = "system";
    history.replaceState({}, "", window.location.pathname);
  }

  if (!els.authScreen) return;
  const shell = els.authScreen.querySelector(".auth-shell");
  if (!shell) return;

  // Resolve who is being onboarded: ?invite=scott / ?invite=chris / default = Jnuru
  const inviteKey = params.get("invite") || "jnuru";
  const member = rosterByInviteKey(inviteKey) || TEAM_ROSTER[0];

  // Store pending member on state so continueLoginButton handler can read it
  state._pendingMember = member;

  const firstName = member.name.split(" ")[0];
  const roleLabel = member.isAdmin ? `${member.primaryRole} + Admin` : member.primaryRole;

  shell.innerHTML = `
    <div class="auth-card is-active" data-auth-step="login">
      <strong class="auth-logo">Fusz<span class="sidebar-logo-plus">+</span></strong>
      <p class="eyebrow">Invite accepted</p>
      <h2>Welcome to Fusz+, ${firstName}</h2>
      <p class="auth-copy">${roleAccessDescription(member)}</p>
      <div class="profile-preview" aria-label="Signed in as ${member.name}, ${roleLabel}">
        <span aria-hidden="true">${member.initials}</span>
        <div>
          <strong>${member.name}</strong>
          <small>${roleLabel}</small>
        </div>
      </div>
      <button id="continueLoginButton" class="button button-primary" type="button">
        Open My Work
      </button>
      <button id="authHelpButton" class="auth-help-link" type="button">${roleAccessHelp(member)}</button>
    </div>
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

  // Team member Manage buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-manage-member]");
    if (!btn) return;
    const name = btn.dataset.manageMember;
    const row = btn.closest("[role='row']");
    const role = row?.querySelector("[data-label='Role']")?.textContent?.trim() || "Team member";
    const email = row?.querySelector("[data-label='Email']")?.textContent?.trim() || "";
    showToast(`${name} · ${role}${email ? " · " + email : ""} — role editing coming soon.`);
  });

  // Admin panel action buttons — navigate or filter
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-admin-nav]");
    if (!btn) return;
    const view = btn.dataset.adminNav;
    const filter = btn.dataset.adminFilter;
    const scrollTo = btn.dataset.adminScroll;

    setWorkspaceView(view);

    if (filter === "blocked") {
      // Switch to team_board then apply blocked filter (missing owner)
      setTimeout(() => {
        const statusFilter = document.getElementById("statusFilter");
        if (statusFilter) {
          statusFilter.value = "needs_seo";
          statusFilter.dispatchEvent(new Event("change"));
        }
        showToast("Showing models that need attention — check SEO owner column.");
      }, 120);
    }

    if (scrollTo) {
      setTimeout(() => {
        const target = document.getElementById(scrollTo);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 180);
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
    button.textContent = "Opening…";
    const member = state._pendingMember || TEAM_ROSTER[0];
    completeOnboarding(member);
  });

  on(els.authHelpButton, "click", () => {
    const member = state._pendingMember || TEAM_ROSTER[0];
    showToast(roleAccessHelpToast(member));
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

  on(els.enterWorkspaceButton, "click", () => completeOnboarding(state._pendingMember || TEAM_ROSTER[0]));
  on(els.skipToBoardButton, "click", () => {
    const m = { ...(state._pendingMember || TEAM_ROSTER[0]), defaultView: "team_board" };
    completeOnboarding(m);
  });

  on(els.restartDemoButton, "click", () => {
    localStorage.removeItem("fusz-demo-session");
    state.session = null;
    state.onboardingStep = "login";
    setWorkspaceView("my_work", { silent: true });
    renderAuth();
    applyTheme("system");
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
  fbSetPageStatus(state.overrides);
  showToast(`${displayModel(task)} moved to ${statusLabels[status] || status}`);
  render();
}

function updateAeoStatus(taskId, status) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return;

  task.aeoStatus = status;
  state.aeoOverrides[taskId] = status;
  fbSetAeoStatus(state.aeoOverrides);
  showToast(`${displayModel(task)} ${aeoLabels[status] || status}`);
  render();
}

function updateSignal(taskId, signal) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return;

  task.inventorySignal = signal;
  state.signalOverrides[taskId] = signal;
  fbSetSignal(state.signalOverrides);
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
  document.getElementById("aeoNotesInput").value = details.aeoNotes || "";
  els.taskDialog.showModal();
}

function saveTaskDetails() {
  const task = state.tasks.find((candidate) => candidate.id === state.activeTaskId);
  if (!task) return;

  task.inventorySignal = els.detailSignalSelect.value;
  task.aeoStatus = els.detailAeoSelect.value;
  state.signalOverrides[task.id] = task.inventorySignal;
  state.aeoOverrides[task.id] = task.aeoStatus;
  fbSetSignal(state.signalOverrides);
  fbSetAeoStatus(state.aeoOverrides);

  task.details = {
    seoOwner: els.seoOwnerInput.value.trim(),
    aeoOwner: els.aeoOwnerInput.value.trim(),
    buildOwner: els.buildOwnerInput.value.trim(),
    notes: els.taskNotesInput.value.trim(),
    aeoNotes: document.getElementById("aeoNotesInput").value.trim(),
    updatedAt: new Date().toISOString(),
  };
  state.details[task.id] = task.details;
  fbSetDetails(state.details);
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

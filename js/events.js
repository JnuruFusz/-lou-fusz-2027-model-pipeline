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
    fbSignOut().catch(() => {}); // sign out of Google too
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

  // Live date string
  const _days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const _months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const _now = new Date();
  const dateStr = `${_days[_now.getDay()].toUpperCase()} · ${_months[_now.getMonth()].toUpperCase()} ${_now.getDate()}, ${_now.getFullYear()}`;

  // Role pills
  const _pills = [member.primaryRole];
  if (member.isAdmin) _pills.push('Admin');
  const pillsHtml = _pills.map((p) => `<span class="auth-role-pill">${p.toUpperCase()}</span>`).join('');
  const accessDesc = member.isAdmin ? 'Full pipeline access' : `${member.primaryRole} workspace`;

  // Directly bind help button after innerHTML swap (event delegation safeguard)
  const _bindHelpBtn = () => {
    const btn = document.querySelector("#authHelpButton");
    if (btn) btn.addEventListener("click", () => showToast(roleAccessHelpToast(member)));
  };
  window.setTimeout(_bindHelpBtn, 0);

  shell.innerHTML = `
    <div class="auth-split">
      <!-- Left: cream editorial -->
      <div class="auth-editorial">
        <header class="auth-editorial-header">
          <strong class="auth-logo">Fusz<span class="sidebar-logo-plus">+</span></strong>
          <span class="auth-date">${dateStr}</span>
        </header>
        <div class="auth-editorial-body">
          <p class="auth-eyebrow-new"><span class="auth-eyebrow-dot"></span>INVITE ACCEPTED</p>
          <h2 class="auth-headline">Welcome to<br>Fusz<span class="sidebar-logo-plus">+</span>, ${firstName}.</h2>
          <p class="auth-copy">${roleAccessDescription(member)}</p>
        </div>
        <footer class="auth-editorial-footer">
          <div class="auth-hash-texture"></div>
          <div class="auth-footer-labels">
            <span>LOU FUSZ AUTOMOTIVE</span>
            <span>SEO PIPELINE · 2027 MODELS</span>
          </div>
        </footer>
      </div>
      <!-- Right: dark action panel -->
      <div class="auth-action-panel">
        <div class="auth-panel-watermark">+</div>
        <div class="auth-panel-content">
          <p class="auth-signed-label">SIGNED IN AS</p>
          <div class="auth-panel-rule"></div>
          <div class="auth-profile-row">
            <span class="auth-row-index">01</span>
            <span class="auth-avatar" aria-hidden="true">${member.initials}</span>
            <div class="auth-profile-info">
              <strong>${member.name}</strong>
              <small>${roleLabel}</small>
            </div>
            <span class="auth-verified-badge">VERIFIED</span>
          </div>
          <div class="auth-panel-rule"></div>
          <div class="auth-roles-row">
            <span class="auth-row-index">02</span>
            <div class="auth-role-pills">
              ${pillsHtml}
              <span class="auth-access-desc">${accessDesc}</span>
            </div>
          </div>
          <div class="auth-panel-rule"></div>
          <button id="continueLoginButton" class="button button-primary auth-cta" type="button">
            Open My Work <span aria-hidden="true">→</span>
          </button>
          <button class="auth-help-link" type="button" data-auth-help>${roleAccessHelp(member)}</button>
        </div>
      </div>
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

  // Team member Manage buttons — open member dialog with invite link
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-manage-member]");
    if (!btn) return;
    const name = btn.dataset.manageMember;
    const member = TEAM_ROSTER.find((m) => m.name === name) || null;
    if (!member) return;

    const dialog = document.getElementById("manageMemberDialog");
    if (!dialog) return;

    const appUrl = window.location.origin + window.location.pathname;
    const inviteUrl = `${appUrl}?invite=${member.inviteKey}`;

    document.getElementById("manageMemberAvatar").textContent = member.initials;
    document.getElementById("manageMemberName").textContent = member.name;
    document.getElementById("manageMemberRole").textContent =
      member.isAdmin ? `${member.primaryRole} · Admin` : member.primaryRole;
    document.getElementById("manageMemberInviteUrl").textContent = inviteUrl;

    // Wire copy button
    const copyBtn = document.getElementById("copyInviteLinkButton");
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
      }).catch(() => showToast("Copy failed — select the link manually."));
    };

    // Wire email button
    const emailBtn = document.getElementById("emailInviteButton");
    emailBtn.onclick = () => {
      const subject = encodeURIComponent("You've been invited to Fusz+");
      const body = encodeURIComponent(
        `Hi ${member.name.split(" ")[0]},

You've been added as ${member.primaryRole} on the Lou Fusz 2027 model pipeline dashboard.

Click the link below to open your workspace:
${inviteUrl}

Sign in with your Google account (${member.googleEmail || member.email}) when prompted.

Let me know if you have any questions.`
      );
      window.open(`mailto:${member.email}?subject=${subject}&body=${body}`);
      dialog.close();
      showToast(`Invite email opened for ${member.name}`);
    };

    dialog.showModal();
  });

  // Close manage member dialog
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-manage-dialog]")) {
      document.getElementById("manageMemberDialog")?.close();
    }
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

  on(els.continueLoginButton, "click", async (event) => {
    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = "Opening Google…";
    try {
      const result = await fbSignInWithGoogle();
      const googleEmail = result.user?.email || "";
      const member = rosterByGoogleEmail(googleEmail);
      if (!member) {
        await fbSignOut().catch(() => {});
        button.disabled = false;
        button.textContent = "Open My Work →";
        showToast("This Google account doesn't have access. Try a different account.", 4500);
        return;
      }
      completeOnboarding(member);
    } catch (err) {
      button.disabled = false;
      button.textContent = "Open My Work →";
      if (err.code === "auth/popup-blocked") {
        showToast("Popups are blocked — please allow popups for this site and try again.", 5000);
      } else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
        showToast("Sign-in failed — please try again.");
        console.warn("[Fusz+] Google sign-in error:", err);
      }
    }
  });

  // authHelpButton uses delegation — element is injected dynamically
  // so we catch it via data-auth-help on the document click handler

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

  const signOutButton = document.getElementById("signOutButton");
  on(signOutButton, "click", async () => {
    try {
      await fbSignOut();
    } catch (err) {
      console.warn("[Fusz+] Sign-out error:", err);
    }
    state.session = null;
    localStorage.removeItem("fusz-demo-session");
    localStorage.removeItem("pipeline-workspace-view");
    sessionStorage.setItem("fusz-signed-out", "1"); // skip Firebase wait on reload
    state.onboardingStep = "login";
    renderAuth();
    showToast("Signed out");
  });

  [els.yearFilter, els.dealerFilter, els.statusFilter, els.ownerFilter, els.searchInput].forEach((el) => {
    on(el, "input", render);
    on(el, "change", render);
  });

  on(els.clearFiltersButton, "click", () => {
    els.yearFilter.value = "all";
    els.dealerFilter.value = "all";
    els.statusFilter.value = "all";
    if (els.ownerFilter) els.ownerFilter.value = "all";
    els.searchInput.value = "";
    showToast("Filters cleared");
    render();
  });

  on(els.mobileMenuButton, "click", openNavigation);
  on(els.navCloseButton, "click", closeNavigation);
  on(els.navBackdrop, "click", closeNavigation);

  document.addEventListener("click", (event) => {
    // Pipeline group collapse toggle
    const groupToggle = event.target.closest("[data-pipeline-group-toggle]");
    if (groupToggle) {
      const tierKey = groupToggle.dataset.pipelineGroupToggle;
      if (!tierKey) return;
      // Read current state from DOM, toggle it, persist, re-render
      const group = groupToggle.closest(".pipeline-group");
      const wasCollapsed = group ? group.classList.contains("is-collapsed") : false;
      try {
        const stored = JSON.parse(localStorage.getItem("fusz-pipeline-group-collapsed") || "{}");
        stored[tierKey] = !wasCollapsed;
        localStorage.setItem("fusz-pipeline-group-collapsed", JSON.stringify(stored));
      } catch {}
      render();
      return;
    }

    // "Show all X" expand button
    const showAllBtn = event.target.closest("[data-pipeline-show-all]");
    if (showAllBtn) {
      event.stopPropagation();
      const group = showAllBtn.closest(".pipeline-group");
      if (!group) return;
      const hiddenRows = group.querySelector(".pipeline-hidden-rows");
      if (hiddenRows) hiddenRows.hidden = false;
      showAllBtn.remove();
      return;
    }

    // Nudge owner button
    const nudgeBtn = event.target.closest("[data-nudge-owner]");
    if (nudgeBtn) {
      event.stopPropagation();
      const ownerName = nudgeBtn.dataset.nudgeOwner || "the owner";
      showToast(`Reminder sent to ${ownerName.split(" ")[0]}`);
      return;
    }

    if (event.target.closest("[data-auth-help]")) {
      const member = state._pendingMember || TEAM_ROSTER[0];
      showToast(roleAccessHelpToast(member));
      return;
    }

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

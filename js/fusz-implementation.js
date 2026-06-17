(function () {
  const ROOFTOPS_KEY = "fusz-rooftops";
  const DRIVE_KEY = "fusz-drive-connection";
  let rooftopFormOpen = false;

  function installImplementationStyles() {
    if (document.querySelector("#fusz-implementation-style")) return;
    const style = document.createElement("style");
    style.id = "fusz-implementation-style";
    style.textContent = `
      .board,
      .table-section {
        display: none !important;
      }

      body[data-workspace-view="team_board"] .board {
        display: grid !important;
      }

      body[data-workspace-view="team_board"] .table-section {
        display: block !important;
      }

      body[data-workspace-view="team_board"] .task-list {
        gap: 16px;
      }

      body[data-workspace-view="team_board"] .task {
        display: grid;
        gap: 12px;
        padding: 18px 18px 20px;
        overflow: visible;
      }

      body[data-workspace-view="team_board"] .task-state {
        margin: 0;
      }

      body[data-workspace-view="team_board"] .task-card-title {
        margin: 0;
        line-height: 1.28;
      }

      body[data-workspace-view="team_board"] .queue-reason {
        margin: 0;
        line-height: 1.45;
      }

      body[data-workspace-view="team_board"] .task-meta {
        gap: 10px 12px;
        margin: 0;
        min-width: 0;
      }

      body[data-workspace-view="team_board"] .task-meta .table-dealer {
        max-width: 100%;
      }

      body[data-workspace-view="team_board"] .task-meta .status,
      body[data-workspace-view="team_board"] .task-meta .signal {
        margin-top: 0;
      }

      body[data-workspace-view="team_board"] .task-actions {
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 2px;
      }

      body[data-workspace-view="team_board"] .task-actions .button {
        flex: 0 1 auto;
        min-width: 112px;
      }

      body[data-workspace-view="team_board"] .task-actions .button-primary-action,
      body[data-workspace-view="team_board"] .task-actions .button-secondary-action {
        min-width: 148px;
      }

      .rooftops-manager {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--line);
      }

      .rooftops-manager .section-heading {
        align-items: center;
        margin-bottom: 12px;
      }

      .rooftops-manager h3 {
        margin: 2px 0 0;
        color: var(--ink);
        font-size: 16px;
      }

      .rooftop-form {
        display: grid;
        gap: 10px;
        margin: 0 0 12px;
        padding: 12px;
        border: 1px solid rgba(79, 156, 255, 0.22);
        border-radius: 8px;
        background: rgba(47, 114, 214, 0.08);
      }

      .rooftop-form[hidden] {
        display: none;
      }

      .rooftop-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .rooftop-form label:last-child {
        grid-column: 1 / -1;
      }

      .rooftop-form input {
        width: 100%;
        min-height: 36px;
        border: 1px solid var(--line);
        border-radius: 7px;
        background: #151515;
        color: var(--text);
        box-sizing: border-box;
      }

      .rooftop-form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }

      .rooftops-list {
        display: grid;
        gap: 8px;
      }

      .rooftop-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 16px;
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.025);
      }

      .rooftop-row strong,
      .rooftop-row span {
        display: block;
      }

      .rooftop-row strong {
        color: var(--ink);
        font-size: 13px;
      }

      .rooftop-row span {
        margin-top: 3px;
        color: var(--muted);
        font-size: 12px;
      }

      .rooftop-status-switch {
        position: relative;
        display: inline-flex;
        justify-self: end;
        width: 36px;
        min-width: 36px;
        height: 24px;
        min-height: 24px;
        padding: 0;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: #303030;
        cursor: pointer;
        transition: background 160ms ease, border-color 160ms ease;
      }

      .rooftop-status-switch::after {
        content: "";
        position: absolute;
        top: 3px;
        left: 3px;
        width: 16px;
        height: 16px;
        border-radius: 999px;
        background: #e8e8e8;
        transition: transform 160ms ease;
      }

      .rooftop-status-switch.is-active {
        border-color: rgba(78, 216, 149, 0.42);
        background: rgba(78, 216, 149, 0.85);
      }

      .rooftop-status-switch.is-active::after {
        transform: translateX(12px);
      }

      .rooftop-status-switch:focus-visible {
        outline: 2px solid var(--blue);
        outline-offset: 2px;
      }

      @media (max-width: 760px) {
        .rooftop-row,
        .rooftop-form-grid {
          grid-template-columns: 1fr;
        }

        .rooftop-status-switch {
          justify-self: start;
        }
      }
    `;
    document.head.append(style);
  }

  function selectedTaskIdFromDetail(button) {
    const explicit = button?.dataset.taskId;
    if (explicit) return explicit;
    const selectedRow = document.querySelector(".workbench-row.is-selected[data-workbench-task]");
    if (selectedRow?.dataset.workbenchTask) return selectedRow.dataset.workbenchTask;
    return button?.closest(".workbench-detail-actions")?.querySelector("[data-task-id]")?.dataset.taskId || state.activeTaskId;
  }

  function selectedTaskFromDetail(button) {
    const taskId = selectedTaskIdFromDetail(button);
    return state.tasks?.find((task) => task.id === taskId);
  }

  function saveTaskNoteAndReturn(button) {
    const task = selectedTaskFromDetail(button);
    if (!task) return;
    const reason = window.prompt("Why are you returning this to SEO? (required)");
    if (!reason || !reason.trim()) return;
    task.details = {
      ...(task.details || {}),
      notes: reason.trim(),
      updatedAt: new Date().toISOString(),
    };
    state.details[task.id] = task.details;
    localStorage.setItem("pipeline-task-details", JSON.stringify(state.details));
    updateStatus(task.id, "needs_seo");
    showToast("Returned to SEO — note saved");
  }

  function handleBuilderAction(event) {
    const row = event.target.closest("[data-workbench-task]");
    if (row?.dataset.workbenchTask) state.activeTaskId = row.dataset.workbenchTask;

    const button = event.target.closest("button");
    if (!button?.closest("#builderDetailPanel")) return false;
    const label = button.textContent.trim();
    const task = selectedTaskFromDetail(button);
    if (!task) return false;

    if (label === "Start Build") {
      event.preventDefault();
      event.stopPropagation();
      updateStatus(task.id, "page_built");
      showToast("Build started — moved to Ready to Verify");
      return true;
    }

    if (label === "Mark Page Live") {
      event.preventDefault();
      event.stopPropagation();
      updateStatus(task.id, "live");
      showToast("Page is live — removed from active queue");
      return true;
    }

    if (label === "Return to SEO") {
      event.preventDefault();
      event.stopPropagation();
      saveTaskNoteAndReturn(button);
      return true;
    }

    return false;
  }

  function defaultRooftops() {
    return (state.sources || []).map((source) => ({
      id: normalizeCompare(source.dealer),
      name: source.dealer,
      brand: source.brands?.join(", ") || "Brand",
      feedUrl: source.inventoryUrl || "",
      active: true,
    }));
  }

  function ensureRooftops() {
    if (!Array.isArray(state.rooftops)) state.rooftops = defaultRooftops();
    return state.rooftops;
  }

  function saveRooftops() {
    localStorage.setItem(ROOFTOPS_KEY, JSON.stringify(ensureRooftops()));
  }

  function ensureRooftopControls() {
    const adminList = document.querySelector("#adminPanel .admin-action-list");
    if (!adminList || document.querySelector("[data-rooftops-manage]")) return;
    adminList.insertAdjacentHTML("beforeend", `
      <article class="admin-row">
        <div>
          <strong>Rooftops</strong>
          <span>Add dealerships and control active status</span>
        </div>
        <button class="button button-quiet" type="button" data-rooftops-manage>Manage</button>
      </article>
    `);
    adminList.closest(".builder-panel")?.insertAdjacentHTML("beforeend", `
      <section id="rooftopsManager" class="rooftops-manager" hidden aria-label="Rooftop management">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Dealership config</p>
            <h3>Rooftops</h3>
          </div>
          <button id="addRooftopButton" class="button button-primary-action" type="button">Add rooftop</button>
        </div>
        <form id="rooftopForm" class="rooftop-form" hidden>
          <div class="rooftop-form-grid">
            <label>Rooftop name<input id="rooftopNameInput" type="text" placeholder="Lou Fusz Honda" /></label>
            <label>Brand<input id="rooftopBrandInput" type="text" placeholder="Honda" /></label>
            <label>Feed URL<input id="rooftopFeedInput" type="url" placeholder="https://example.com/new-vehicles/" /></label>
          </div>
          <div class="rooftop-form-actions">
            <button class="button button-quiet" type="button" data-rooftop-cancel>Cancel</button>
            <button class="button button-primary-action" type="button" data-rooftop-save>Save rooftop</button>
          </div>
        </form>
        <div id="rooftopsList" class="rooftops-list"></div>
      </section>
    `);
  }

  function renderRooftops() {
    ensureRooftopControls();
    const form = document.querySelector("#rooftopForm");
    if (form) form.hidden = !rooftopFormOpen;
    const list = document.querySelector("#rooftopsList");
    if (!list) return;
    const rooftops = ensureRooftops();
    list.innerHTML = rooftops.length ? rooftops.map((rooftop) => `
      <article class="rooftop-row">
        <div>
          <strong>${escapeHtml(rooftop.name)}</strong>
          <span>${escapeHtml(rooftop.brand)} / ${escapeHtml(rooftop.feedUrl || "No feed URL")}</span>
        </div>
        <button class="rooftop-status-switch${rooftop.active ? " is-active" : ""}" type="button" data-rooftop-active="${escapeAttr(rooftop.id)}" aria-label="${escapeAttr(`${rooftop.active ? "Deactivate" : "Activate"} ${rooftop.name}`)}"></button>
      </article>
    `).join("") : `<div class="empty">No rooftops configured.</div>`;
  }

  function openRooftopForm() {
    rooftopFormOpen = true;
    renderRooftops();
    document.querySelector("#rooftopNameInput")?.focus();
  }

  function closeRooftopForm() {
    rooftopFormOpen = false;
    ["#rooftopNameInput", "#rooftopBrandInput", "#rooftopFeedInput"].forEach((selector) => {
      const input = document.querySelector(selector);
      if (input) input.value = "";
    });
    renderRooftops();
  }

  function addRooftopFromForm() {
    const name = document.querySelector("#rooftopNameInput")?.value.trim();
    const brand = document.querySelector("#rooftopBrandInput")?.value.trim();
    const feedUrl = document.querySelector("#rooftopFeedInput")?.value.trim() || "";
    if (!name || !brand) {
      showToast("Add a rooftop name and brand first");
      return;
    }
    state.rooftops = [
      ...ensureRooftops(),
      {
        id: `${normalizeCompare(name)}-${Date.now()}`,
        name,
        brand,
        feedUrl,
        active: true,
      },
    ];
    saveRooftops();
    closeRooftopForm();
    showToast("Rooftop added");
  }

  function updateRooftopStatus(button) {
    const rooftop = ensureRooftops().find((item) => item.id === button.dataset.rooftopActive);
    if (!rooftop) return;
    rooftop.active = !rooftop.active;
    saveRooftops();
    renderRooftops();
    showToast(`${rooftop.name} set ${rooftop.active ? "active" : "inactive"}`);
  }

  function driveParts() {
    const button = document.querySelector('[data-settings-action="Connect Drive"]');
    const row = button?.closest(".integration-row");
    const status = row?.querySelector(".integration-status");
    return { button, status };
  }

  function renderDriveConnection() {
    const { status } = driveParts();
    if (!status) return;
    const pending = state.driveConnection === "pending" || localStorage.getItem(DRIVE_KEY) === "pending";
    state.driveConnection = pending ? "pending" : "not_connected";
    status.textContent = pending ? "Pending connection" : "Not connected";
    status.className = `settings-status integration-status ${pending ? "status-amber" : "status-gray"}`;
  }

  function handleDriveConnection(button) {
    const originalText = button.textContent;
    button.disabled = true;
    button.classList.add("is-loading");
    button.textContent = "Working";
    window.setTimeout(() => {
      state.driveConnection = "pending";
      localStorage.setItem(DRIVE_KEY, state.driveConnection);
      button.disabled = false;
      button.classList.remove("is-loading");
      button.textContent = originalText;
      renderDriveConnection();
      showToast("Drive connection requested — check your email to authorize");
    }, 650);
  }

  document.addEventListener("click", (event) => {
    if (handleBuilderAction(event)) return;

    const manageButton = event.target.closest("[data-rooftops-manage]");
    if (manageButton) {
      const manager = document.querySelector("#rooftopsManager");
      if (manager) manager.hidden = !manager.hidden;
      renderRooftops();
      return;
    }

    const addButton = event.target.closest("#addRooftopButton");
    if (addButton) {
      event.preventDefault();
      event.stopPropagation();
      openRooftopForm();
      return;
    }

    const saveButton = event.target.closest("[data-rooftop-save]");
    if (saveButton) {
      event.preventDefault();
      event.stopPropagation();
      addRooftopFromForm();
      return;
    }

    const cancelButton = event.target.closest("[data-rooftop-cancel]");
    if (cancelButton) {
      event.preventDefault();
      event.stopPropagation();
      closeRooftopForm();
      return;
    }

    const rooftopToggle = event.target.closest("[data-rooftop-active]");
    if (rooftopToggle) {
      event.preventDefault();
      event.stopPropagation();
      updateRooftopStatus(rooftopToggle);
      return;
    }

    const driveButton = event.target.closest('[data-settings-action="Connect Drive"]');
    if (driveButton) {
      event.preventDefault();
      event.stopPropagation();
      if (!driveButton.disabled) handleDriveConnection(driveButton);
    }
  }, true);

  const originalRenderWorkspaceView = window.renderWorkspaceView;
  if (typeof originalRenderWorkspaceView === "function") {
    window.renderWorkspaceView = function renderWorkspaceViewWithImplementation() {
      originalRenderWorkspaceView();
      ensureRooftopControls();
      renderRooftops();
      renderDriveConnection();
    };
  }

  installImplementationStyles();
  ensureRooftopControls();
  renderDriveConnection();
})();

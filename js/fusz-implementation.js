(function () {
  const ROOFTOPS_KEY = "fusz-rooftops";
  const DRIVE_KEY = "fusz-drive-connection";

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

      .rooftops-list {
        display: grid;
        gap: 8px;
      }

      .rooftop-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
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

      .rooftop-toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 850;
      }

      .rooftop-toggle input {
        accent-color: var(--action-blue);
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
        <div id="rooftopsList" class="rooftops-list"></div>
      </section>
    `);
  }

  function renderRooftops() {
    ensureRooftopControls();
    const list = document.querySelector("#rooftopsList");
    if (!list) return;
    const rooftops = ensureRooftops();
    list.innerHTML = rooftops.length ? rooftops.map((rooftop) => `
      <article class="rooftop-row">
        <div>
          <strong>${escapeHtml(rooftop.name)}</strong>
          <span>${escapeHtml(rooftop.brand)} / ${escapeHtml(rooftop.feedUrl || "No feed URL")}</span>
        </div>
        <label class="rooftop-toggle">
          <input type="checkbox" data-rooftop-active="${escapeAttr(rooftop.id)}" ${rooftop.active ? "checked" : ""} />
          <span>${rooftop.active ? "Active" : "Inactive"}</span>
        </label>
      </article>
    `).join("") : `<div class="empty">No rooftops configured.</div>`;
  }

  function addRooftop() {
    const name = window.prompt("Rooftop name");
    if (!name || !name.trim()) return;
    const brand = window.prompt("Brand");
    if (!brand || !brand.trim()) return;
    const feedUrl = window.prompt("DealerInspire feed URL");
    if (!feedUrl || !feedUrl.trim()) return;
    state.rooftops = [
      ...ensureRooftops(),
      {
        id: `${normalizeCompare(name)}-${Date.now()}`,
        name: name.trim(),
        brand: brand.trim(),
        feedUrl: feedUrl.trim(),
        active: true,
      },
    ];
    saveRooftops();
    renderRooftops();
    showToast("Rooftop added");
  }

  function updateRooftopStatus(input) {
    const rooftop = ensureRooftops().find((item) => item.id === input.dataset.rooftopActive);
    if (!rooftop) return;
    rooftop.active = input.checked;
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
      addRooftop();
      return;
    }

    const rooftopToggle = event.target.closest("[data-rooftop-active]");
    if (rooftopToggle) {
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

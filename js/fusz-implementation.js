(function () {
  const ROOFTOPS_KEY = "fusz-rooftops";
  const DRIVE_KEY = "fusz-drive-connection";
  const FEED_SOURCE_PATH = "Dealer CSV files";
  const FEED_SAMPLE_PATH = "Legacy sample backup";
  const REQUIRED_FEED_COLUMNS = ["dealer", "vin", "year", "make", "model", "status", "inventory_url", "last_updated"];
  let rooftopFormOpen = false;

  function installImplementationStyles() {
    /* styles moved to css/workbench.css */
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

  function normalizedValue(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function uniqueList(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function feedHealth() {
    const rows = state.inventoryFeed?.rows || [];
    const loadedFiles = state.inventoryFeed?.files || [];
    const failedFiles = state.inventoryFeed?.failedFiles || [];
    const headers = uniqueList(rows.flatMap((row) => Object.keys(row || {})));
    const missingColumns = REQUIRED_FEED_COLUMNS.filter((column) => !headers.includes(column));
    const sourceDealers = new Set((state.sources || []).map((source) => normalizedValue(source.dealer)));
    const unknownDealers = uniqueList(rows
      .map((row) => row.dealer)
      .filter((dealer) => dealer && !sourceDealers.has(normalizedValue(dealer))));
    const incompleteRows = rows.filter((row) => !row.dealer || !row.year || !row.make || !row.model).length;
    const vinCounts = rows.reduce((counts, row) => {
      const vin = String(row.vin || "").trim();
      if (vin) counts[vin] = (counts[vin] || 0) + 1;
      return counts;
    }, {});
    const duplicateVins = Object.entries(vinCounts).filter(([, count]) => count > 1).map(([vin]) => vin);
    const lastUpdated = rows
      .map((row) => row.last_updated || row.updated_at || row.lastmodified)
      .filter(Boolean)
      .sort()
      .at(-1) || "No date in feed";
    const hasWarnings = missingColumns.length || unknownDealers.length || duplicateVins.length || incompleteRows;
    return {
      rows,
      loadedFiles,
      failedFiles,
      missingColumns,
      unknownDealers,
      duplicateVins,
      incompleteRows,
      lastUpdated,
      hasWarnings,
    };
  }

  function ensureFeedHealthControls() {
    const count = document.querySelector("#feedVehicleCount");
    const card = count?.closest(".resource-card");
    if (!card || document.querySelector("#feedHealthList")) return;
    const status = document.querySelector("#feedConnectionStatus");
    status?.insertAdjacentHTML("afterend", `
      <div id="feedHealthList" class="feed-health-list" aria-label="Inventory feed health">
        <div><span>Feed set</span><strong id="feedLivePath">${FEED_SOURCE_PATH}</strong></div>
        <div><span>Source files</span><strong id="feedBackupPath">${FEED_SAMPLE_PATH}</strong></div>
        <div><span>Last updated</span><strong id="feedLastUpdated">No date in feed</strong></div>
        <div><span>Health</span><strong id="feedHealthSummary">Waiting on CSV</strong></div>
      </div>
    `);
  }

  function renderFeedHealth() {
    ensureFeedHealthControls();
    const rows = state.inventoryFeed?.rows || [];
    const health = feedHealth();
    const connected = Boolean(state.inventoryFeed?.connected && rows.length);
    const sample = rows[0];
    const loadedCount = health.loadedFiles.length;
    const failedCount = health.failedFiles.length;
    const statusText = !connected
      ? "Waiting on CSV"
      : failedCount || health.hasWarnings
        ? "Dealer feeds loaded - review warnings"
        : "Dealer feeds connected";
    const statusClass = !connected ? "status-gray" : failedCount || health.hasWarnings ? "status-amber" : "status-green";

    const count = document.querySelector("#feedVehicleCount");
    const sampleVehicle = document.querySelector("#feedSampleVehicle");
    const status = document.querySelector("#feedConnectionStatus");
    const livePath = document.querySelector("#feedLivePath");
    const backupPath = document.querySelector("#feedBackupPath");
    const lastUpdated = document.querySelector("#feedLastUpdated");
    const healthSummary = document.querySelector("#feedHealthSummary");

    if (count) count.textContent = connected ? `${rows.length} feed rows` : "Feed waiting";
    if (sampleVehicle) sampleVehicle.textContent = sample ? `${sample.year || ""} ${sample.make || ""} ${sample.model || ""}`.trim() : "No sample yet";
    if (livePath) livePath.textContent = connected ? `${loadedCount} dealer CSV${loadedCount === 1 ? "" : "s"} loaded` : FEED_SOURCE_PATH;
    if (backupPath) backupPath.textContent = failedCount ? `${failedCount} source file${failedCount === 1 ? "" : "s"} missing` : "All expected CSVs reached";
    if (status) {
      status.textContent = statusText;
      status.className = `resource-status ${statusClass}`;
    }
    if (lastUpdated) lastUpdated.textContent = health.lastUpdated;
    if (healthSummary) {
      if (!connected) {
        healthSummary.textContent = "No rows loaded";
      } else if (!failedCount && !health.hasWarnings) {
        healthSummary.textContent = "Required fields look good";
      } else {
        const warnings = [];
        if (failedCount) warnings.push(`${failedCount} failed file${failedCount === 1 ? "" : "s"}`);
        if (health.missingColumns.length) warnings.push(`Missing ${health.missingColumns.join(", ")}`);
        if (health.unknownDealers.length) warnings.push(`${health.unknownDealers.length} unknown dealer${health.unknownDealers.length === 1 ? "" : "s"}`);
        if (health.duplicateVins.length) warnings.push(`${health.duplicateVins.length} duplicate VIN${health.duplicateVins.length === 1 ? "" : "s"}`);
        if (health.incompleteRows) warnings.push(`${health.incompleteRows} incomplete row${health.incompleteRows === 1 ? "" : "s"}`);
        healthSummary.textContent = warnings.join(" / ");
      }
    }

    const feedIntegration = [...document.querySelectorAll(".integration-row")]
      .find((row) => row.textContent.includes("Dealer inventory feeds"));
    const feedIntegrationStatus = feedIntegration?.querySelector(".integration-status");
    if (feedIntegrationStatus) {
      feedIntegrationStatus.textContent = connected ? (failedCount || health.hasWarnings ? "Review feed" : "Connected") : "Pending approval";
      feedIntegrationStatus.className = `settings-status integration-status ${connected ? (failedCount || health.hasWarnings ? "status-amber" : "status-green") : "status-amber"}`;
    }
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

  /* Quick action buttons now rendered inside renderMyWorkRow() in my-work-workbench.js */

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

  const originalRenderInventoryFeedStatus = window.renderInventoryFeedStatus;
  if (typeof originalRenderInventoryFeedStatus === "function") {
    window.renderInventoryFeedStatus = function renderInventoryFeedStatusWithHealth() {
      originalRenderInventoryFeedStatus();
      renderFeedHealth();
    };
  }

  const originalRenderWorkspaceView = window.renderWorkspaceView;
  if (typeof originalRenderWorkspaceView === "function") {
    window.renderWorkspaceView = function renderWorkspaceViewWithImplementation() {
      originalRenderWorkspaceView();
      ensureRooftopControls();
      renderRooftops();
      renderDriveConnection();
      renderFeedHealth();
    };
  }

  installImplementationStyles();
  ensureRooftopControls();
  renderDriveConnection();
  renderFeedHealth();
})();

(function () {
  let _lastSelectedId = null; // persists selected task across re-renders
  let _focusMode = true;      // builders start in focus mode; exit drops to queue list

  /* ---------------------------------------------------------------
     Built-today counter — sessionStorage, resets each calendar day
     --------------------------------------------------------------- */
  function getBuiltToday() {
    try {
      const stored = JSON.parse(sessionStorage.getItem("fusz-built-today") || "{}");
      return stored.date === new Date().toDateString() ? (stored.count || 0) : 0;
    } catch { return 0; }
  }

  function recordBuiltToday() {
    try {
      const today = new Date().toDateString();
      const stored = JSON.parse(sessionStorage.getItem("fusz-built-today") || "{}");
      const count = stored.date === today ? (stored.count || 0) + 1 : 1;
      sessionStorage.setItem("fusz-built-today", JSON.stringify({ date: today, count }));
    } catch {}
  }

  function installMyWorkStyles() { /* styles in css/workbench.css */ }

  function isRenderableTask(task) {
    return Boolean(task && task.id && task.pageStatus);
  }

  function myWorkGroups(tasks = []) {
    const safeTasks = Array.isArray(tasks) ? tasks.filter(isRenderableTask) : [];
    const work = safeTasks
      .filter((t) => ["seo_done","needs_build","page_built","needs_review"].includes(t.pageStatus))
      .sort((a, b) => workPriority(a) - workPriority(b));
    return { work };
  }

  /* ---------------------------------------------------------------
     Focus CTA label + next status
     --------------------------------------------------------------- */
  function focusCta(task) {
    if (task.pageStatus === "page_built")   return ["Mark live ↑",   "live"];
    if (task.pageStatus === "seo_done")     return ["Start build →", "needs_build"];
    if (task.pageStatus === "needs_build")  return ["Mark built ↑",  "page_built"];
    if (task.pageStatus === "needs_review") return ["Keep live",      "live"];
    return ["Review", "live"];
  }

  /* ---------------------------------------------------------------
     Three-step checklist inside the focus card
     --------------------------------------------------------------- */
  function focusChecklist(task) {
    const seoDone     = ["seo_done","needs_build","page_built","live","needs_review"].includes(task.pageStatus);
    const buildDone   = ["page_built","live"].includes(task.pageStatus);
    const buildActive = ["seo_done","needs_build"].includes(task.pageStatus);
    const verifyDone   = task.pageStatus === "live";
    const verifyActive = task.pageStatus === "page_built";
    const docUrl = (typeof seoDocUrl === "function") ? seoDocUrl(task) : null;

    return [
      {
        label: "SEO copy available",
        done: seoDone, active: false,
        link: docUrl
          ? `<a class="focus-check-link" href="${escapeAttr(docUrl)}" target="_blank" rel="noreferrer">Open doc</a>`
          : "",
      },
      {
        label: "Build the model page",
        done: buildDone, active: buildActive,
        link: `<span class="focus-check-link">Open CMS</span>`,
      },
      {
        label: "Verify live URL",
        done: verifyDone, active: verifyActive,
        link: "",
      },
    ].map(({ label, done, active, link }) =>
      `<div class="focus-check-row${done ? " is-done" : active ? " is-active" : ""}">
        <span class="focus-check-icon">${done ? "✓" : ""}</span>
        <span class="focus-check-label">${escapeHtml(label)}</span>
        ${link}
      </div>`
    ).join("");
  }

  /* ---------------------------------------------------------------
     UP NEXT list (up to 4 tasks after the current one)
     --------------------------------------------------------------- */
  function upNextStatus(task) {
    const t = relativeTime(task);
    if (task.pageStatus === "page_built")   return `Live check ${t}`;
    if (task.pageStatus === "needs_review") return `Returned ${t}`;
    return `SEO ready ${t}`;
  }

  function renderUpNext(work, currentId) {
    const rest = work.filter((t) => t.id !== currentId).slice(0, 4);
    if (!rest.length) return "";
    const items = rest.map((t) =>
      `<button class="focus-up-next-item" type="button" data-workbench-task="${escapeAttr(t.id)}">
        <span class="focus-up-next-accent" style="background:${t.accent || "var(--amber)"}"></span>
        <span class="focus-up-next-body">
          <span class="focus-up-next-title">${escapeHtml(taskTitle(t))}</span>
          <span class="focus-up-next-meta">${escapeHtml(dealerShortName(t.dealer))}</span>
        </span>
        <span class="focus-up-next-time">${escapeHtml(upNextStatus(t))}</span>
      </button>`
    ).join("");
    return `<div class="focus-up-next"><p class="focus-up-next-label">UP NEXT</p><div class="focus-up-next-list">${items}</div></div>`;
  }

  function dealerShortName(dealer) {
    const source = state.sources?.find((s) => s.dealer === dealer);
    return source?.shortName || String(dealer || "Dealer").replace(/Lou Fusz /i, "");
  }

  function relativeTime(task) {
    const title = taskTitle(task).toLowerCase();
    if (title.includes("cx-50") || title.includes("cx50")) return task.pageStatus === "page_built" ? "35m ago" : "4h ago";
    if (title.includes("telluride")) return "6h ago";
    if (title.includes("1500")) return "18h ago";
    return "2h ago";
  }

  /* ---------------------------------------------------------------
     Focus hero — the full new task card (builders)
     --------------------------------------------------------------- */
  function renderFocusHero(task, work) {
    if (!task) return "";
    const [ctaLabel, ctaStatus] = focusCta(task);
    const builtToday = getBuiltToday();
    const remaining  = work.length;
    const position   = work.findIndex((t) => t.id === task.id) + 1;
    const totalToday = builtToday + remaining;
    const pct        = totalToday > 0 ? Math.round((builtToday / totalToday) * 100) : 0;
    const isMarkBuilt = ctaStatus === "page_built";

    return `
<div class="focus-hero">
  <header class="focus-hero-header">
    <span class="focus-hero-wordmark">My Work <span class="focus-mode-tag">Focus</span></span>
    <div class="focus-hero-progress">
      <span class="focus-progress-text">${builtToday} of ${totalToday} built today</span>
      <div class="focus-progress-track"><div class="focus-progress-fill" style="width:${pct}%"></div></div>
    </div>
    <button class="focus-exit-btn" type="button" data-focus-exit>Exit focus</button>
  </header>

  <div class="focus-hero-content">
    <div class="focus-hero-body" data-workbench-task="${escapeAttr(task.id)}">
      <p class="focus-eyebrow">
        <span class="focus-eyebrow-dot"></span>YOUR NEXT ACTION
        <span class="focus-eyebrow-sep">·</span>
        ${position} OF ${remaining} REMAINING
      </p>
      <h2 class="focus-task-title">${escapeHtml(taskTitle(task))}</h2>
      <p class="focus-task-meta">${escapeHtml(dealerShortName(task.dealer))} · SEO finalized ${escapeHtml(relativeTime(task))} · Owner: ${escapeHtml(ownerBucket(task))}</p>

      <div class="focus-checklist">
        ${focusChecklist(task)}
      </div>

      <div class="focus-actions">
        <button class="focus-btn focus-btn-ghost" type="button" data-workbench-return>Send back</button>
        <button class="focus-btn focus-btn-ghost" type="button" data-focus-skip>Skip for now</button>
        <button class="focus-btn focus-btn-primary" type="button"
          data-status="${escapeAttr(ctaStatus)}"
          data-task-id="${escapeAttr(task.id)}"
          ${isMarkBuilt ? "data-focus-mark-built" : ""}
        >${escapeHtml(ctaLabel)}</button>
      </div>
      <p class="focus-shortcuts">⏎ mark built &nbsp;·&nbsp; S skip &nbsp;·&nbsp; B send back</p>
    </div>

    ${renderUpNext(work, task.id)}
  </div>
</div>`;
  }

  /* ---------------------------------------------------------------
     Skip to next task in queue
     --------------------------------------------------------------- */
  function skipToNext(work) {
    const idx  = work.findIndex((t) => t.id === _lastSelectedId);
    const next = work[idx + 1] || work[0];
    if (next && next.id !== _lastSelectedId) {
      _lastSelectedId = next.id;
      if (typeof renderMyWork === "function") renderMyWork(state.tasks);
    }
  }

  /* ---------------------------------------------------------------
     Keyboard shortcuts (active only on My Work view)
     --------------------------------------------------------------- */
  document.addEventListener("keydown", (e) => {
    if (state.workspaceView !== "my_work") return;
    if (e.target.matches("input, textarea, select, [contenteditable]")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const primaryBtn = document.querySelector(".focus-btn-primary[data-task-id]");
    const skipBtn    = document.querySelector("[data-focus-skip]");
    const returnBtn  = document.querySelector("[data-workbench-return]");

    if ((e.key === "ArrowUp" || e.key === "Enter") && primaryBtn) {
      e.preventDefault();
      if (primaryBtn.hasAttribute("data-focus-mark-built")) recordBuiltToday();
      primaryBtn.click();
    }
    if ((e.key === "s" || e.key === "S") && skipBtn) { e.preventDefault(); skipBtn.click(); }
    if ((e.key === "b" || e.key === "B") && returnBtn) { e.preventDefault(); returnBtn.click(); }
  });

  /* ---------------------------------------------------------------
     Click delegation
     --------------------------------------------------------------- */
  document.addEventListener("click", (e) => {
    // Select a task from UP NEXT (or any [data-workbench-task] that isn't a link/button inside)
    const wbRow = e.target.closest("[data-workbench-task]");
    if (wbRow && !e.target.closest("[data-status]") && !e.target.closest("a")) {
      e.preventDefault();
      _lastSelectedId = wbRow.dataset.workbenchTask;
      const isBuilder = (state.session?.primaryRole || "").toLowerCase().includes("builder");
      if (isBuilder) _focusMode = true; // clicking a task re-enters focus
      if (typeof renderMyWork === "function") renderMyWork(state.tasks);
      return;
    }

    // "Mark built" — record before the status handler fires
    if (e.target.closest("[data-focus-mark-built]")) {
      recordBuiltToday();
      return; // status fires via events.js [data-task-id][data-status] handler
    }

    // Skip for now
    const skipBtn = e.target.closest("[data-focus-skip]");
    if (skipBtn) {
      const { work } = myWorkGroups(state.tasks || []);
      skipToNext(work);
      return;
    }

    // Exit focus → stay on My Work, drop to queue list
    if (e.target.closest("[data-focus-exit]")) {
      _focusMode = false;
      if (typeof renderMyWork === "function") renderMyWork(state.tasks);
      return;
    }

    // AI check toggle (legacy detail panel)
    const aiButton = e.target.closest("[data-workbench-ai]");
    if (aiButton) { aiButton.nextElementSibling?.classList.toggle("is-visible"); return; }

    // Send back — show return note
    if (e.target.closest("[data-workbench-return]")) {
      document.querySelector(".workbench-return-note")?.classList.toggle("is-visible");
    }
  });

  /* ---------------------------------------------------------------
     Main render entry point
     --------------------------------------------------------------- */
  window.renderMyWork = function renderMyWorkWorkbench(tasks = []) {
    installMyWorkStyles();
    const safeTasks = Array.isArray(tasks) ? tasks.filter(isRenderableTask) : [];
    const { work } = myWorkGroups(safeTasks);

    const selected = (_lastSelectedId && work.find((t) => t.id === _lastSelectedId))
      || work.find(isRenderableTask)
      || null;
    if (selected) _lastSelectedId = selected.id;

    // Sidebar count chip
    if (els.myWorkCount) {
      const nBuild   = work.filter((t) => ["seo_done","needs_build"].includes(t.pageStatus)).length;
      const nVerify  = work.filter((t) => t.pageStatus === "page_built").length;
      const nBlocked = work.filter((t) => t.pageStatus === "needs_review").length;
      const parts = [];
      if (nBuild)   parts.push(`${nBuild} to build`);
      if (nVerify)  parts.push(`${nVerify} to verify`);
      if (nBlocked) parts.push(`${nBlocked} blocked`);
      els.myWorkCount.textContent = parts.length ? parts.join(" · ") : "All clear";
    }

    if (!els.myWorkList) return;

    if (!work.length) {
      els.myWorkList.className = "workbench-queue";
      const role = state.session?.primaryRole || "Builder";
      const msgs = {
        "Builder":    "Queue clear. Every page you touched today is one step closer to live.",
        "SEO Writer": "Nothing left to write today. Nice work — the builders are going to love this.",
        "AEO Writer": "AEO queue is clear. Dialed in.",
      };
      els.myWorkList.innerHTML = `<div class="workbench-empty-state"><p class="workbench-empty-icon">✓</p><p class="workbench-empty-msg">${msgs[role] || "All clear."}</p></div>`;
      if (els.builderDetailPanel) els.builderDetailPanel.classList.add("is-empty");
      return;
    }

    const isBuilder = (state.session?.primaryRole || "").toLowerCase().includes("builder");

    if (isBuilder && _focusMode) {
      els.myWorkPanel?.classList.add("is-focus-mode");
      els.myWorkList.className = "focus-hero-wrapper";
      els.myWorkList.innerHTML = renderFocusHero(selected, work);
      if (els.builderDetailPanel) els.builderDetailPanel.classList.add("is-empty");
    } else {
      // Writers, or builder who exited focus — show queue list + detail panel
      els.myWorkPanel?.classList.remove("is-focus-mode");
      els.myWorkList.className = "workbench-queue";
      const groups = [
        ["Ready to write",  "ready",   work.filter((t) => ["seo_done","needs_build"].includes(t.pageStatus))],
        ["Needs live check","verify",  work.filter((t) => t.pageStatus === "page_built")],
        ["Returned",        "blocked", work.filter((t) => t.pageStatus === "needs_review")],
      ];
      els.myWorkList.innerHTML = groups.map((g) => renderMyWorkSection(g, selected?.id)).join("");
      if (els.builderDetailPanel) els.builderDetailPanel.classList.remove("is-empty");
      renderBuilderDetail(selected);
    }
  };

  /* ---------------------------------------------------------------
     Writer queue helpers
     --------------------------------------------------------------- */
  function renderMyWorkSection([label, tone, tasks = []], selectedId) {
    const sectionTasks = tasks.filter(isRenderableTask);
    return `<section class="workbench-section"><div class="workbench-section-head"><span>${escapeHtml(label)}</span><span>${sectionTasks.length}</span></div>${sectionTasks.length ? sectionTasks.map((t) => renderMyWorkRow(t, tone, t.id === selectedId)).join("") : `<div class="empty">No tasks here.</div>`}</section>`;
  }

  function renderMyWorkRow(task, tone, selected) {
    if (!isRenderableTask(task)) return "";
    const dotClass = ["workbench-dot", tone === "verify" ? "is-verify" : "", tone === "blocked" ? "is-blocked" : "", tone === "ready" && task.aeoStatus !== "done" ? "is-dim" : ""].filter(Boolean).join(" ");
    const accentColor = task.accent || (tone === "verify" ? "var(--blue)" : tone === "blocked" ? "var(--red)" : "var(--amber)");
    return `<article class="workbench-row${selected ? " is-selected" : ""}" data-workbench-task="${escapeAttr(task.id)}" style="--row-accent:${accentColor}"><span class="${dotClass}"></span><div><span class="workbench-title">${escapeHtml(taskTitle(task))}</span><span class="workbench-meta">${escapeHtml(workbenchMeta(task, tone))}</span></div></article>`;
  }

  function workbenchMeta(task, tone) {
    const d = dealerShortName(task.dealer);
    if (tone === "verify")  return `${d} · Built ${relativeTime(task)} · ${aeoShort(task.aeoStatus)}`;
    if (tone === "blocked") return `${d} · Returned`;
    return `${d} · SEO ready ${relativeTime(task)} · ${aeoShort(task.aeoStatus)}`;
  }

  function aeoShort(status) {
    if (status === "done")        return "AEO complete";
    if (status === "in_progress") return "AEO in progress";
    if (status === "not_needed")  return "AEO not needed";
    return "AEO pending";
  }

  /* ---------------------------------------------------------------
     Builder detail panel (used by writer view + admin)
     --------------------------------------------------------------- */
  function checklist(task) {
    const seoDone = ["seo_done","needs_build","page_built","live","needs_review"].includes(task.pageStatus);
    const aeoDone = task.aeoStatus === "done" || task.aeoStatus === "not_needed";
    const built   = ["page_built","live"].includes(task.pageStatus);
    const live    = task.pageStatus === "live";
    return [
      ["SEO copy available",  seoDone, false],
      ["AEO review complete", aeoDone, false],
      ["Model page built",    built,   !built],
      ["Live URL verified",   live,    built && !live],
    ].map(([label, done, current]) =>
      `<div class="workbench-step${current ? " is-current" : ""}"><span class="workbench-check${done ? " is-done" : ""}">${done ? "OK" : ""}</span><span>${escapeHtml(label)}</span></div>`
    ).join("");
  }

  function workbenchActions(task) {
    const id = escapeAttr(task.id);
    if (task.pageStatus === "page_built")
      return `<button class="button button-secondary-action" type="button" data-status="needs_build" data-task-id="${id}">Revert</button><button class="button button-primary-action" type="button" data-status="live" data-task-id="${id}">Mark live ↑</button>`;
    if (task.pageStatus === "needs_review")
      return `<button class="button button-secondary-action" type="button" data-status="needs_seo" data-task-id="${id}">Return to SEO</button><button class="button button-primary-action" type="button" data-status="live" data-task-id="${id}">Keep live</button>`;
    if (task.pageStatus === "seo_done")
      return `<button class="button button-secondary-action" type="button" data-workbench-return>Send back</button><button class="button button-primary-action" type="button" data-status="needs_build" data-task-id="${id}">Start build →</button>`;
    return `<button class="button button-secondary-action" type="button" data-workbench-return>Send back</button><button class="button button-primary-action" type="button" data-status="page_built" data-task-id="${id}">Mark built ↑</button>`;
  }

  window.renderBuilderDetail = function renderBuilderDetailWorkbench(task) {
    if (!els.builderDetailPanel || !els.builderDetailContent) return;
    const selectedTask = isRenderableTask(task) ? task : null;
    els.builderDetailPanel.classList.toggle("is-empty", !selectedTask);
    if (!selectedTask) { els.builderDetailContent.innerHTML = ""; return; }
    els.builderDetailContent.className = "workbench-detail-content";
    const docUrl = (typeof seoDocUrl === "function") ? seoDocUrl(selectedTask) : null;
    els.builderDetailContent.innerHTML = `<p class="eyebrow">Task detail</p><h2>${escapeHtml(taskTitle(selectedTask))}</h2><p class="workbench-detail-subtitle">${escapeHtml(selectedTask.dealer)} · ${escapeHtml(statusLabels[selectedTask.pageStatus] || selectedTask.pageStatus)}</p><div class="selected-task-status">${statusPill(selectedTask.pageStatus)} ${signalPill(selectedTask.inventorySignal)} ${aeoPill(selectedTask.aeoStatus)}</div><section class="workbench-next-step"><span>Next step</span><strong>${escapeHtml(builderNextStep(selectedTask))}</strong><small>SEO finalized ${escapeHtml(relativeTime(selectedTask))} · Owner: ${escapeHtml(ownerBucket(selectedTask))}</small></section><nav class="workbench-resources" aria-label="Task resources">${docUrl ? `<a class="workbench-resource-primary" href="${escapeAttr(docUrl)}" target="_blank" rel="noreferrer">Open SEO doc</a>` : `<span class="workbench-resource-primary is-disabled">No SEO doc yet</span>`}<div class="workbench-resource-row"><a class="workbench-resource-link" href="#">Open CMS</a><a class="workbench-resource-link" href="${escapeAttr(modelInfoUrl(selectedTask))}" target="_blank" rel="noreferrer">View reference</a></div></nav><section class="workbench-checklist" aria-label="Task progress">${checklist(selectedTask)}</section><section class="workbench-ai"><button class="workbench-ai-pill" type="button" data-workbench-ai>Check handoff</button><div class="workbench-ai-result"><span>Handoff check</span><div>7 of 8 expected sections found</div><div>Missing: meta description</div><div>Present: H1, hero copy, CTA, local dealership mention</div></div></section><section class="workbench-return-note"><label for="workbenchReturnNote">What needs to be fixed?</label><textarea id="workbenchReturnNote" placeholder="Example: missing trim-level section and local phone number"></textarea></section><footer class="workbench-detail-actions">${workbenchActions(selectedTask)}</footer>`;
  };

  installMyWorkStyles();
  window.__fuszMyWorkWorkbenchLoaded = true;
})();

(function () {
  let _lastSelectedId = null;
  let _focusMode = true;

  function currentMyWorkRole() {
    const role = (state.session?.primaryRole || "").toLowerCase();
    if (role.includes("seo")) return "seo";
    if (role.includes("aeo")) return "aeo";
    return "builder";
  }

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

  /* Builder task grouping (original, unchanged) */
  function myWorkGroups(tasks = []) {
    const safeTasks = Array.isArray(tasks) ? tasks.filter(isRenderableTask) : [];
    const work = safeTasks
      .filter((t) => ["seo_done","needs_build","page_built","needs_review"].includes(t.pageStatus))
      .sort((a, b) => workPriority(a) - workPriority(b));
    return { work };
  }

  /* Role-aware task grouping */
  function myWorkGroupsForRole(tasks, role) {
    const safe = Array.isArray(tasks) ? tasks.filter(isRenderableTask) : [];
    if (role === "seo") {
      const priority = { needs_review: 0, seo_in_progress: 1, needs_seo: 2 };
      const work = safe
        .filter((t) => ["needs_seo","seo_in_progress","needs_review"].includes(t.pageStatus))
        .sort((a, b) => (priority[a.pageStatus] ?? 9) - (priority[b.pageStatus] ?? 9));
      return { work };
    }
    if (role === "aeo") {
      const work = safe
        .filter((t) =>
          !["done","not_needed"].includes(t.aeoStatus) &&
          !["live","ignored","snoozed"].includes(t.pageStatus)
        )
        .sort((a, b) => {
          const p = { needs_review: 0, in_progress: 1, not_started: 2 };
          return (p[a.aeoStatus] ?? 3) - (p[b.aeoStatus] ?? 3);
        });
      return { work };
    }
    return myWorkGroups(tasks);
  }

  /* Focus CTA — builder */
  function focusCta(task) {
    if (task.pageStatus === "page_built")   return ["Mark live ↑",   "live"];
    if (task.pageStatus === "seo_done")     return ["Start build →", "needs_build"];
    if (task.pageStatus === "needs_build")  return ["Mark built ↑",  "page_built"];
    if (task.pageStatus === "needs_review") return ["Keep live",      "live"];
    return ["Review", "live"];
  }

  /* Focus CTA — SEO Writer */
  function focusCtaSeo(task) {
    if (task.pageStatus === "seo_in_progress") return ["Mark SEO done ↑",    "seo_done"];
    if (task.pageStatus === "needs_review")    return ["Resolve & resubmit", "seo_in_progress"];
    return ["Start writing →", "seo_in_progress"];
  }

  /* Focus CTA — AEO Writer */
  function focusCtaAeo(task) {
    if (task.aeoStatus === "in_progress") return ["Mark AEO done ↑", "done"];
    return ["Start AEO →", "in_progress"];
  }

  /* Checklist — builder */
  function focusChecklist(task) {
    const seoDone     = ["seo_done","needs_build","page_built","live","needs_review"].includes(task.pageStatus);
    const buildDone   = ["page_built","live"].includes(task.pageStatus);
    const buildActive = ["seo_done","needs_build"].includes(task.pageStatus);
    const verifyDone   = task.pageStatus === "live";
    const verifyActive = task.pageStatus === "page_built";
    const docUrl = (typeof seoDocUrl === "function") ? seoDocUrl(task) : null;
    return [
      {
        label: "SEO copy available", done: seoDone, active: false,
        link: docUrl ? `<a class="focus-check-link" href="${escapeAttr(docUrl)}" target="_blank" rel="noreferrer">Open doc</a>` : "",
      },
      {
        label: "Build the model page", done: buildDone, active: buildActive,
        link: (() => {
          const base = (task.inventoryUrl || "").match(/^(https?:\/\/[^\/]+)/);
          const cmsUrl = base ? `${base[1]}/wp/wp-admin/` : null;
          return cmsUrl ? `<a class="focus-check-link" href="${escapeAttr(cmsUrl)}" target="_blank" rel="noreferrer">Open CMS</a>` : "";
        })(),
      },
      {
        label: "Verify live URL", done: verifyDone, active: verifyActive,
        link: task.inventoryUrl ? `<a class="focus-check-link" href="${escapeAttr(task.inventoryUrl)}" target="_blank" rel="noreferrer">Open page</a>` : "",
      },
    ].map(({ label, done, active, link }) =>
      `<div class="focus-check-row${done ? " is-done" : active ? " is-active" : ""}">
        <span class="focus-check-icon">${done ? "✓" : ""}</span>
        <span class="focus-check-label">${escapeHtml(label)}</span>
        ${link}
      </div>`
    ).join("");
  }

  /* Checklist — SEO Writer */
  function focusChecklistSeo(task) {
    const started = ["seo_in_progress","seo_done","needs_build","page_built","live"].includes(task.pageStatus);
    const done    = ["seo_done","needs_build","page_built","live"].includes(task.pageStatus);
    return [
      { label: "Open model brief",        done: started, active: !started },
      { label: "Write SEO copy",          done: done,    active: started && !done },
      { label: "Mark done → builder",     done: done,    active: false },
    ].map(({ label, done: d, active }) =>
      `<div class="focus-check-row${d ? " is-done" : active ? " is-active" : ""}">
        <span class="focus-check-icon">${d ? "✓" : ""}</span>
        <span class="focus-check-label">${escapeHtml(label)}</span>
      </div>`
    ).join("");
  }

  /* Checklist — AEO Writer */
  function focusChecklistAeo(task) {
    const started = ["in_progress","done"].includes(task.aeoStatus);
    const done    = task.aeoStatus === "done";
    return [
      { label: "Review model page",   done: started, active: !started },
      { label: "Complete AEO layer",  done: done,    active: started && !done },
      { label: "Mark AEO done",       done: done,    active: false },
    ].map(({ label, done: d, active }) =>
      `<div class="focus-check-row${d ? " is-done" : active ? " is-active" : ""}">
        <span class="focus-check-icon">${d ? "✓" : ""}</span>
        <span class="focus-check-label">${escapeHtml(label)}</span>
      </div>`
    ).join("");
  }

  /* UP NEXT list */
  function upNextStatus(task) {
    if (task.pageStatus === "page_built")      return `Live check`;
    if (task.pageStatus === "needs_review")    return `Returned`;
    if (task.pageStatus === "seo_in_progress") return `In progress`;
    if (task.pageStatus === "needs_seo")       return `Needs copy`;
    return `SEO ready`;
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

  /* Focus hero — builder (unchanged) */
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
      <p class="focus-eyebrow"><span class="focus-eyebrow-dot"></span>YOUR NEXT ACTION<span class="focus-eyebrow-sep">·</span>${position} OF ${remaining} REMAINING</p>
      <h2 class="focus-task-title">${escapeHtml(taskTitle(task))}</h2>
      <p class="focus-task-meta">${escapeHtml(dealerShortName(task.dealer))} · SEO finalized ${escapeHtml(relativeTime(task))} · Owner: ${escapeHtml(ownerBucket(task))}</p>
      <div class="focus-checklist">${focusChecklist(task)}</div>
      <div class="focus-actions">
        <button class="focus-btn focus-btn-ghost" type="button" data-workbench-return>Send back</button>
        <button class="focus-btn focus-btn-ghost" type="button" data-focus-skip>Skip for now</button>
        <button class="focus-btn focus-btn-primary" type="button" data-status="${escapeAttr(ctaStatus)}" data-task-id="${escapeAttr(task.id)}" ${isMarkBuilt ? "data-focus-mark-built" : ""}>${escapeHtml(ctaLabel)}</button>
      </div>
      <p class="focus-shortcuts">⏎ mark built &nbsp;·&nbsp; S skip &nbsp;·&nbsp; B send back</p>
    </div>
    ${renderUpNext(work, task.id)}
  </div>
</div>`;
  }

  /* Focus hero — SEO Writer */
  function renderSeoFocusHero(task, work) {
    if (!task) return "";
    const [ctaLabel, ctaStatus] = focusCtaSeo(task);
    const remaining = work.length;
    const position  = work.findIndex((t) => t.id === task.id) + 1;
    return `
<div class="focus-hero">
  <header class="focus-hero-header">
    <span class="focus-hero-wordmark">My Work <span class="focus-mode-tag">Focus</span></span>
    <div class="focus-hero-progress">
      <span class="focus-progress-text">${remaining} to write</span>
      <div class="focus-progress-track"><div class="focus-progress-fill" style="width:${Math.max(5, 100 - remaining * 8)}%"></div></div>
    </div>
    <button class="focus-exit-btn" type="button" data-focus-exit>Exit focus</button>
  </header>
  <div class="focus-hero-content">
    <div class="focus-hero-body" data-workbench-task="${escapeAttr(task.id)}">
      <p class="focus-eyebrow"><span class="focus-eyebrow-dot"></span>YOUR NEXT ACTION<span class="focus-eyebrow-sep">·</span>${position} OF ${remaining} REMAINING</p>
      <h2 class="focus-task-title">${escapeHtml(taskTitle(task))}</h2>
      <p class="focus-task-meta">${escapeHtml(dealerShortName(task.dealer))} · ${escapeHtml(statusLabels[task.pageStatus] || task.pageStatus)}</p>
      <div class="focus-checklist">${focusChecklistSeo(task)}</div>
      <div class="focus-actions">
        <button class="focus-btn focus-btn-ghost" type="button" data-focus-skip>Skip for now</button>
        <button class="focus-btn focus-btn-primary" type="button" data-status="${escapeAttr(ctaStatus)}" data-task-id="${escapeAttr(task.id)}">${escapeHtml(ctaLabel)}</button>
      </div>
      <p class="focus-shortcuts">⏎ advance &nbsp;·&nbsp; S skip</p>
    </div>
    ${renderUpNext(work, task.id)}
  </div>
</div>`;
  }

  /* Focus hero — AEO Writer */
  function renderAeoFocusHero(task, work) {
    if (!task) return "";
    const [ctaLabel, ctaStatus] = focusCtaAeo(task);
    const remaining = work.length;
    const position  = work.findIndex((t) => t.id === task.id) + 1;
    return `
<div class="focus-hero">
  <header class="focus-hero-header">
    <span class="focus-hero-wordmark">My Work <span class="focus-mode-tag">Focus</span></span>
    <div class="focus-hero-progress">
      <span class="focus-progress-text">${remaining} AEO tasks remaining</span>
      <div class="focus-progress-track"><div class="focus-progress-fill" style="width:${Math.max(5, 100 - remaining * 8)}%"></div></div>
    </div>
    <button class="focus-exit-btn" type="button" data-focus-exit>Exit focus</button>
  </header>
  <div class="focus-hero-content">
    <div class="focus-hero-body" data-workbench-task="${escapeAttr(task.id)}">
      <p class="focus-eyebrow"><span class="focus-eyebrow-dot"></span>YOUR NEXT ACTION<span class="focus-eyebrow-sep">·</span>${position} OF ${remaining} REMAINING</p>
      <h2 class="focus-task-title">${escapeHtml(taskTitle(task))}</h2>
      <p class="focus-task-meta">${escapeHtml(dealerShortName(task.dealer))} · AEO ${escapeHtml(task.aeoStatus || "pending")}</p>
      <div class="focus-checklist">${focusChecklistAeo(task)}</div>
      <div class="focus-actions">
        <button class="focus-btn focus-btn-ghost" type="button" data-focus-skip>Skip for now</button>
        <button class="focus-btn focus-btn-primary" type="button" data-aeo-status="${escapeAttr(ctaStatus)}" data-task-id="${escapeAttr(task.id)}">${escapeHtml(ctaLabel)}</button>
      </div>
      <p class="focus-shortcuts">⏎ advance &nbsp;·&nbsp; S skip</p>
    </div>
    ${renderUpNext(work, task.id)}
  </div>
</div>`;
  }

  /* Skip */
  function skipToNext(work) {
    const idx  = work.findIndex((t) => t.id === _lastSelectedId);
    const next = work[idx + 1] || work[0];
    if (next && next.id !== _lastSelectedId) {
      _lastSelectedId = next.id;
      if (typeof renderMyWork === "function") renderMyWork(state.tasks);
    }
  }

  /* Keyboard shortcuts */
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

  /* Click delegation */
  document.addEventListener("click", (e) => {
    /* Brand accordion toggle */
    const brandToggle = e.target.closest("[data-wb-brand-toggle]");
    if (brandToggle) {
      const key = brandToggle.dataset.wbBrandToggle;
      const group = brandToggle.closest(".wb-brand-group");
      if (!group) return;
      const isOpen = !group.classList.contains("is-collapsed");
      const rows = group.querySelector(".wb-brand-rows");
      const chevron = brandToggle.querySelector(".wb-brand-chevron");
      if (isOpen) {
        group.classList.add("is-collapsed");
        if (rows) rows.hidden = true;
        if (chevron) chevron.textContent = "▸";
        sessionStorage.setItem(key, "closed");
      } else {
        group.classList.remove("is-collapsed");
        if (rows) rows.hidden = false;
        if (chevron) chevron.textContent = "▾";
        sessionStorage.removeItem(key);
      }
      return;
    }
    const wbRow = e.target.closest("[data-workbench-task]");
    if (wbRow && !e.target.closest("[data-status]") && !e.target.closest("[data-aeo-status]") && !e.target.closest("a")) {
      e.preventDefault();
      _lastSelectedId = wbRow.dataset.workbenchTask;
      _focusMode = true;
      if (typeof renderMyWork === "function") renderMyWork(state.tasks);
      return;
    }
    if (e.target.closest("[data-focus-mark-built]")) { recordBuiltToday(); return; }
    const skipBtn = e.target.closest("[data-focus-skip]");
    if (skipBtn) {
      const { work } = myWorkGroupsForRole(state.tasks || [], currentMyWorkRole());
      skipToNext(work);
      return;
    }
    if (e.target.closest("[data-focus-enter]")) { _focusMode = true; if (typeof renderMyWork === "function") renderMyWork(state.tasks); return; }
    if (e.target.closest("[data-focus-exit]"))  { _focusMode = false; if (typeof renderMyWork === "function") renderMyWork(state.tasks); return; }
    const aiButton = e.target.closest("[data-workbench-ai]");
    if (aiButton) { aiButton.nextElementSibling?.classList.toggle("is-visible"); return; }
    if (e.target.closest("[data-workbench-return]")) { document.querySelector(".workbench-return-note")?.classList.toggle("is-visible"); }
  });

  /* ---------------------------------------------------------------
     Main render entry point
     --------------------------------------------------------------- */
  window.renderMyWork = function renderMyWorkWorkbench(tasks = []) {
    installMyWorkStyles();
    const role = currentMyWorkRole();
    const safeTasks = Array.isArray(tasks) ? tasks.filter(isRenderableTask) : [];

    /* Update queue title */
    const queueTitle = document.getElementById("myWorkQueueTitle");
    if (queueTitle) {
      if (role === "seo")      queueTitle.textContent = "My write queue";
      else if (role === "aeo") queueTitle.textContent = "My AEO queue";
      else                     queueTitle.textContent = "My build queue";
    }
    const { work } = myWorkGroupsForRole(safeTasks, role);

    const selected = (_lastSelectedId && work.find((t) => t.id === _lastSelectedId))
      || work.find(isRenderableTask) || null;
    if (selected) _lastSelectedId = selected.id;

    /* Count summary — role-aware */
    if (els.myWorkCount) {
      if (role === "seo") {
        const nNeeds = work.filter((t) => t.pageStatus === "needs_seo").length;
        const nProg  = work.filter((t) => t.pageStatus === "seo_in_progress").length;
        const nRet   = work.filter((t) => t.pageStatus === "needs_review").length;
        const parts  = [];
        if (nNeeds) parts.push(`${nNeeds} to write`);
        if (nProg)  parts.push(`${nProg} in progress`);
        if (nRet)   parts.push(`${nRet} returned`);
        els.myWorkCount.textContent = parts.length ? parts.join(" · ") : "All clear";
      } else if (role === "aeo") {
        const nPend = work.filter((t) => t.aeoStatus !== "in_progress").length;
        const nProg = work.filter((t) => t.aeoStatus === "in_progress").length;
        const parts = [];
        if (nPend) parts.push(`${nPend} to do`);
        if (nProg) parts.push(`${nProg} in progress`);
        els.myWorkCount.textContent = parts.length ? parts.join(" · ") : "All clear";
      } else {
        const nBuild   = work.filter((t) => ["seo_done","needs_build"].includes(t.pageStatus)).length;
        const nVerify  = work.filter((t) => t.pageStatus === "page_built").length;
        const nBlocked = work.filter((t) => t.pageStatus === "needs_review").length;
        const parts = [];
        if (nBuild)   parts.push(`${nBuild} to build`);
        if (nVerify)  parts.push(`${nVerify} to verify`);
        if (nBlocked) parts.push(`${nBlocked} blocked`);
        els.myWorkCount.textContent = parts.length ? parts.join(" · ") : "All clear";
      }
    }

    /* Focus entry button — all roles */
    let focusEntryBtn = document.getElementById("focusEntryBtn");
    if (work.length) {
      if (!focusEntryBtn) {
        focusEntryBtn = document.createElement("button");
        focusEntryBtn.id = "focusEntryBtn";
        focusEntryBtn.className = "focus-entry-btn";
        focusEntryBtn.setAttribute("data-focus-enter", "");
        focusEntryBtn.textContent = "Focus →";
        els.myWorkCount?.parentElement?.appendChild(focusEntryBtn);
      }
      focusEntryBtn.style.display = _focusMode ? "none" : "";
    } else if (focusEntryBtn) {
      focusEntryBtn.style.display = "none";
    }

    if (!els.myWorkList) return;

    /* Empty state */
    if (!work.length) {
      els.myWorkList.className = "workbench-queue";
      const msgs = { builder: "Queue clear. Every page you touched today is one step closer to live.", seo: "Nothing left to write today. Nice work — the builders are going to love this.", aeo: "AEO queue is clear. Dialed in." };
      els.myWorkList.innerHTML = `<div class="workbench-empty-state"><p class="workbench-empty-icon">✓</p><p class="workbench-empty-msg">${msgs[role] || "All clear."}</p></div>`;
      if (els.builderDetailPanel) els.builderDetailPanel.classList.add("is-empty");
      return;
    }

    /* Focus mode — all roles */
    if (_focusMode) {
      els.myWorkPanel?.classList.add("is-focus-mode");
      els.myWorkList.className = "focus-hero-wrapper";
      if (role === "seo")        els.myWorkList.innerHTML = renderSeoFocusHero(selected, work);
      else if (role === "aeo")   els.myWorkList.innerHTML = renderAeoFocusHero(selected, work);
      else                       els.myWorkList.innerHTML = renderFocusHero(selected, work);
      if (els.builderDetailPanel) els.builderDetailPanel.classList.add("is-empty");
    } else {
      /* Queue list + detail panel */
      els.myWorkPanel?.classList.remove("is-focus-mode");
      els.myWorkList.className = "workbench-queue";
      let groups;
      if (role === "seo") {
        groups = [
          ["Needs copy",  "seo-needs",    work.filter((t) => t.pageStatus === "needs_seo")],
          ["In progress", "seo-progress", work.filter((t) => t.pageStatus === "seo_in_progress")],
          ["Returned",    "blocked",      work.filter((t) => t.pageStatus === "needs_review")],
        ];
      } else if (role === "aeo") {
        groups = [
          ["Needs AEO",   "aeo-needs",    work.filter((t) => t.aeoStatus !== "in_progress" && t.pageStatus !== "needs_review")],
          ["In progress", "aeo-progress", work.filter((t) => t.aeoStatus === "in_progress")],
          ["Returned",    "blocked",      work.filter((t) => t.pageStatus === "needs_review")],
        ];
      } else {
        groups = [
          ["Ready to build",   "ready",  work.filter((t) => ["seo_done","needs_build"].includes(t.pageStatus))],
          ["Needs live check", "verify", work.filter((t) => t.pageStatus === "page_built")],
          ["Returned",         "blocked",work.filter((t) => t.pageStatus === "needs_review")],
        ];
      }
      els.myWorkList.innerHTML = groups.map((g) => renderMyWorkBrandSection(g, selected?.id)).join("");
      if (els.builderDetailPanel) els.builderDetailPanel.classList.remove("is-empty");
      if (role === "seo")       renderSeoDetail(selected);
      else if (role === "aeo")  renderAeoDetail(selected);
      else                      renderBuilderDetail(selected);
    }
  };

  /* Queue section + row helpers */
  function renderMyWorkSection([label, tone, tasks = []], selectedId) {
    const sectionTasks = tasks.filter(isRenderableTask);
    return `<section class="workbench-section"><div class="workbench-section-head"><span>${escapeHtml(label)}</span><span>${sectionTasks.length}</span></div>${sectionTasks.length ? sectionTasks.map((t) => renderMyWorkRow(t, tone, t.id === selectedId)).join("") : `<div class="empty">No tasks here.</div>`}</section>`;
  }

  /* Brand accordion section — used for SEO / AEO (and builder) queues */
  function taskBrand(task) { return task.make || "Other"; }

  function renderMyWorkBrandSection([label, tone, tasks = []], selectedId) {
    const sectionTasks = tasks.filter(isRenderableTask);
    if (!sectionTasks.length) return "";
    const brandMap = {};
    sectionTasks.forEach((t) => {
      const b = taskBrand(t);
      if (!brandMap[b]) brandMap[b] = [];
      brandMap[b].push(t);
    });
    const brands = Object.keys(brandMap).sort();
    const brandHtml = brands.map((brand) => {
      const bTasks = brandMap[brand];
      const key = `wb-brand-${tone}-${encodeURIComponent(brand)}`;
      const hasSelected = bTasks.some((t) => t.id === selectedId);
      const isOpen = hasSelected || sessionStorage.getItem(key) !== "closed";
      return `<div class="wb-brand-group${isOpen ? "" : " is-collapsed"}" data-wb-brand-key="${escapeAttr(key)}">
        <button class="wb-brand-toggle" type="button" data-wb-brand-toggle="${escapeAttr(key)}">
          <span class="wb-brand-chevron">${isOpen ? "▾" : "▸"}</span>
          <span class="wb-brand-name">${escapeHtml(brand)}</span>
          <span class="wb-brand-count">${bTasks.length}</span>
        </button>
        <div class="wb-brand-rows"${isOpen ? "" : " hidden"}>
          ${bTasks.map((t) => renderMyWorkRow(t, tone, t.id === selectedId)).join("")}
        </div>
      </div>`;
    }).join("");
    return `<section class="workbench-section">
      <div class="workbench-section-head"><span>${escapeHtml(label)}</span><span>${sectionTasks.length}</span></div>
      ${brandHtml}
    </section>`;
  }

  function renderMyWorkRow(task, tone, selected) {
    if (!isRenderableTask(task)) return "";
    const isBlocked = tone === "blocked";
    const isVerify  = tone === "verify";
    const dotClass = ["workbench-dot", isVerify ? "is-verify" : "", isBlocked ? "is-blocked" : ""].filter(Boolean).join(" ");
    const accentColor = task.accent || (isVerify ? "var(--blue)" : isBlocked ? "var(--red)" : "var(--amber)");
    return `<article class="workbench-row${selected ? " is-selected" : ""}" data-workbench-task="${escapeAttr(task.id)}" style="--row-accent:${accentColor}"><span class="${dotClass}"></span><div><span class="workbench-title">${escapeHtml(taskTitle(task))}</span><span class="workbench-meta">${escapeHtml(workbenchMeta(task, tone))}</span></div></article>`;
  }

  function workbenchMeta(task, tone) {
    const d = dealerShortName(task.dealer);
    if (tone === "verify")       return `${d} · Built ${relativeTime(task)}`;
    if (tone === "blocked")      return `${d} · Returned`;
    if (tone === "seo-progress") return `${d} · In progress`;
    if (tone === "seo-needs")    return `${d} · Needs copy`;
    if (tone === "aeo-progress") return `${d} · AEO in progress`;
    if (tone === "aeo-needs")    return `${d} · Needs AEO`;
    return `${d} · SEO ready ${relativeTime(task)}`;
  }

  function aeoShort(status) {
    if (status === "done")        return "AEO complete";
    if (status === "in_progress") return "AEO in progress";
    if (status === "not_needed")  return "AEO not needed";
    return "AEO pending";
  }

  /* Builder detail panel (unchanged) */
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
    els.builderDetailContent.innerHTML = `<p class="eyebrow">Task detail</p><h2>${escapeHtml(taskTitle(selectedTask))}</h2><p class="workbench-detail-subtitle">${escapeHtml(selectedTask.dealer)} · ${escapeHtml(statusLabels[selectedTask.pageStatus] || selectedTask.pageStatus)}</p><div class="selected-task-status">${statusPill(selectedTask.pageStatus)} ${signalPill(selectedTask.inventorySignal)}</div><section class="workbench-next-step"><span>Next step</span><strong>${escapeHtml(builderNextStep(selectedTask))}</strong><small>SEO finalized ${escapeHtml(relativeTime(selectedTask))} · Owner: ${escapeHtml(ownerBucket(selectedTask))}</small></section><nav class="workbench-resources" aria-label="Task resources">${docUrl ? `<a class="workbench-resource-primary" href="${escapeAttr(docUrl)}" target="_blank" rel="noreferrer">Open SEO doc</a>` : `<span class="workbench-resource-primary is-disabled">No SEO doc yet</span>`}<div class="workbench-resource-row"><a class="workbench-resource-link" href="#">Open CMS</a><a class="workbench-resource-link" href="${escapeAttr(modelInfoUrl(selectedTask))}" target="_blank" rel="noreferrer">View reference</a></div></nav><section class="workbench-checklist" aria-label="Task progress">${checklist(selectedTask)}</section><section class="workbench-ai"><button class="workbench-ai-pill" type="button" data-workbench-ai>Check handoff</button><div class="workbench-ai-result"><span>Handoff check</span><div>7 of 8 expected sections found</div><div>Missing: meta description</div><div>Present: H1, hero copy, CTA, local dealership mention</div></div></section><section class="workbench-return-note"><label for="workbenchReturnNote">What needs to be fixed?</label><textarea id="workbenchReturnNote" placeholder="Example: missing trim-level section and local phone number"></textarea></section><footer class="workbench-detail-actions">${workbenchActions(selectedTask)}</footer>`;
  };

  /* SEO Writer detail panel */
  function seoDetailActions(task) {
    const id = escapeAttr(task.id);
    if (task.pageStatus === "seo_in_progress")
      return `<button class="button button-secondary-action" type="button" data-status="needs_seo" data-task-id="${id}">Revert to draft</button><button class="button button-primary-action" type="button" data-status="seo_done" data-task-id="${id}">Mark SEO done ↑</button>`;
    if (task.pageStatus === "needs_review")
      return `<button class="button button-primary-action" type="button" data-status="seo_in_progress" data-task-id="${id}">Resolve &amp; resubmit</button>`;
    return `<button class="button button-primary-action" type="button" data-status="seo_in_progress" data-task-id="${id}">Start writing →</button>`;
  }

  function renderSeoDetail(task) {
    if (!els.builderDetailPanel || !els.builderDetailContent) return;
    const t = isRenderableTask(task) ? task : null;
    els.builderDetailPanel.classList.toggle("is-empty", !t);
    if (!t) { els.builderDetailContent.innerHTML = ""; return; }
    els.builderDetailContent.className = "workbench-detail-content";
    const started = ["seo_in_progress","seo_done","needs_build","page_built","live"].includes(t.pageStatus);
    const done    = ["seo_done","needs_build","page_built","live"].includes(t.pageStatus);
    els.builderDetailContent.innerHTML = `
      <p class="eyebrow">SEO task</p>
      <h2>${escapeHtml(taskTitle(t))}</h2>
      <p class="workbench-detail-subtitle">${escapeHtml(t.dealer)} · ${escapeHtml(statusLabels[t.pageStatus] || t.pageStatus)}</p>
      <div class="selected-task-status">${statusPill(t.pageStatus)} ${signalPill(t.inventorySignal)}</div>
      <section class="workbench-checklist" aria-label="SEO progress">
        <div class="workbench-step${!started ? " is-current" : ""}">
          <span class="workbench-check${started ? " is-done" : ""}">${started ? "OK" : ""}</span>
          <span>Start SEO copy</span>
        </div>
        <div class="workbench-step${started && !done ? " is-current" : ""}">
          <span class="workbench-check${done ? " is-done" : ""}">${done ? "OK" : ""}</span>
          <span>Mark SEO done → builder</span>
        </div>
      </section>
      <footer class="workbench-detail-actions">${seoDetailActions(t)}</footer>`;
  }

  /* AEO Writer detail panel */
  function aeoDetailActions(task) {
    const id = escapeAttr(task.id);
    if (task.aeoStatus === "in_progress")
      return `<button class="button button-secondary-action" type="button" data-aeo-status="not_started" data-task-id="${id}">Revert</button><button class="button button-primary-action" type="button" data-aeo-status="done" data-task-id="${id}">Mark AEO done ↑</button>`;
    return `<button class="button button-primary-action" type="button" data-aeo-status="in_progress" data-task-id="${id}">Start AEO →</button>`;
  }

  function renderAeoDetail(task) {
    if (!els.builderDetailPanel || !els.builderDetailContent) return;
    const t = isRenderableTask(task) ? task : null;
    els.builderDetailPanel.classList.toggle("is-empty", !t);
    if (!t) { els.builderDetailContent.innerHTML = ""; return; }
    els.builderDetailContent.className = "workbench-detail-content";
    const started = ["in_progress","done"].includes(t.aeoStatus);
    const done    = t.aeoStatus === "done";
    els.builderDetailContent.innerHTML = `
      <p class="eyebrow">AEO task</p>
      <h2>${escapeHtml(taskTitle(t))}</h2>
      <p class="workbench-detail-subtitle">${escapeHtml(t.dealer)} · AEO ${escapeHtml(t.aeoStatus || "pending")}</p>
      <div class="selected-task-status">${signalPill(t.inventorySignal)} ${aeoPill(t.aeoStatus)}</div>
      <section class="workbench-checklist" aria-label="AEO progress">
        <div class="workbench-step${!started ? " is-current" : ""}">
          <span class="workbench-check${started ? " is-done" : ""}">${started ? "OK" : ""}</span>
          <span>Start AEO layer</span>
        </div>
        <div class="workbench-step${started && !done ? " is-current" : ""}">
          <span class="workbench-check${done ? " is-done" : ""}">${done ? "OK" : ""}</span>
          <span>Mark AEO complete</span>
        </div>
      </section>
      <footer class="workbench-detail-actions">${aeoDetailActions(t)}</footer>`;
  }

  installMyWorkStyles();
  window.__fuszMyWorkWorkbenchLoaded = true;
})();

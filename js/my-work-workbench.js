(function () {
  let _lastSelectedId = null; // persists selected task across re-renders

  function installMyWorkStyles() { /* styles moved to css/workbench.css */ }

  function isRenderableTask(task) {
    return Boolean(task && task.id && task.pageStatus);
  }

  function myWorkGroups(tasks = []) {
    const safeTasks = Array.isArray(tasks) ? tasks.filter(isRenderableTask) : [];
    const work = safeTasks
      .filter((task) => ["seo_done", "needs_build", "page_built", "needs_review"].includes(task.pageStatus))
      .sort((a, b) => workPriority(a) - workPriority(b));
    return {
      work,
      groups: [
        ["Ready to build", "ready", work.filter((task) => ["seo_done", "needs_build"].includes(task.pageStatus))],
        ["Needs live check", "verify", work.filter((task) => task.pageStatus === "page_built")],
        ["Returned or blocked", "blocked", work.filter((task) => task.pageStatus === "needs_review")],
      ],
    };
  }


  function focusCta(task) {
    if (task.pageStatus === "page_built") return ["Mark live ↑", "live"];
    if (task.pageStatus === "seo_done") return ["Start build →", "needs_build"];
    if (task.pageStatus === "needs_build") return ["Mark built ↑", "page_built"];
    if (task.pageStatus === "needs_review") return ["Keep live", "live"];
    return ["Review", "live"];
  }

  function renderFocusCard(task) {
    if (!task) return "";
    const step = builderNextStep(task);
    const [ctaLabel, ctaStatus] = focusCta(task);
    return `<div class="workbench-focus" data-workbench-task="${escapeAttr(task.id)}">
      <div class="workbench-focus-eyebrow">Your next action</div>
      <div class="workbench-focus-title">${escapeHtml(taskTitle(task))}</div>
      <div class="workbench-focus-step">${escapeHtml(step)}</div>
      <div class="workbench-focus-bar">
        <button class="workbench-focus-cta" type="button" data-status="${escapeAttr(ctaStatus)}" data-task-id="${escapeAttr(task.id)}">${escapeHtml(ctaLabel)}</button>
        ${(typeof seoDocUrl==="function"&&seoDocUrl(task))?`<a class="workbench-focus-ghost" href="${escapeAttr(seoDocUrl(task))}" target="_blank" rel="noreferrer">Open SEO doc</a>`:`<span class="workbench-focus-ghost is-disabled">No SEO doc yet</span>`}
      </div>
    </div>`;
  }

  function renderMyWorkSection([label, tone, tasks = []], selectedId) {
    const sectionTasks = tasks.filter(isRenderableTask);
    return `<section class="workbench-section"><div class="workbench-section-head"><span>${escapeHtml(label)}</span><span>${sectionTasks.length}</span></div>${sectionTasks.length ? sectionTasks.map((task) => renderMyWorkRow(task, tone, task.id === selectedId)).join("") : `<div class="empty">No tasks here.</div>`}</section>`;
  }

  function renderMyWorkRow(task, tone, selected) {
    if (!isRenderableTask(task)) return "";
    const dotClass = ["workbench-dot", tone === "verify" ? "is-verify" : "", tone === "blocked" ? "is-blocked" : "", tone === "ready" && task.aeoStatus !== "done" ? "is-dim" : ""].filter(Boolean).join(" ");
    const accentColor = task.accent || (tone === "verify" ? "var(--blue)" : tone === "blocked" ? "var(--red)" : "var(--amber)");
    return `<article class="workbench-row${selected ? " is-selected" : ""}" data-workbench-task="${escapeAttr(task.id)}" style="--row-accent:${accentColor}"><span class="${dotClass}"></span><div><span class="workbench-title">${escapeHtml(taskTitle(task))}</span><span class="workbench-meta">${escapeHtml(workbenchMeta(task, tone))}</span></div></article>`;
  }

  function workbenchMeta(task, tone) {
    const dealer = dealerShortName(task.dealer);
    if (tone === "verify") return `${dealer} - Built ${relativeTime(task)} - ${aeoShort(task.aeoStatus)}`;
    if (tone === "blocked") return `${dealer} - ${task.pageStatus === "needs_review" ? "Returned" : "Blocked"} - ${blockerReason(task)}`;
    return `${dealer} - SEO ready ${relativeTime(task)} - ${aeoShort(task.aeoStatus)}`;
  }

  function dealerShortName(dealer) {
    const source = state.sources?.find((item) => item.dealer === dealer);
    return source?.shortName || String(dealer || "Dealer").replace("Lou Fusz ", "");
  }

  function relativeTime(task) {
    const title = taskTitle(task).toLowerCase();
    if (title.includes("cx-50")) return task.pageStatus === "page_built" ? "35m ago" : "4h ago";
    if (title.includes("telluride")) return "6h ago";
    if (title.includes("1500")) return "18h ago";
    return "2h ago";
  }

  function aeoShort(status) {
    if (status === "done") return "AEO complete";
    if (status === "in_progress") return "AEO in progress";
    if (status === "not_needed") return "AEO not needed";
    return "AEO pending";
  }

  function blockerReason(task) {
    const title = taskTitle(task).toLowerCase();
    if (title.includes("seltos")) return "Missing trim section";
    return "Waiting on source confirmation";
  }

  function checklist(task) {
    const seoDone = ["seo_done", "needs_build", "page_built", "live", "needs_review"].includes(task.pageStatus);
    const aeoDone = task.aeoStatus === "done" || task.aeoStatus === "not_needed";
    const built = ["page_built", "live"].includes(task.pageStatus);
    const live = task.pageStatus === "live";
    return [
      ["SEO copy available", seoDone, false],
      ["AEO review complete", aeoDone, false],
      ["Model page built", built, !built],
      ["Live URL verified", live, built && !live],
    ].map(([label, done, current]) => `<div class="workbench-step${current ? " is-current" : ""}"><span class="workbench-check${done ? " is-done" : ""}">${done ? "OK" : ""}</span><span>${escapeHtml(label)}</span></div>`).join("");
  }

  function workbenchActions(task) {
    if (task.pageStatus === "page_built") {
      return `<button class="button button-secondary-action" type="button" data-status="needs_build" data-task-id="${escapeAttr(task.id)}">Revert</button><button class="button button-primary-action" type="button" data-status="live" data-task-id="${escapeAttr(task.id)}">Mark live ↑</button>`;
    }
    if (task.pageStatus === "needs_review") {
      return `<button class="button button-secondary-action" type="button" data-status="needs_seo" data-task-id="${escapeAttr(task.id)}">Return to SEO</button><button class="button button-primary-action" type="button" data-status="live" data-task-id="${escapeAttr(task.id)}">Keep live</button>`;
    }
    if (task.pageStatus === "seo_done") {
      return `<button class="button button-secondary-action" type="button" data-workbench-return>Send back</button><button class="button button-primary-action" type="button" data-status="needs_build" data-task-id="${escapeAttr(task.id)}">Start build →</button>`;
    }
    return `<button class="button button-secondary-action" type="button" data-workbench-return>Send back</button><button class="button button-primary-action" type="button" data-status="page_built" data-task-id="${escapeAttr(task.id)}">Mark built ↑</button>`;
  }

  function selectWorkbenchTask(taskId) {
    if (!taskId) return;
    _lastSelectedId = taskId;
    const task = state.tasks?.find((item) => item?.id === taskId);
    if (!isRenderableTask(task)) return;
    document.querySelectorAll(".workbench-row").forEach((row) => {
      row.classList.toggle("is-selected", row.dataset.workbenchTask === taskId);
    });
    renderBuilderDetail(task);
  }

  window.renderMyWork = function renderMyWorkWorkbench(tasks = []) {
    installMyWorkStyles();
    const safeTasks = Array.isArray(tasks) ? tasks.filter(isRenderableTask) : [];
    const { work, groups } = myWorkGroups(safeTasks);
    // Re-select last interacted task; fall back to first in queue
    const selected = (_lastSelectedId && work.find((t) => t.id === _lastSelectedId))
      || work.find(isRenderableTask) || null;
    if (selected) _lastSelectedId = selected.id;
    if (els.myWorkCount) {
      const nBuild = work.filter((t) => ["seo_done", "needs_build"].includes(t.pageStatus)).length;
      const nVerify = work.filter((t) => t.pageStatus === "page_built").length;
      const nBlocked = work.filter((t) => t.pageStatus === "needs_review").length;
      const parts = [];
      if (nBuild)   parts.push(`${nBuild} to build`);
      if (nVerify)  parts.push(`${nVerify} to verify`);
      if (nBlocked) parts.push(`${nBlocked} blocked`);
      els.myWorkCount.textContent = parts.length ? parts.join(" · ") : "All clear";
    }
    if (els.myWorkList) {
      els.myWorkList.className = "workbench-queue";
      els.myWorkList.innerHTML = work.length
        ? renderFocusCard(selected) + groups.map((group) => renderMyWorkSection(group, selected?.id)).join("")
        : (function() {
          const role = state.session?.primaryRole || "Builder";
          const msgs = {
            "Builder": "Queue clear. Every page you touched today is one step closer to live.",
            "SEO Writer": "Nothing left to write today. Nice work — the builders are going to love this.",
            "AEO Writer": "AEO queue is clear. Scott-level efficiency right there.",
          };
          const msg = msgs[role] || "All clear — nothing left in the queue.";
          return `<div class="workbench-empty-state"><p class="workbench-empty-icon">✓</p><p class="workbench-empty-msg">${msg}</p></div>`;
        }());
    }
    renderBuilderDetail(selected);
  };

  window.renderBuilderDetail = function renderBuilderDetailWorkbench(task) {
    if (!els.builderDetailPanel || !els.builderDetailContent) return;
    const selectedTask = isRenderableTask(task) ? task : null;
    els.builderDetailPanel.classList.toggle("is-empty", !selectedTask);
    if (!selectedTask) {
      els.builderDetailContent.innerHTML = "";
      return;
    }
    els.builderDetailContent.className = "workbench-detail-content";
    els.builderDetailContent.innerHTML = `<p class="eyebrow">Task detail</p><h2>${escapeHtml(taskTitle(selectedTask))}</h2><p class="workbench-detail-subtitle">${escapeHtml(selectedTask.dealer)} - ${escapeHtml(statusLabels[selectedTask.pageStatus] || selectedTask.pageStatus)} - ${escapeHtml(signalLabels[selectedTask.inventorySignal] || selectedTask.inventorySignal)}</p><div class="selected-task-status">${statusPill(selectedTask.pageStatus)} ${signalPill(selectedTask.inventorySignal)} ${aeoPill(selectedTask.aeoStatus)}</div><section class="workbench-next-step"><span>Next step</span><strong>${escapeHtml(builderNextStep(selectedTask))}</strong><small>SEO finalized ${escapeHtml(relativeTime(selectedTask))} - Owner: ${escapeHtml(ownerBucket(selectedTask))}</small></section><nav class="workbench-resources" aria-label="Task resources">${(typeof seoDocUrl==="function"&&seoDocUrl(selectedTask))?`<a class="workbench-resource-primary" href="${escapeAttr(seoDocUrl(selectedTask))}" target="_blank" rel="noreferrer">Open SEO doc</a>`:`<span class="workbench-resource-primary is-disabled">No SEO doc yet</span>`}<div class="workbench-resource-row"><a class="workbench-resource-link" href="#">Open CMS</a><a class="workbench-resource-link" href="${escapeAttr(modelInfoUrl(selectedTask))}" target="_blank" rel="noreferrer">View reference</a></div></nav><section class="workbench-checklist" aria-label="Task progress">${checklist(selectedTask)}</section><section class="workbench-ai"><button class="workbench-ai-pill" type="button" data-workbench-ai>Check handoff</button><div class="workbench-ai-result"><span>Handoff check</span><div>7 of 8 expected sections found</div><div>Missing: meta description</div><div>Present: H1, hero copy, CTA, local dealership mention</div></div></section><section class="workbench-return-note"><label for="workbenchReturnNote">What needs to be fixed?</label><textarea id="workbenchReturnNote" placeholder="Example: missing trim-level section and local phone number"></textarea></section><footer class="workbench-detail-actions">${workbenchActions(selectedTask)}</footer>`;
  };

  document.addEventListener("click", (event) => {
    const workbenchRow = event.target.closest("[data-workbench-task]");
    if (workbenchRow) {
      event.preventDefault();
      selectWorkbenchTask(workbenchRow.dataset.workbenchTask);
      return;
    }

    const aiButton = event.target.closest("[data-workbench-ai]");
    if (aiButton) {
      aiButton.nextElementSibling?.classList.toggle("is-visible");
      return;
    }

    const returnButton = event.target.closest("[data-workbench-return]");
    if (returnButton) {
      document.querySelector(".workbench-return-note")?.classList.toggle("is-visible");
    }
  });

  installMyWorkStyles();
  window.__fuszMyWorkWorkbenchLoaded = true;
})();

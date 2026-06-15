(function () {
  function installMyWorkStyles() {
    if (document.querySelector("#my-work-workbench-style")) return;
    const style = document.createElement("style");
    style.id = "my-work-workbench-style";
    style.textContent = `
      body[data-workspace-view="my_work"] .summary-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      body[data-workspace-view="my_work"] .summary-grid .metric:nth-child(4) {
        display: none;
      }

      body[data-workspace-view="my_work"] .summary-grid .metric::after {
        display: none;
      }

      body[data-workspace-view="my_work"] #myWorkPanel {
        grid-template-columns: minmax(420px, 1.25fr) minmax(320px, .9fr);
        gap: 34px;
        max-width: 1160px;
      }

      body[data-workspace-view="my_work"] .builder-panel {
        border-radius: 10px;
      }

      body[data-workspace-view="my_work"] .builder-queue-panel {
        min-height: 292px;
        padding: 0;
        overflow: hidden;
      }

      body[data-workspace-view="my_work"] .builder-queue-panel .section-heading {
        margin: 0;
        padding: 24px 26px 14px;
        border-bottom: 1px solid var(--line);
      }

      body[data-workspace-view="my_work"] .builder-queue-panel .section-heading h2 {
        font-size: 24px;
      }

      body[data-workspace-view="my_work"] .builder-queue-panel .count-pill {
        display: inline-flex;
        min-height: 24px;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }

      .workbench-queue {
        display: grid;
      }

      .workbench-section {
        border-bottom: 1px solid var(--line);
        background: #1b1b1b;
      }

      .workbench-section:last-child {
        border-bottom: 0;
      }

      .workbench-section-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 7px 12px 5px;
        color: var(--muted);
        font-size: 10px;
        font-weight: 850;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      .workbench-row {
        display: grid;
        grid-template-columns: 8px minmax(0, 1fr);
        gap: 10px;
        align-items: center;
        min-height: 58px;
        padding: 9px 12px;
        border-top: 1px solid var(--line);
        color: var(--text);
        cursor: pointer;
      }

      .workbench-row.is-selected {
        background: color-mix(in srgb, var(--panel) 74%, var(--blue));
        box-shadow: inset 3px 0 0 var(--action-blue, var(--blue));
      }

      .workbench-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--amber);
      }

      .workbench-dot.is-dim {
        opacity: .45;
      }

      .workbench-dot.is-verify {
        background: var(--blue);
      }

      .workbench-dot.is-blocked {
        background: var(--red);
      }

      .workbench-title,
      .workbench-meta {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .workbench-title {
        margin-bottom: 3px;
        font-size: 14px;
        font-weight: 850;
        line-height: 1.25;
      }

      .workbench-meta {
        color: var(--muted);
        font-size: 12px;
        font-weight: 600;
        line-height: 1.3;
      }

      body[data-workspace-view="my_work"] .builder-detail-panel {
        position: sticky;
        top: 24px;
        padding: 25px 26px 0;
      }

      .workbench-detail-subtitle {
        margin: 8px 0 16px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.4;
      }

      .workbench-next-step {
        margin: 0 0 16px;
        padding: 12px 0 12px 14px;
        border-left: 3px solid var(--action-blue, var(--blue));
        background: rgba(47, 114, 214, .07);
      }

      .workbench-next-step span,
      .workbench-ai-result span {
        display: block;
        color: var(--muted);
        font-size: 10px;
        font-weight: 850;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      .workbench-next-step strong {
        display: block;
        margin-top: 5px;
        color: var(--text);
        font-size: 14px;
        line-height: 1.35;
      }

      .workbench-next-step small {
        display: block;
        margin-top: 6px;
        color: var(--muted);
        font-size: 11px;
        font-weight: 650;
        line-height: 1.35;
      }

      .workbench-resources {
        display: grid;
        gap: 8px;
        margin: 0 0 16px;
      }

      .workbench-resource-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 36px;
        padding: 0 10px;
        border: 1px solid var(--line);
        border-radius: 7px;
        background: rgba(47, 114, 214, .14);
        color: #b9d9ff;
        font-size: 12px;
        font-weight: 850;
        text-decoration: none;
      }

      .workbench-resource-row {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
      }

      .workbench-resource-link {
        color: #8ec1ff;
        font-size: 12px;
        font-weight: 750;
        text-decoration: none;
      }

      .workbench-checklist {
        margin: 0 0 14px;
        border: 1px solid var(--line);
        border-radius: 7px;
        background: #1b1b1b;
        overflow: hidden;
      }

      .workbench-step {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr);
        gap: 8px;
        align-items: center;
        min-height: 37px;
        padding: 9px 10px;
        border-bottom: 1px solid var(--line);
        color: var(--muted);
        font-size: 12px;
        font-weight: 650;
      }

      .workbench-step:last-child {
        border-bottom: 0;
      }

      .workbench-step.is-current {
        color: var(--text);
        font-weight: 850;
      }

      .workbench-check {
        display: inline-grid;
        place-items: center;
        width: 16px;
        height: 16px;
        border: 1px solid var(--line);
        border-radius: 999px;
        color: transparent;
        font-size: 8px;
        line-height: 1;
      }

      .workbench-check.is-done {
        border-color: rgba(78, 216, 149, .42);
        background: rgba(78, 216, 149, .1);
        color: var(--green);
      }

      .workbench-ai-pill {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 10px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
        font: inherit;
        font-size: 11px;
        font-weight: 750;
      }

      .workbench-ai-result,
      .workbench-return-note {
        display: none;
        margin-top: 9px;
      }

      .workbench-ai-result.is-visible,
      .workbench-return-note.is-visible {
        display: block;
      }

      .workbench-ai-result {
        padding: 9px;
        border: 1px solid var(--line);
        border-radius: 7px;
        background: #1b1b1b;
        color: var(--muted);
        font-size: 11px;
        line-height: 1.45;
      }

      .workbench-return-note label {
        display: block;
        margin-bottom: 6px;
        color: var(--muted);
        font-size: 11px;
        font-weight: 750;
      }

      .workbench-return-note textarea {
        width: 100%;
        min-height: 64px;
        padding: 9px;
        border: 1px solid var(--line);
        border-radius: 7px;
        background: #151515;
        color: var(--text);
        font: inherit;
        resize: vertical;
      }

      .workbench-detail-actions {
        display: grid;
        grid-template-columns: minmax(0, .35fr) minmax(0, .65fr);
        gap: 10px;
        margin: 18px -26px 0;
        padding: 15px 26px 26px;
        border-top: 1px solid var(--line);
        border-radius: 0 0 10px 10px;
        background: #1b1b1b;
      }

      .workbench-detail-actions .button {
        justify-content: center;
        min-height: 44px;
      }

      @media (max-width: 760px) {
        body[data-workspace-view="my_work"] #myWorkPanel {
          grid-template-columns: 1fr;
          gap: 12px;
          max-width: none;
        }

        body[data-workspace-view="my_work"] .builder-panel {
          border-radius: 10px;
        }

        body[data-workspace-view="my_work"] .builder-queue-panel .section-heading {
          padding: 11px 12px;
        }

        body[data-workspace-view="my_work"] .builder-queue-panel .section-heading h2 {
          font-size: 16px;
        }

        .workbench-row {
          min-height: 55px;
          padding: 8px 12px;
        }

        .workbench-title {
          font-size: 13px;
        }

        .workbench-meta {
          font-size: 11px;
        }

        body[data-workspace-view="my_work"] .builder-detail-panel {
          position: static;
          padding: 13px 12px 0;
        }

        .workbench-detail-actions {
          position: sticky;
          bottom: 0;
          z-index: 2;
          margin: 16px -12px 0;
          padding: 10px 12px 14px;
          border-radius: 10px 10px 0 0;
        }
      }
    `;
    document.head.append(style);
  }

  function myWorkGroups(tasks) {
    const work = tasks
      .filter((task) => ["seo_done", "needs_build", "page_built", "needs_review"].includes(task.pageStatus))
      .sort((a, b) => workPriority(a) - workPriority(b));
    return {
      work,
      groups: [
        ["Ready to build", "ready", work.filter((task) => ["seo_done", "needs_build"].includes(task.pageStatus))],
        ["Ready to verify", "verify", work.filter((task) => task.pageStatus === "page_built")],
        ["Returned or blocked", "blocked", work.filter((task) => task.pageStatus === "needs_review")],
      ],
    };
  }

  function renderMyWorkSection([label, tone, tasks], selectedId) {
    return `<section class="workbench-section"><div class="workbench-section-head"><span>${escapeHtml(label)}</span><span>${tasks.length}</span></div>${tasks.length ? tasks.map((task) => renderMyWorkRow(task, tone, task.id === selectedId)).join("") : `<div class="empty">No tasks here.</div>`}</section>`;
  }

  function renderMyWorkRow(task, tone, selected) {
    const dotClass = ["workbench-dot", tone === "verify" ? "is-verify" : "", tone === "blocked" ? "is-blocked" : "", tone === "ready" && task.aeoStatus !== "done" ? "is-dim" : ""].filter(Boolean).join(" ");
    return `<article class="workbench-row${selected ? " is-selected" : ""}" data-details="${escapeAttr(task.id)}"><span class="${dotClass}"></span><div><span class="workbench-title">${escapeHtml(taskTitle(task))}</span><span class="workbench-meta">${escapeHtml(workbenchMeta(task, tone))}</span></div></article>`;
  }

  function workbenchMeta(task, tone) {
    const dealer = dealerShortName(task.dealer);
    if (tone === "verify") return `${dealer} - Built ${relativeTime(task)} - ${aeoShort(task.aeoStatus)}`;
    if (tone === "blocked") return `${dealer} - ${task.pageStatus === "needs_review" ? "Returned to SEO" : "Blocked"} - ${blockerReason(task)}`;
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
      return `<button class="button button-secondary-action" type="button" data-status="needs_build" data-task-id="${escapeAttr(task.id)}">Reopen</button><button class="button button-primary-action" type="button" data-status="live" data-task-id="${escapeAttr(task.id)}">Mark Page Live</button>`;
    }
    if (task.pageStatus === "needs_review") {
      return `<button class="button button-secondary-action" type="button" data-status="needs_seo" data-task-id="${escapeAttr(task.id)}">Send Back</button><button class="button button-primary-action" type="button" data-status="live" data-task-id="${escapeAttr(task.id)}">Keep Live</button>`;
    }
    if (task.pageStatus === "seo_done") {
      return `<button class="button button-secondary-action" type="button" data-workbench-return>Return to SEO</button><button class="button button-primary-action" type="button" data-status="needs_build" data-task-id="${escapeAttr(task.id)}">Start Build</button>`;
    }
    return `<button class="button button-secondary-action" type="button" data-workbench-return>Return to SEO</button><button class="button button-primary-action" type="button" data-status="page_built" data-task-id="${escapeAttr(task.id)}">Mark Page Built</button>`;
  }

  window.renderMyWork = function renderMyWorkWorkbench(tasks) {
    installMyWorkStyles();
    const { work, groups } = myWorkGroups(tasks);
    const selected = work[0];
    if (els.myWorkCount) {
      const completed = tasks.filter((task) => task.pageStatus === "live").length;
      els.myWorkCount.textContent = `${completed} completed today | ${work.length} remaining`;
    }
    if (els.myWorkList) {
      els.myWorkList.className = "workbench-queue";
      els.myWorkList.innerHTML = work.length ? groups.map((group) => renderMyWorkSection(group, selected?.id)).join("") : `<div class="empty">No builder tasks match the current filters.</div>`;
    }
    renderBuilderDetail(selected);
  };

  window.renderBuilderDetail = function renderBuilderDetailWorkbench(task) {
    if (!els.builderDetailPanel || !els.builderDetailContent) return;
    els.builderDetailPanel.classList.toggle("is-empty", !task);
    if (!task) {
      els.builderDetailContent.innerHTML = "";
      return;
    }
    els.builderDetailContent.innerHTML = `<p class="eyebrow">Selected task</p><h2>${escapeHtml(taskTitle(task))}</h2><p class="workbench-detail-subtitle">${escapeHtml(task.dealer)} - ${escapeHtml(statusLabels[task.pageStatus] || task.pageStatus)} - ${escapeHtml(signalLabels[task.inventorySignal] || task.inventorySignal)}</p><div class="selected-task-status">${statusPill(task.pageStatus)} ${signalPill(task.inventorySignal)} ${aeoPill(task.aeoStatus)}</div><section class="workbench-next-step"><span>Next step</span><strong>${escapeHtml(builderNextStep(task))}</strong><small>SEO finalized ${escapeHtml(relativeTime(task))} - Owner: ${escapeHtml(ownerBucket(task))}</small></section><nav class="workbench-resources" aria-label="Task resources"><a class="workbench-resource-primary" href="#">Open SEO doc</a><div class="workbench-resource-row"><a class="workbench-resource-link" href="#">Open CMS</a><a class="workbench-resource-link" href="${escapeAttr(modelInfoUrl(task))}" target="_blank" rel="noreferrer">View reference</a></div></nav><section class="workbench-checklist" aria-label="Task progress">${checklist(task)}</section><section class="workbench-ai"><button class="workbench-ai-pill" type="button" data-workbench-ai>Check SEO handoff</button><div class="workbench-ai-result"><span>Handoff check</span><div>7 of 8 expected sections found</div><div>Missing: meta description</div><div>Present: H1, hero copy, CTA, local dealership mention</div></div></section><section class="workbench-return-note"><label for="workbenchReturnNote">What needs to be fixed?</label><textarea id="workbenchReturnNote" placeholder="Example: missing trim-level section and local phone number"></textarea></section><footer class="workbench-detail-actions">${workbenchActions(task)}</footer>`;
  };

  document.addEventListener("click", (event) => {
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

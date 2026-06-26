const statusLabels = {
  needs_seo: "Needs SEO",
  seo_in_progress: "SEO In Progress",
  seo_done: "SEO Done",
  needs_build: "Needs Page Build",
  page_built: "Page Built",
  live: "Live / Checked",
  ignored: "Ignored",
  snoozed: "Snoozed",
  needs_review: "Needs Review",
};

const aeoLabels = {
  not_started: "AEO Not Started",
  in_progress: "AEO In Progress",
  done: "AEO Done",
  not_needed: "AEO Not Needed",
};

const signalLabels = {
  upcoming: "Upcoming",
  shipped: "Shipped",
  on_lot: "On lot",
};

const dealerAccents = {
  "Lou Fusz Chrysler Jeep Dodge RAM": "#8f98a3",
  "Lou Fusz Mazda": "#808080",
  "Lou Fusz Toyota": "#eb0a1e",
  "Lou Fusz Buick GMC": "#005daa",
  "Lou Fusz Chevrolet": "#c8a95a",
  "Lou Fusz Kia": "#05141F",
  "Lou Fusz Ford": "#003478",
  "Lou Fusz Chrysler Jeep Dodge Ram Vincennes": "#8f98a3",
  "Lou Fusz Kia Evansville": "#05141F",
  "Lou Fusz Kia of Moline": "#05141F",
  "Lou Fusz Kia Terre Haute": "#05141F",
  "Lou Fusz Mazda Evansville": "#808080",
  "Lou Fusz Nissan Moline": "#c3002f",
  "Lou Fusz Subaru St. Louis": "#013c74",
  "Lou Fusz Subaru O'Fallon": "#013c74",
  "Lou Fusz Kia Columbus": "#05141F",
};

const brandAccentOverrides = {
  Kia: { accent: "#05141F", visible: "#05141F", ink: "#d7e6f2" },
  Mazda: { accent: "#808080", visible: "#808080", ink: "#eeeeee" },
  Chrysler: { accent: "#203B68", visible: "#203B68", ink: "#c9dcff" },
  Dodge: { accent: "#DA0000", visible: "#DA0000", ink: "#ffd1d1" },
  Jeep: { accent: "#424D07", visible: "#424D07", ink: "#e3ef9a" },
  Ram: { accent: "#767676", visible: "#767676", ink: "#eeeeee" },
};

const transitions = {
  needs_seo: [["seo_in_progress", "Start SEO"], ["seo_done", "Mark SEO Complete"], ["ignored", "Ignore"], ["snoozed", "Snooze"]],
  seo_in_progress: [["seo_done", "Mark SEO Complete"], ["needs_seo", "Unclaim"]],
  seo_done: [["needs_build", "Send To Build"], ["live", "Mark Already Live"]],
  needs_build: [["page_built", "Mark Page Built"], ["seo_done", "Return To SEO Done"]],
  page_built: [["live", "Mark Page Live"], ["needs_build", "Reopen"]],
  live: [["needs_review", "Review Page"]],
  ignored: [["needs_seo", "Restore"]],
  snoozed: [["needs_seo", "Unsnooze"]],
  needs_review: [["needs_seo", "Send Back To SEO"], ["live", "Keep Live"]],
};

const embeddedTracker = [
  { id: "lou-fusz-chrysler-jeep-dodge-ram|2027|pacifica", dealer: "Lou Fusz Chrysler Jeep Dodge RAM", year: 2027, make: "Chrysler", model: "Pacifica", pageStatus: "live", trackerStatusRaw: true, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-chrysler-jeep-dodge-ram|2027|1500-srt-trx", dealer: "Lou Fusz Chrysler Jeep Dodge RAM", year: 2027, make: "Ram", model: "1500 SRT TRX", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 18, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-mazda|2027|mazda-cx-50", dealer: "Lou Fusz Mazda", year: 2027, make: "Mazda", model: "Mazda CX-50", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 5, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-mazda|2027|mazda-cx-70", dealer: "Lou Fusz Mazda", year: 2027, make: "Mazda", model: "Mazda CX-70", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 8, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-toyota|2027|land-cruiser", dealer: "Lou Fusz Toyota", year: 2027, make: "Toyota", model: "Land Cruiser", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-toyota|2027|highlander-ev", dealer: "Lou Fusz Toyota", year: 2027, make: "Toyota", model: "Highlander EV", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 18, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-buick-gmc|2027|terrain", dealer: "Lou Fusz Buick GMC", year: 2027, make: "GMC", model: "Terrain", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 8, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-buick-gmc|2027|sierra-1500", dealer: "Lou Fusz Buick GMC", year: 2027, make: "GMC", model: "Sierra 1500", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 11, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia|2027|kia-telluride", dealer: "Lou Fusz Kia", year: 2027, make: "Kia", model: "Kia Telluride", pageStatus: "live", trackerStatusRaw: true, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia|2027|seltos", dealer: "Lou Fusz Kia", year: 2027, make: "Kia", model: "Seltos", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia|2027|ev3", dealer: "Lou Fusz Kia", year: 2027, make: "Kia", model: "EV3", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-chevrolet|2027|equinox", dealer: "Lou Fusz Chevrolet", year: 2027, make: "Chevrolet", model: "Equinox", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-chevrolet|2027|silverado-1500", dealer: "Lou Fusz Chevrolet", year: 2027, make: "Chevrolet", model: "Silverado 1500", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 7, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-chevrolet|2027|bolt", dealer: "Lou Fusz Chevrolet", year: 2027, make: "Chevrolet", model: "Bolt", pageStatus: "live", trackerStatusRaw: true, trackerRow: 13, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-chrysler-jeep-dodge-ram-vincennes|2027|pacifica", dealer: "Lou Fusz Chrysler Jeep Dodge Ram Vincennes", year: 2027, make: "Chrysler", model: "Pacifica", pageStatus: "live", trackerStatusRaw: true, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-chrysler-jeep-dodge-ram-vincennes|2027|1500-srt-trx", dealer: "Lou Fusz Chrysler Jeep Dodge Ram Vincennes", year: 2027, make: "Ram", model: "1500 SRT TRX", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 24, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-evansville|2027|kia-telluride", dealer: "Lou Fusz Kia Evansville", year: 2027, make: "Kia", model: "Kia Telluride", pageStatus: "live", trackerStatusRaw: true, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-evansville|2027|seltos", dealer: "Lou Fusz Kia Evansville", year: 2027, make: "Kia", model: "Seltos", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-evansville|2027|ev3", dealer: "Lou Fusz Kia Evansville", year: 2027, make: "Kia", model: "EV3", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-of-moline|2027|kia-telluride", dealer: "Lou Fusz Kia of Moline", year: 2027, make: "Kia", model: "Kia Telluride", pageStatus: "live", trackerStatusRaw: true, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-of-moline|2027|seltos", dealer: "Lou Fusz Kia of Moline", year: 2027, make: "Kia", model: "Seltos", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-of-moline|2027|ev3", dealer: "Lou Fusz Kia of Moline", year: 2027, make: "Kia", model: "EV3", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-terre-haute|2027|kia-telluride", dealer: "Lou Fusz Kia Terre Haute", year: 2027, make: "Kia", model: "Kia Telluride", pageStatus: "live", trackerStatusRaw: true, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-terre-haute|2027|seltos", dealer: "Lou Fusz Kia Terre Haute", year: 2027, make: "Kia", model: "Seltos", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-terre-haute|2027|ev3", dealer: "Lou Fusz Kia Terre Haute", year: 2027, make: "Kia", model: "EV3", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-mazda-evansville|2027|mazda-cx-50", dealer: "Lou Fusz Mazda Evansville", year: 2027, make: "Mazda", model: "Mazda CX-50", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-mazda-evansville|2027|mazda-cx-70", dealer: "Lou Fusz Mazda Evansville", year: 2027, make: "Mazda", model: "Mazda CX-70", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 9, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-nissan-moline|2027|nissan-z", dealer: "Lou Fusz Nissan Moline", year: 2027, make: "Nissan", model: "Nissan Z", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 5, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-subaru-st.-louis|2027|crosstrek", dealer: "Lou Fusz Subaru St. Louis", year: 2027, make: "Subaru", model: "Crosstrek", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-subaru-st.-louis|2027|crosstrek-hybrid", dealer: "Lou Fusz Subaru St. Louis", year: 2027, make: "Subaru", model: "Crosstrek Hybrid", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-subaru-st.-louis|2027|getaway-ev", dealer: "Lou Fusz Subaru St. Louis", year: 2027, make: "Subaru", model: "Getaway EV", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-subaru-o'fallon|2027|crosstrek", dealer: "Lou Fusz Subaru O'Fallon", year: 2027, make: "Subaru", model: "Crosstrek", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-subaru-o'fallon|2027|crosstrek-hybrid", dealer: "Lou Fusz Subaru O'Fallon", year: 2027, make: "Subaru", model: "Crosstrek Hybrid", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-subaru-o'fallon|2027|getaway-ev", dealer: "Lou Fusz Subaru O'Fallon", year: 2027, make: "Subaru", model: "Getaway EV", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-columbus|2027|kia-telluride", dealer: "Lou Fusz Kia Columbus", year: 2027, make: "Kia", model: "Kia Telluride", pageStatus: "live", trackerStatusRaw: true, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-columbus|2027|seltos", dealer: "Lou Fusz Kia Columbus", year: 2027, make: "Kia", model: "Seltos", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-columbus|2027|ev3", dealer: "Lou Fusz Kia Columbus", year: 2027, make: "Kia", model: "EV3", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
];

const embeddedSources = [
  { dealer: "Lou Fusz Chrysler Jeep Dodge RAM", shortName: "CJDR", brands: ["Chrysler", "Dodge", "Jeep", "Ram"], inventoryUrl: "https://www.loufuszchryslerjeepdodge.net/new-vehicles/" },
  { dealer: "Lou Fusz Mazda", shortName: "Mazda", brands: ["Mazda"], inventoryUrl: "https://www.mazda.fusz.com/new-vehicles/" },
  { dealer: "Lou Fusz Toyota", shortName: "Toyota", brands: ["Toyota"], inventoryUrl: "https://www.fusztoyota.com/new-vehicles/" },
  { dealer: "Lou Fusz Buick GMC", shortName: "Buick GMC", brands: ["Buick", "GMC"], inventoryUrl: "https://www.loufuszbuickgmc.com/new-vehicles/" },
  { dealer: "Lou Fusz Chevrolet", shortName: "Chevrolet", brands: ["Chevrolet"], inventoryUrl: "https://www.loufuszchevrolet.com/new-vehicles/" },
  { dealer: "Lou Fusz Kia", shortName: "Kia", brands: ["Kia"], inventoryUrl: "https://www.kia.fusz.com/new-vehicles/" },
  { dealer: "Lou Fusz Ford", shortName: "Ford", brands: ["Ford"], inventoryUrl: "https://www.loufuszford.com/new-vehicles/" },
  { dealer: "Lou Fusz Chrysler Jeep Dodge Ram Vincennes", shortName: "CJDR Vincennes", brands: ["Chrysler", "Dodge", "Jeep", "Ram"], inventoryUrl: "https://www.loufuszcjdrvincennes.com/new-vehicles/" },
  { dealer: "Lou Fusz Kia Evansville", shortName: "Kia Evansville", brands: ["Kia"], inventoryUrl: "https://www.evansvillekia.com/" },
  { dealer: "Lou Fusz Kia of Moline", shortName: "Kia Moline", brands: ["Kia"], inventoryUrl: "https://www.loufuszkiamoline.com/new-vehicles/" },
  { dealer: "Lou Fusz Kia Terre Haute", shortName: "Kia Terre Haute", brands: ["Kia"], inventoryUrl: "https://www.loufuszkiaterrehaute.com/new-vehicles/" },
  { dealer: "Lou Fusz Mazda Evansville", shortName: "Mazda Evansville", brands: ["Mazda"], inventoryUrl: "https://www.loufuszmazdaevansville.com/new-vehicles/" },
  { dealer: "Lou Fusz Nissan Moline", shortName: "Nissan Moline", brands: ["Nissan"], inventoryUrl: "https://www.loufusznissanmoline.com/new-vehicles/" },
  { dealer: "Lou Fusz Subaru St. Louis", shortName: "Subaru St. Louis", brands: ["Subaru"], inventoryUrl: "https://www.subaru.fusz.com/new-vehicles/" },
  { dealer: "Lou Fusz Subaru O'Fallon", shortName: "Subaru O'Fallon", brands: ["Subaru"], inventoryUrl: "https://www.fuszsubaru.com/new-vehicles/" },
  { dealer: "Lou Fusz Kia Columbus", shortName: "Kia Columbus", brands: ["Kia"], inventoryUrl: "https://www.loufuszkia.com/new-vehicles/" },
];

(function installMyWorkLiveCheckMvp() {
  const STYLE_ID = "my-work-live-check-mvp-style";
  let observerInstalled = false;

  function installStyle() {
    if (document.querySelector(`#${STYLE_ID}`)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body[data-workspace-view="my_work"] .workbench-live-card {
        display: grid;
        gap: 10px;
        width: 100%;
        padding: 14px 12px 15px;
        border: 0;
        border-top: 1px solid var(--line);
        background: var(--panel); /* dark panel — flips to white in light theme */
        color: var(--ink);
        cursor: pointer;
        font: inherit;
        text-align: left;
      }

      body[data-workspace-view="my_work"] .workbench-live-card:hover {
        background: rgba(47, 114, 214, .08);
      }

      body[data-workspace-view="my_work"] .workbench-live-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        color: var(--muted);
        font-size: 10px;
        font-weight: 850;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      body[data-workspace-view="my_work"] .workbench-live-count {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        padding: 0 8px;
        border-radius: 999px;
        background: rgba(255, 206, 91, .12);
        color: var(--amber); /* amber token — theme-aware */
        font-size: 11px;
        font-weight: 950;
      }

      body[data-workspace-view="my_work"] .workbench-live-title {
        display: block;
        color: var(--text);
        font-size: 14px;
        font-weight: 900;
        line-height: 1.25;
      }

      body[data-workspace-view="my_work"] .workbench-live-meta {
        display: block;
        margin-top: 3px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 650;
      }

      body[data-workspace-view="my_work"] .workbench-live-action {
        justify-self: start;
        color: var(--blue); /* blue token — theme-aware */
        font-size: 12px;
        font-weight: 850;
      }

      body[data-theme="light"][data-workspace-view="my_work"] .workbench-live-card {
        background: #fffcf8 !important;
        color: var(--ink) !important;
        border-top-color: var(--line) !important;
      }

      body[data-theme="light"][data-workspace-view="my_work"] .workbench-live-card:hover {
        background: var(--blue-soft) !important;
      }

      body[data-theme="light"][data-workspace-view="my_work"] .workbench-live-count {
        background: var(--amber-soft) !important;
        color: var(--amber) !important;
      }

      body[data-theme="light"][data-workspace-view="my_work"] .workbench-live-title {
        color: var(--ink) !important;
      }

      body[data-theme="light"][data-workspace-view="my_work"] .workbench-live-action {
        color: var(--blue) !important;
      }
    `;
    document.head.append(style);
  }

  function canRun() {
    return document.body?.dataset.workspaceView === "my_work" && typeof state !== "undefined" && Array.isArray(state.tasks);
  }

  function sectionLabel(section) {
    return section.querySelector(".workbench-section-head span")?.textContent?.trim().toLowerCase() || "";
  }

  function verifySection() {
    return [...document.querySelectorAll(".workbench-section")].find((section) => sectionLabel(section).includes("ready to verify"));
  }

  function taskForRow(row) {
    return state.tasks.find((task) => task.id === row?.dataset?.workbenchTask) || null;
  }

  function modelLabel(task) {
    if (!task) return "Next live check";
    const model = typeof displayModel === "function" ? displayModel(task) : String(task.model || "").replace(new RegExp(`^${task.make}\\s+`, "i"), "").trim();
    return `${task.year || ""} ${model || task.model || "Model page"}`.trim();
  }

  function dealerShortNameFor(task) {
    const source = state.sources?.find((item) => item.dealer === task?.dealer);
    return source?.shortName || String(task?.dealer || "Dealer").replace("Lou Fusz ", "");
  }

  function applyLiveCheckMvp() {
    if (!canRun()) return;
    const section = verifySection();
    if (!section) return;

    installStyle();
    const rows = [...section.querySelectorAll(".workbench-row[data-workbench-task]")];
    if (!rows.length && section.querySelector(".workbench-live-card")) return;
    if (!rows.length) return;

    const header = section.querySelector(".workbench-section-head");
    const headerSpans = header ? [...header.querySelectorAll("span")] : [];
    const selectedRow = rows.find((row) => row.classList.contains("is-selected"));
    const nextRow = selectedRow || rows[0];
    const nextTask = taskForRow(nextRow);
    const count = rows.length;

    if (headerSpans[0]) headerSpans[0].textContent = "Needs live check";
    if (headerSpans[1]) headerSpans[1].textContent = String(count);

    [...section.children].forEach((child) => {
      if (child !== header) child.remove();
    });

    const card = document.createElement("button");
    card.type = "button";
    card.className = "workbench-live-card";
    card.dataset.workbenchTask = nextTask?.id || nextRow.dataset.workbenchTask || "";
    card.innerHTML = `
      <span class="workbench-live-topline"><span>Live checks ready</span><span class="workbench-live-count">${count}</span></span>
      <span><strong class="workbench-live-title">${escapeHtml(modelLabel(nextTask))}</strong><span class="workbench-live-meta">${escapeHtml(dealerShortNameFor(nextTask))} · next page to verify</span></span>
      <span class="workbench-live-action">Open next live check</span>
    `;
    section.append(card);
  }

  function scheduleApply() {
    window.requestAnimationFrame(applyLiveCheckMvp);
  }

  function installObserver() {
    if (observerInstalled || !document.body) return;
    observerInstalled = true;
    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    installObserver();
    scheduleApply();
  });

  const startupTimer = window.setInterval(() => {
    installObserver();
    applyLiveCheckMvp();
  }, 150);

  window.setTimeout(() => window.clearInterval(startupTimer), 6000);
})();

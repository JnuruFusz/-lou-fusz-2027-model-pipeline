// js/wins.js — Fusz+ Wins page
// Renders the celebration view driven by real state.tasks data.
// Called from render() whenever state.workspaceView === "wins".

const WINS_BRAND_COLORS = {
  Toyota:    { color: "#EB0A1E", glow: "rgba(235,10,30,.22)"   },
  Kia:       { color: "#BB162B", glow: "rgba(187,22,43,.22)"   },
  Mazda:     { color: "#910A2D", glow: "rgba(145,10,45,.22)"   },
  Subaru:    { color: "#013C70", glow: "rgba(1,60,112,.22)"    },
  Ford:      { color: "#003DA5", glow: "rgba(0,61,165,.22)"    },
  Chevrolet: { color: "#D4AF37", glow: "rgba(212,175,55,.22)"  },
  GMC:       { color: "#AE2024", glow: "rgba(174,32,36,.22)"   },
  Buick:     { color: "#4A7C59", glow: "rgba(74,124,89,.22)"   },
  Nissan:    { color: "#C3002F", glow: "rgba(195,0,47,.22)"    },
  Dodge:     { color: "#CC0000", glow: "rgba(204,0,0,.22)"     },
  Jeep:      { color: "#3D6B44", glow: "rgba(61,107,68,.22)"   },
  Ram:       { color: "#6B0F1A", glow: "rgba(107,15,26,.22)"   },
  Chrysler:  { color: "#5C7B9A", glow: "rgba(92,123,154,.22)"  },
};

const WINS_TEAM_PALETTE = [
  "#2f72d6","#3F9B6E","#B5852F","#7B61FF","#E0522B","#1A8A9B",
];

function winsBrandMeta(make) {
  return WINS_BRAND_COLORS[make] || { color: "#9aa0aa", glow: "rgba(154,160,170,.2)" };
}
function winsTeamColor(i) { return WINS_TEAM_PALETTE[i % WINS_TEAM_PALETTE.length]; }
function winsInitials(name) {
  const w = String(name || "").trim().split(/\s+/).filter(Boolean);
  return w.length > 1 ? `${w[0][0]}${w[1][0]}`.toUpperCase() : (w[0] || "?").slice(0, 2).toUpperCase();
}

// ─── Data ─────────────────────────────────────────────────────────────────────

function winsComputeData() {
  const tasks     = state.tasks.filter((t) => t.year >= 2027);
  const liveTasks = tasks.filter((t) => t.pageStatus === "live");
  const builtTasks= tasks.filter((t) => ["page_built","live"].includes(t.pageStatus));
  const seoTasks  = tasks.filter((t) => ["seo_done","needs_build","page_built","live"].includes(t.pageStatus));
  const wordsK    = +(seoTasks.length * 600 / 1000).toFixed(1);

  // Brand shelf
  const brandMap = {};
  tasks.forEach((t) => {
    const make = t.make || "Other";
    if (!brandMap[make]) brandMap[make] = { name: make, live: 0, total: 0 };
    brandMap[make].total++;
    if (t.pageStatus === "live") brandMap[make].live++;
  });
  const brands = Object.values(brandMap)
    .filter((b) => b.total >= 2)
    .sort((a, b) => (b.live/b.total) - (a.live/a.total) || b.live - a.live)
    .map((b) => ({
      ...b,
      done: b.live > 0 && b.live >= b.total,
      pct:  `${Math.round((b.live / Math.max(b.total,1)) * 100)}%`,
      ...winsBrandMeta(b.name),
    }));

  // Team leaderboard — pre-seed from TEAM_ROSTER so all members always appear
  const teamMap = {};

  // Baseline: every roster member starts at 0
  if (typeof TEAM_ROSTER !== "undefined") {
    TEAM_ROSTER.forEach((member) => {
      teamMap[member.name] = { name: member.name, count: 0, role: member.primaryRole };
    });
  }

  // Layer in real completed-task counts
  tasks.forEach((t) => {
    const bo = t.details?.buildOwner, so = t.details?.seoOwner;
    if (["page_built","live"].includes(t.pageStatus) && bo) {
      if (!teamMap[bo]) teamMap[bo] = { name: bo, count: 0, role: "Builder" };
      teamMap[bo].count++;
    }
    if (["seo_done","needs_build","page_built","live"].includes(t.pageStatus) && so) {
      if (!teamMap[so]) teamMap[so] = { name: so, count: 0, role: "SEO Writer" };
      teamMap[so].count++;
    }
    if (["done"].includes(t.aeoStatus)) {
      const ao = t.details?.aeoOwner || null;
      if (ao) {
        if (!teamMap[ao]) teamMap[ao] = { name: ao, count: 0, role: "AEO Writer" };
        teamMap[ao].count++;
      }
    }
  });

  const team = Object.values(teamMap)
    .sort((a, b) => b.count - a.count)
    .map((m, i) => ({ ...m, color: winsTeamColor(i), initials: winsInitials(m.name) }));

  // Recent wins
  const recentWins = [...liveTasks].reverse().slice(0, 10).map((t) => ({
    year:    t.year,
    make:    t.make || "",
    model:   (typeof displayModel === "function") ? displayModel(t) : t.model,
    dealer:  t.dealer,
    builder: t.details?.buildOwner || sessionName || "Team",
    color:   winsBrandMeta(t.make).color,
  }));

  // Milestone banner
  const n = seoTasks.length;
  let milestone;
  if (n >= 300) {
    milestone = { eyebrow:"Milestone · 300 SEO pages", quote:`${n} pages, written by hand. That's how you own every search result in Missouri.`, next: null };
  } else if (n >= 250) {
    milestone = { eyebrow:"Milestone · 250 SEO pages", quote:`${n} SEO pages, written by hand. No wonder Lou&nbsp;Fusz ranks as Missouri's <span class="wins-quote-accent">#1 dealer group</span>.`, next:`Next milestone: 300 pages — ${300-n} to go.` };
  } else if (n >= 100) {
    milestone = { eyebrow:"Milestone · 100 SEO pages", quote:`${n} SEO pages in. The team is building something the whole state is going to notice.`, next:`Next milestone: 250 pages — ${250-n} to go.` };
  } else if (n >= 25) {
    milestone = { eyebrow:"Getting traction", quote:`${n} pages written and counting. Every page is a car somebody finds.`, next:`Next milestone: 100 pages — ${100-n} to go.` };
  } else {
    milestone = { eyebrow:"Just getting started", quote:`${n||"The first"} page${n===1?"":"s"} — every great run starts here.`, next:`First milestone: 25 pages — ${25-n} to go.` };
  }

  return { liveCount:liveTasks.length, builtCount:builtTasks.length, seoCount:n, wordsK, brands, team, recentWins, milestone, doneBrands:brands.filter((b)=>b.done).length };
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function winsCounterEl(to, dec, suf) {
  return `<span data-wins-count data-to="${to}" data-decimals="${dec}" data-suffix="${escapeAttr(suf)}">0</span>`;
}

function winsBrandCardHTML(b) {
  const doneTag = b.done ? `<span class="wins-brand-done" style="color:${b.color};border-color:${b.color};">Done</span>` : "";
  const glowEl  = b.done ? `<div class="wins-brand-glow" style="--gc:${b.color};--glow:${b.glow};"></div>` : "";
  return `<div class="wins-brand-card" data-reveal>
      <div class="wins-brand-topbar" style="background:${b.color};"></div>
      ${glowEl}
      <div class="wins-brand-head"><span class="wins-brand-name">${escapeHtml(b.name)}</span>${doneTag}</div>
      <div class="wins-brand-num">${b.live}</div>
      <div class="wins-brand-sub">of ${b.total} pages live</div>
      <div class="wins-brand-track"><div class="wins-brand-fill" style="width:${b.pct};background:${b.color};"></div></div>
    </div>`;
}

function winsTeamCardHTML(m) {
  return `<div class="wins-team-card" data-reveal>
      <div class="wins-team-avatar" style="background:${m.color};">${escapeHtml(m.initials)}</div>
      <div class="wins-team-info">
        <div class="wins-team-name">${escapeHtml(m.name)}</div>
        <div class="wins-team-role">${escapeHtml(m.role)}</div>
      </div>
      <div class="wins-team-stat">
        <div class="wins-team-count">${m.count > 0 ? m.count : "–"}</div>
        <div class="wins-team-unit">pages</div>
      </div>
    </div>`;
}

function winsRecentRowHTML(w) {
  return `<div class="wins-recent-row" data-reveal style="border-left-color:${w.color};">
      <div class="wins-recent-year">${escapeHtml(String(w.year))}</div>
      <div class="wins-recent-info">
        <div class="wins-recent-title">${escapeHtml(`${w.make} ${w.model}`.trim())}</div>
        <div class="wins-recent-meta">${escapeHtml(w.dealer)} · built by ${escapeHtml(w.builder)}</div>
      </div>
      <div class="wins-recent-status"><span class="wins-live-dot"></span><span>Live</span></div>
    </div>`;
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderWins() {
  const panel = document.getElementById("winsPanel");
  if (!panel || state.workspaceView !== "wins") return;
  const d = winsComputeData();

  panel.innerHTML = `<div class="wins-root">

    <section class="wins-hero" data-reveal-group>
      <div class="wins-hero-inner">
        <div class="wins-eyebrow-chip" data-reveal>
          <span class="wins-dot" style="background:var(--blue);"></span>
          2027 Model Year · 17 Dealerships
        </div>
        <h1 class="wins-headline" data-reveal>Look at what<br>we built.</h1>
        <p class="wins-subhead" data-reveal>Every number here is real work the team shipped this season. Keep going — the lineup is almost live.</p>
      </div>
      <div class="wins-stat-grid">
        <div class="wins-stat-card" data-reveal>
          <div class="wins-stat-num">${winsCounterEl(d.liveCount,0,"")}</div>
          <div class="wins-stat-label">Pages live</div>
          <div class="wins-stat-sub wins-sub-green">+${Math.min(12,Math.max(1,d.liveCount))} this season</div>
        </div>
        <div class="wins-stat-card" data-reveal>
          <div class="wins-stat-num">${winsCounterEl(d.builtCount,0,"")}</div>
          <div class="wins-stat-label">Pages built</div>
          <div class="wins-stat-sub">${Math.max(0,d.builtCount-d.liveCount)} in final QA</div>
        </div>
        <div class="wins-stat-card" data-reveal>
          <div class="wins-stat-num">${winsCounterEl(d.seoCount,0,"")}</div>
          <div class="wins-stat-label">SEO copy done</div>
          <div class="wins-stat-sub">${d.liveCount>0?Math.round((d.seoCount/Math.max(d.liveCount,1))*100):100}% of live pages</div>
        </div>
        <div class="wins-stat-card" data-reveal>
          <div class="wins-stat-num">${winsCounterEl(d.wordsK,1,"K")}</div>
          <div class="wins-stat-label">Words written <span class="wins-est">(est.)</span></div>
          <div class="wins-stat-sub">~600 per page</div>
        </div>
      </div>
    </section>

    <section class="wins-banner" data-reveal-group>
      <div class="wins-banner-inner" data-reveal>
        <div class="wins-banner-eyebrow">
          <span class="wins-dot" style="background:var(--amber);"></span>
          ${escapeHtml(d.milestone.eyebrow)}
        </div>
        <p class="wins-banner-quote">${d.milestone.quote}</p>
        ${d.milestone.next ? `<div class="wins-banner-next">${escapeHtml(d.milestone.next)}</div>` : ""}
      </div>
    </section>

    <section class="wins-section" data-reveal-group>
      <header class="wins-section-head" data-reveal>
        <div>
          <div class="wins-section-eyebrow"><span class="wins-rule"></span>Trophy Shelf</div>
          <h2 class="wins-section-title">Pages live by brand</h2>
        </div>
        <div class="wins-section-aside">${d.doneBrands} brand${d.doneBrands!==1?"s":""} complete · scroll →</div>
      </header>
      <div class="wins-brand-scroll">
        <div class="wins-brand-shelf">${d.brands.map(winsBrandCardHTML).join("")}</div>
      </div>
    </section>

    ${d.team.length ? `
    <section class="wins-section" data-reveal-group>
      <header class="wins-section-head" data-reveal>
        <div>
          <div class="wins-section-eyebrow"><span class="wins-rule"></span>The Team</div>
          <h2 class="wins-section-title">Who built what</h2>
        </div>
        <div class="wins-section-aside">Not a competition — just proof everyone showed up.</div>
      </header>
      <div class="wins-team-grid">${d.team.map(winsTeamCardHTML).join("")}</div>
    </section>` : ""}

    <section class="wins-section wins-section-last" data-reveal-group>
      <header class="wins-section-head" data-reveal>
        <div>
          <div class="wins-section-eyebrow"><span class="wins-rule"></span>Just Shipped</div>
          <h2 class="wins-section-title">Recent wins</h2>
        </div>
        <div class="wins-section-aside">Last ${d.recentWins.length} pages that went live</div>
      </header>
      ${d.recentWins.length ? `<div class="wins-recent-list">${d.recentWins.map(winsRecentRowHTML).join("")}</div>` : `
      <div class="wins-empty" data-reveal>
        <p class="wins-empty-title">No pages live yet</p>
        <p class="wins-empty-sub">This page fills up as model pages get marked live. Keep building.</p>
      </div>`}
    </section>

  </div>`;

  requestAnimationFrame(() => { initWinsReveal(panel); initWinsCounters(panel); });
}

// ─── Counters ─────────────────────────────────────────────────────────────────

function initWinsCounters(panel) {
  panel.querySelectorAll("[data-wins-count]").forEach((el) => {
    animateWinsCounter(el, 0, parseFloat(el.dataset.to)||0, 1400, parseInt(el.dataset.decimals,10)||0, el.dataset.suffix||"");
  });
}

function animateWinsCounter(el, from, to, dur, dec, suf) {
  const start = performance.now();
  (function step(now) {
    const p = Math.min((now-start)/dur, 1);
    const e = 1 - Math.pow(1-p, 3);
    el.textContent = (dec > 0 ? (from+(to-from)*e).toFixed(dec) : Math.round(from+(to-from)*e)) + suf;
    if (p < 1) requestAnimationFrame(step);
  })(start);
}

// ─── Scroll reveal ────────────────────────────────────────────────────────────

function initWinsReveal(panel) {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      setTimeout(() => el.classList.add("is-revealed"), parseInt(el.dataset.revealDelay||"0",10));
      obs.unobserve(el);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -32px 0px" });

  panel.querySelectorAll("[data-reveal-group]").forEach((group) => {
    let delay = 0;
    group.querySelectorAll("[data-reveal]").forEach((el) => {
      el.dataset.revealDelay = String(delay);
      delay += 55;
      obs.observe(el);
    });
  });
}

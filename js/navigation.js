function openNavigation() {
  document.body.dataset.navOpen = "true";
  els.mobileMenuButton.setAttribute("aria-expanded", "true");
  els.navCloseButton.focus();
}

function closeNavigation(options = {}) {
  document.body.dataset.navOpen = "false";
  els.mobileMenuButton.setAttribute("aria-expanded", "false");
  if (options.restoreFocus !== false) els.mobileMenuButton.focus();
}

function setWorkspaceView(workspaceView, options = {}) {
  state.workspaceView = workspaceView;
  localStorage.setItem("pipeline-workspace-view", workspaceView);
  if (document.body.dataset.navOpen === "true") closeNavigation({ restoreFocus: false });
  if (!options.silent) showToast(`${workspaceLabel(workspaceView)} view enabled`);
  render();
}

function workspaceLabel(view) {
  return {
    admin: "Admin Command Center",
    my_work: "My Work",
    team_board: "Team Pipeline",
    upcoming: "Upcoming Models",
    wins: "Wins",
    docs: "Resources",
    settings: "Settings",
  }[view] || "Workspace";
}

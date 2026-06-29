const FUSZ_THEME_KEY = "fusz-theme";
let systemThemeListenerInstalled = false;

function normalizeThemeChoice(theme) {
  const choice = String(theme || "").trim().toLowerCase();
  if (choice === "system" || choice === "light") return choice;
  return "dark";
}

function systemPrefersLight() {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches === true;
}

function resolveTheme(theme) {
  const choice = normalizeThemeChoice(theme);
  if (choice === "light") return "light";
  if (choice === "system") return systemPrefersLight() ? "light" : "gray";
  return "gray";
}

function themeChoiceLabel(theme) {
  return { system: "System", light: "Light", dark: "Dark" }[normalizeThemeChoice(theme)];
}

function themeSelectElement() {
  return els.settingsThemeSelect || document.querySelector('#settingsThemeSelect');
}

function syncThemeSelect(choice) {
  const select = themeSelectElement();
  if (!select) return;
  Array.from(select.options).forEach((option) => {
    option.value = normalizeThemeChoice(option.textContent);
  });
  select.value = normalizeThemeChoice(choice);
}

function installSystemThemeListener() {
  if (systemThemeListenerInstalled || !window.matchMedia) return;
  systemThemeListenerInstalled = true;
  const media = window.matchMedia("(prefers-color-scheme: light)");
  const handleSystemThemeChange = () => {
    if (normalizeThemeChoice(localStorage.getItem(FUSZ_THEME_KEY) || state.selectedTheme) === "system") {
      applyTheme("system");
    }
  };
  if (media.addEventListener) {
    media.addEventListener("change", handleSystemThemeChange);
  } else if (media.addListener) {
    media.addListener(handleSystemThemeChange);
  }
}

function applyTheme(theme) {
  const choice = normalizeThemeChoice(theme);
  const activeTheme = resolveTheme(choice);
  document.body.dataset.themeChoice = choice;
  document.body.dataset.theme = activeTheme;
  document.documentElement.style.colorScheme = activeTheme === "light" ? "light" : "dark";
  syncThemeSelect(choice);
  installSystemThemeListener();
}

function setThemePreference(theme) {
  const choice = normalizeThemeChoice(theme);
  state.selectedTheme = choice;
  localStorage.setItem(FUSZ_THEME_KEY, choice);
  applyTheme(choice);
  return choice;
}

document.addEventListener("change", (event) => {
  const select = themeSelectElement();
  if (!select || event.target !== select) return;
  const choice = setThemePreference(select.value);
  if (typeof showToast === "function") showToast(`Appearance set to ${themeChoiceLabel(choice)}`);
});

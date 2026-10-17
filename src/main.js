import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { WebglAddon } from "@xterm/addon-webgl";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import "@xterm/xterm/css/xterm.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { register as registerHotkey } from "@tauri-apps/plugin-global-shortcut";

// ---------- 8 full 16-color themes ----------
const THEMES = {
  "tokyo-night": { background: "#1a1b26", foreground: "#c0caf5", cursor: "#c0caf5", cursorAccent: "#1a1b26", selectionBackground: "#33467c", black: "#15161e", red: "#f7768e", green: "#9ece6a", yellow: "#e0af68", blue: "#7aa2f7", magenta: "#bb9af7", cyan: "#7dcfff", white: "#a9b1d6", brightBlack: "#414868", brightRed: "#f7768e", brightGreen: "#9ece6a", brightYellow: "#e0af68", brightBlue: "#7aa2f7", brightMagenta: "#bb9af7", brightCyan: "#7dcfff", brightWhite: "#c0caf5" },
  "dracula": { background: "#282a36", foreground: "#f8f8f2", cursor: "#f8f8f2", cursorAccent: "#282a36", selectionBackground: "#44475a", black: "#21222c", red: "#ff5555", green: "#50fa7b", yellow: "#f1fa8c", blue: "#bd93f9", magenta: "#ff79c6", cyan: "#8be9fd", white: "#f8f8f2", brightBlack: "#6272a4", brightRed: "#ff6e6e", brightGreen: "#69ff94", brightYellow: "#ffffa5", brightBlue: "#d6acff", brightMagenta: "#ff92df", brightCyan: "#a4ffff", brightWhite: "#ffffff" },
  "catppuccin": { background: "#1e1e2e", foreground: "#cdd6f4", cursor: "#f5e0dc", cursorAccent: "#1e1e2e", selectionBackground: "#585b70", black: "#45475a", red: "#f38ba8", green: "#a6e3a1", yellow: "#f9e2af", blue: "#89b4fa", magenta: "#cba6f7", cyan: "#94e2d5", white: "#bac2de", brightBlack: "#585b70", brightRed: "#f38ba8", brightGreen: "#a6e3a1", brightYellow: "#f9e2af", brightBlue: "#89b4fa", brightMagenta: "#cba6f7", brightCyan: "#94e2d5", brightWhite: "#a6adc8" },
  "nord": { background: "#2e3440", foreground: "#eceff4", cursor: "#eceff4", cursorAccent: "#2e3440", selectionBackground: "#434c5e", black: "#3b4252", red: "#bf616a", green: "#a3be8c", yellow: "#ebcb8b", blue: "#81a1c1", magenta: "#b48ead", cyan: "#88c0d0", white: "#e5e9f0", brightBlack: "#4c566a", brightRed: "#bf616a", brightGreen: "#a3be8c", brightYellow: "#ebcb8b", brightBlue: "#81a1c1", brightMagenta: "#b48ead", brightCyan: "#8fbcbb", brightWhite: "#eceff4" },
  "gruvbox": { background: "#282828", foreground: "#ebdbb2", cursor: "#ebdbb2", cursorAccent: "#282828", selectionBackground: "#504945", black: "#282828", red: "#cc241d", green: "#98971a", yellow: "#d79921", blue: "#458588", magenta: "#b16286", cyan: "#689d6a", white: "#a89984", brightBlack: "#928374", brightRed: "#fb4934", brightGreen: "#b8bb26", brightYellow: "#fabd2f", brightBlue: "#83a598", brightMagenta: "#d3869b", brightCyan: "#8ec07c", brightWhite: "#ebdbb2" },
  "one-dark": { background: "#282c34", foreground: "#abb2bf", cursor: "#528bff", cursorAccent: "#282c34", selectionBackground: "#3e4451", black: "#282c34", red: "#e06c75", green: "#98c379", yellow: "#e5c07b", blue: "#61afef", magenta: "#c678dd", cyan: "#56b6c2", white: "#abb2bf", brightBlack: "#5c6370", brightRed: "#e06c75", brightGreen: "#98c379", brightYellow: "#e5c07b", brightBlue: "#61afef", brightMagenta: "#c678dd", brightCyan: "#56b6c2", brightWhite: "#ffffff" },
  "matrix": { background: "#0d0208", foreground: "#00ff41", cursor: "#00ff41", cursorAccent: "#0d0208", selectionBackground: "#0d2818", black: "#000000", red: "#ff3333", green: "#00ff41", yellow: "#ccff00", blue: "#00ccff", magenta: "#cc00ff", cyan: "#00ffff", white: "#ccffcc", brightBlack: "#003b00", brightRed: "#ff6666", brightGreen: "#33ff66", brightYellow: "#e5ff66", brightBlue: "#66ddff", brightMagenta: "#dd66ff", brightCyan: "#66ffff", brightWhite: "#ffffff" },
  "light": { background: "#fafafa", foreground: "#383a42", cursor: "#0066cc", cursorAccent: "#fafafa", selectionBackground: "#b5d5ff", black: "#000000", red: "#e45649", green: "#50a14f", yellow: "#c18401", blue: "#0184bc", magenta: "#a626a4", cyan: "#0997b3", white: "#ffffff", brightBlack: "#808080", brightRed: "#e45649", brightGreen: "#50a14f", brightYellow: "#c18401", brightBlue: "#0184bc", brightMagenta: "#a626a4", brightCyan: "#0997b3", brightWhite: "#ffffff" },
};

// ---------- persisted settings ----------
const store = {
  load() { try { return JSON.parse(localStorage.getItem("mac-term") || "{}"); } catch { return {}; } },
  save(s) { localStorage.setItem("mac-term", JSON.stringify(s)); },
};
const settings = Object.assign({ theme: "tokyo-night", shell: "", fontSize: 13, cursor: "bar", blink: true, blur: true }, store.load());
const save = () => store.save(settings);

// ---------- state ----------
const tabsEl = document.getElementById("tabs");
const termsEl = document.getElementById("terms");
const tabs = new Map(); // tabId -> { page, btn, panes: Map(paneId), activePane, dir }
const panes = new Map(); // paneId -> pane record
let activeTab = null, activePaneId = null, tabCount = 0;
let toastTimer = null;

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2200);
}

// ---------- pane lifecycle ----------
// Perf: rAF-coalesced writes (60fps max), GPU WebGL w/ canvas fallback,
// debounced resize, binary-safe batched backend events.
async function createPane(tab, cwd) {
  const el = document.createElement("div");
  el.className = "pane";
  tab.page.appendChild(el);

  const term = new Terminal({
    fontFamily: '"SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
    fontSize: settings.fontSize,
    lineHeight: 1.28,
    letterSpacing: 0,
    cursorBlink: settings.blink,
    cursorStyle: settings.cursor,
    cursorInactiveStyle: "outline",
    scrollback: 10000,
    scrollSensitivity: 1,
    fastScrollSensitivity: 5,
    theme: THEMES[settings.theme],
    allowProposedApi: true,
    rescaleOverlappingGlyphs: true,
    windowsMode: false,
  });
  const fit = new FitAddon();
  const search = new SearchAddon();
  const unicode = new Unicode11Addon();
  term.loadAddon(unicode);
  unicode.activate(term);
  term.loadAddon(fit);
  term.loadAddon(search);
  term.loadAddon(new WebLinksAddon((e, uri) => {
    e.preventDefault();
    invoke("open_url", { url: uri }).catch(() => window.open(uri, "_blank"));
  }));
  term.open(el);
  try { term.loadAddon(new WebglAddon()); } catch { /* canvas fallback */ }
  fit.fit();

  const id = await invoke("create_terminal", {
    rows: term.rows, cols: term.cols,
    shell: settings.shell || null, cwd: cwd || null,
  });

  // --- 60fps-coalesced write queue (the anti-lag core) ---
  let queue = "", raf = 0;
  const flush = () => { raf = 0; if (queue) { const d = queue; queue = ""; try { term.write(d); } catch {} } };
  const push = (d) => { queue += d; if (!raf) raf = requestAnimationFrame(flush); };

  term.onData((data) => invoke("write_terminal", { id, data }).catch(() => {}));
  const unlisten = await listen(`pty-output-${id}`, (e) => {
    if (e.payload === "__EXIT__") { flush(); term.writeln("\r\n\x1b[2m[process exited — ⌘T new tab]\x1b[0m"); return; }
    push(e.payload);
  });

  // --- debounced PTY resize (no resize storms) ---
  let rzT = null;
  term.onResize(({ rows, cols }) => {
    clearTimeout(rzT);
    rzT = setTimeout(() => invoke("resize_terminal", { id, rows, cols }).catch(() => {}), 80);
    const sb = document.getElementById("term-size");
    if (sb && id === activePaneId) sb.textContent = `${cols}×${rows}`;
  });

  term.onTitleChange((t) => { const r = panes.get(id); if (r) r.title = t; });
  term.attachCustomKeyEventHandler((e) => {
    if (e.metaKey && e.type === "keydown") {
      const k = e.key.toLowerCase();
      if (["c", "v", "a", "f", "t", "w", "d", "p", "+", "-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(k)) return false; // let app handle
    }
    return true;
  });

  const rec = { id, tabId: tab.id, term, fit, search, el, unlisten, title: "" };
  panes.set(id, rec);
  tab.panes.set(id, rec);
  el.addEventListener("mousedown", () => focusPane(id), true);
  el.addEventListener("focusin", () => focusPane(id));
  return rec;
}

async function destroyPane(id) {
  const r = panes.get(id);
  if (!r) return;
  try { await r.unlisten(); } catch {}
  try { await invoke("close_terminal", { id }); } catch {}
  try { r.term.dispose(); } catch {}
  r.el.remove();
  panes.delete(id);
  const tab = tabs.get(r.tabId);
  if (tab) tab.panes.delete(id);
}

// ---------- tabs & splits ----------
async function newTab() {
  tabCount++;
  const tabId = `tab-${Date.now()}-${tabCount}`;
  const page = document.createElement("div");
  page.className = "tab-page dir-row";
  termsEl.appendChild(page);
  const btn = document.createElement("button");
  btn.className = "tab";
  btn.innerHTML = `<span class="dot"></span><span class="lbl">Terminal ${tabCount}</span>`;
  const x = document.createElement("span");
  x.className = "x"; x.textContent = "✕";
  x.onclick = (ev) => { ev.stopPropagation(); closeTab(tabId); };
  btn.appendChild(x);
  btn.onclick = () => activateTab(tabId);
  tabsEl.appendChild(btn);
  const tab = { id: tabId, page, btn, panes: new Map(), dir: "row" };
  tabs.set(tabId, tab);
  activateTab(tabId);
  refreshTabDensity();
  const rec = await createPane(tab, null);
  focusPane(rec.id);
  requestAnimationFrame(fitAll);
}

async function closeTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  for (const pid of [...tab.panes.keys()]) await destroyPane(pid);
  tab.page.remove(); tab.btn.remove();
  tabs.delete(tabId);
  refreshTabDensity();
  if (activeTab === tabId) {
    const rest = [...tabs.keys()];
    if (rest.length) { activateTab(rest[rest.length - 1]); const t = tabs.get(rest[rest.length - 1]); focusPane(t.activePane || [...t.panes.keys()][0]); }
    else { activeTab = null; activePaneId = null; newTab(); }
  }
}

function refreshTabDensity() {
  const n = tabs.size;
  tabsEl.classList.toggle("many", n >= 4 && n < 7);
  tabsEl.classList.toggle("crowded", n >= 7);
  const sc = document.getElementById("tab-scroll");
  const active = tabsEl.querySelector(".tab.active");
  if (sc && active) sc.scrollTo({ left: active.offsetLeft - 40, behavior: "smooth" });
}
function activateTab(tabId) {
  activeTab = tabId;
  for (const [tid, t] of tabs) {
    const on = tid === tabId;
    t.page.classList.toggle("active", on);
    t.btn.classList.toggle("active", on);
  }
  const t = tabs.get(tabId);
  if (t) {
    const pid = t.activePane || [...t.panes.keys()][0];
    if (pid) focusPane(pid);
  }
  refreshTabDensity();
  requestAnimationFrame(fitAll);
}

function focusPane(pid) {
  const r = panes.get(pid);
  if (!r) return;
  activePaneId = pid;
  const tab = tabs.get(r.tabId);
  if (tab) tab.activePane = pid;
  for (const [, p] of panes) p.el.classList.toggle("focused", p.id === pid);
  const lbl = document.getElementById("pane-label");
  if (lbl) lbl.textContent = r.title ? r.title.slice(0, 80) : `pane ${[...(tab?.panes.keys() || [])].indexOf(pid) + 1} of ${tab?.panes.size || 1}`;
  const sb = document.getElementById("term-size");
  if (sb) sb.textContent = `${r.term.cols}×${r.term.rows}`;
  r.term.focus();
}

async function splitActive(dir) {
  const tab = tabs.get(activeTab);
  const cur = panes.get(activePaneId);
  if (!tab || !cur) { toast("Open a terminal first"); return; }
  if (tab.panes.size >= 4) { toast("Max 4 panes per tab"); return; }
  const want = dir === "col" ? "dir-col" : "dir-row";
  tab.page.classList.remove("dir-row", "dir-col");
  tab.page.classList.add(want);
  tab.dir = dir;
  const rec = await createPane(tab, null);
  focusPane(rec.id);
  requestAnimationFrame(fitAll);
}

async function closeActivePane() {
  const tab = tabs.get(activeTab);
  if (!tab) return;
  if (tab.panes.size <= 1) { closeTab(activeTab); return; }
  const pid = activePaneId;
  const ids = [...tab.panes.keys()];
  const next = ids.find((i) => i !== pid);
  await destroyPane(pid);
  if (next) focusPane(next);
  requestAnimationFrame(fitAll);
}

function fitAll() {
  for (const [, p] of panes) {
    try {
      if (p.tabId === activeTab) { p.fit.fit(); }
    } catch {}
  }
  const r = panes.get(activePaneId);
  const sb = document.getElementById("term-size");
  if (r && sb) sb.textContent = `${r.term.cols}×${r.term.rows}`;
}
let winRz = null;
window.addEventListener("resize", () => { clearTimeout(winRz); winRz = setTimeout(fitAll, 100); });

// ---------- zoom / font ----------
function setFontSize(n) {
  settings.fontSize = Math.max(10, Math.min(20, n));
  document.getElementById("font-val").textContent = settings.fontSize;
  document.getElementById("set-font").value = settings.fontSize;
  for (const [, p] of panes) { p.term.options.fontSize = settings.fontSize; }
  save(); requestAnimationFrame(fitAll);
}

// ---------- clipboard ----------
async function copySel() {
  const r = panes.get(activePaneId);
  if (!r) return;
  const sel = r.term.getSelection();
  if (sel) { try { await navigator.clipboard.writeText(sel); toast("Copied"); } catch { toast("Copy failed"); } }
}
async function pasteClip() {
  const r = panes.get(activePaneId);
  if (!r) return;
  try {
    const t = await navigator.clipboard.readText();
    if (t) await invoke("write_terminal", { id: r.id, data: t });
  } catch { toast("Paste needs clipboard permission"); }
}
async function selectAll() { panes.get(activePaneId)?.term.selectAll(); }
function clearPane() { panes.get(activePaneId)?.term.clear(); }

// ---------- search ----------
const searchBar = document.getElementById("search-bar");
const searchInput = document.getElementById("search-input");
function toggleSearch(force) {
  const show = force !== undefined ? force : searchBar.classList.contains("hidden");
  searchBar.classList.toggle("hidden", !show);
  if (show) { searchInput.focus(); searchInput.select(); }
  else panes.get(activePaneId)?.term.focus();
}
function searchGo(dir) {
  const r = panes.get(activePaneId);
  if (!r || !searchInput.value) return;
  if (dir > 0) r.search.findNext(searchInput.value, { incremental: false });
  else r.search.findPrevious(searchInput.value, { incremental: false });
}
document.getElementById("search-btn").onclick = () => toggleSearch();
document.getElementById("search-next").onclick = () => searchGo(1);
document.getElementById("search-prev").onclick = () => searchGo(-1);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") toggleSearch(false);
  else if (e.key === "Enter") searchGo(e.shiftKey ? -1 : 1);
});

// ---------- command palette ----------
const COMMANDS = [
  { name: "New tab", hint: "⌘T", run: () => newTab() },
  { name: "Split vertical", hint: "⌘D", run: () => splitActive("row") },
  { name: "Split horizontal", hint: "⇧⌘D", run: () => splitActive("col") },
  { name: "Close pane / tab", hint: "⌘W", run: () => closeActivePane() },
  { name: "Search in terminal", hint: "⌘F", run: () => toggleSearch(true) },
  { name: "Copy selection", hint: "⌘C", run: () => copySel() },
  { name: "Paste", hint: "⌘V", run: () => pasteClip() },
  { name: "Select all", hint: "⌘A", run: () => selectAll() },
  { name: "Clear pane", hint: "⌘K", run: () => clearPane() },
  { name: "Zoom in", hint: "⌘+", run: () => setFontSize(settings.fontSize + 1) },
  { name: "Zoom out", hint: "⌘-", run: () => setFontSize(settings.fontSize - 1) },
  { name: "Reset zoom", hint: "⌘0", run: () => setFontSize(13) },
  { name: "Cycle theme", hint: "", run: () => cycleTheme() },
  { name: "Show global hotkey", hint: "", run: () => toast("Global hotkey: " + (settings.hotkey || "unavailable")) },
  { name: "Toggle settings", hint: "", run: () => toggleSettings() },
];
const palEl = document.getElementById("palette");
const palInput = document.getElementById("palette-input");
const palList = document.getElementById("palette-list");
let palSel = 0, palFiltered = COMMANDS;
function openPalette() {
  palEl.classList.remove("hidden");
  palInput.value = ""; renderPal(COMMANDS); palInput.focus();
}
function closePalette() { palEl.classList.add("hidden"); panes.get(activePaneId)?.term.focus(); }
function renderPal(list) {
  palFiltered = list; palSel = 0;
  palList.innerHTML = "";
  list.forEach((c, i) => {
    const d = document.createElement("div");
    d.className = "pal-item" + (i === 0 ? " sel" : "");
    const a = document.createElement("span"); a.textContent = c.name;
    const b = document.createElement("span"); b.className = "hint"; b.textContent = c.hint;
    d.append(a, b);
    d.onclick = () => { closePalette(); c.run(); };
    d.onmousemove = () => { palSel = i; paintPalSel(); };
    palList.appendChild(d);
  });
}
function paintPalSel() { [...palList.children].forEach((d, i) => d.classList.toggle("sel", i === palSel)); }
palInput.addEventListener("input", () => {
  const q = palInput.value.toLowerCase();
  renderPal(COMMANDS.filter((c) => c.name.toLowerCase().includes(q)));
});
palInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePalette();
  else if (e.key === "ArrowDown") { e.preventDefault(); palSel = Math.min(palFiltered.length - 1, palSel + 1); paintPalSel(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); palSel = Math.max(0, palSel - 1); paintPalSel(); }
  else if (e.key === "Enter") { const c = palFiltered[palSel]; if (c) { closePalette(); c.run(); } }
});
document.getElementById("palette-btn").onclick = openPalette;

// ---------- themes ----------
function applyTheme(name) {
  settings.theme = name;
  document.body.dataset.theme = name;
  document.getElementById("set-theme").value = name;
  for (const [, p] of panes) p.term.options.theme = THEMES[name];
  save();
}
function cycleTheme() {
  const order = Object.keys(THEMES);
  applyTheme(order[(order.indexOf(settings.theme) + 1) % order.length]);
  toast(`Theme: ${settings.theme}`);
}

// ---------- settings drawer ----------
const setEl = document.getElementById("settings");
function toggleSettings(force) {
  const show = force !== undefined ? force : setEl.classList.contains("hidden");
  setEl.classList.toggle("hidden", !show);
}
document.getElementById("settings-btn").onclick = () => toggleSettings();
document.getElementById("set-theme").onchange = (e) => applyTheme(e.target.value);
document.getElementById("set-shell").onchange = (e) => { settings.shell = e.target.value; save(); toast("Shell applies to new tabs"); };
document.getElementById("set-font").oninput = (e) => setFontSize(+e.target.value);
document.getElementById("set-cursor").onchange = (e) => { settings.cursor = e.target.value; for (const [, p] of panes) p.term.options.cursorStyle = settings.cursor; save(); };
document.getElementById("set-blink").onchange = (e) => { settings.blink = e.target.checked; for (const [, p] of panes) p.term.options.cursorBlink = settings.blink; save(); };
document.getElementById("set-blur").onchange = (e) => { settings.blur = e.target.checked; document.body.classList.toggle("no-blur", !settings.blur); save(); };

// ---------- global shortcuts ----------
window.addEventListener("keydown", (e) => {
  if (!e.metaKey && !e.ctrlKey) return;
  const k = e.key.toLowerCase();
  if (e.metaKey && e.shiftKey && k === "p") { e.preventDefault(); palEl.classList.contains("hidden") ? openPalette() : closePalette(); }
  else if (e.metaKey && e.shiftKey && k === "d") { e.preventDefault(); splitActive("col"); }
  else if (e.metaKey && k === "t") { e.preventDefault(); newTab(); }
  else if (e.metaKey && k === "w") { e.preventDefault(); closeActivePane(); }
  else if (e.metaKey && k === "d") { e.preventDefault(); splitActive("row"); }
  else if (e.metaKey && k === "f") { e.preventDefault(); toggleSearch(); }
  else if (e.metaKey && k === "v") { e.preventDefault(); pasteClip(); }
  else if (e.metaKey && k === "a") { e.preventDefault(); selectAll(); }
  else if (e.metaKey && k === "k") { e.preventDefault(); clearPane(); }
  else if (e.metaKey && (k === "=" || k === "+")) { e.preventDefault(); setFontSize(settings.fontSize + 1); }
  else if (e.metaKey && k === "-") { e.preventDefault(); setFontSize(settings.fontSize - 1); }
  else if (e.metaKey && k === "0") { e.preventDefault(); setFontSize(13); }
  else if (e.metaKey && /^[1-9]$/.test(k)) { const ids = [...tabs.keys()]; if (ids[+k - 1]) activateTab(ids[+k - 1]); }
});

// ---------- window dragging (bulletproof) ----------
// Explicit startDragging on empty titlebar space, so the window always
// moves even where native drag regions misbehave on transparent windows.
try {
  const appWin = getCurrentWindow();
  document.getElementById("titlebar").addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button, input, select, textarea, a")) return;
    appWin.startDragging().catch(() => {});
  });
} catch {}

// ---------- global hotkey: summon the terminal from anywhere ----------
async function toggleWin() {
  try {
    const w = getCurrentWindow();
    if (await w.isFocused()) await w.hide();
    else { await w.show(); await w.setFocus(); }
  } catch {}
}
async function setupHotkey() {
  for (const hk of ["Alt+Space", "Control+`"]) {
    try {
      await registerHotkey(hk, (e) => { if (e.state === "Pressed") toggleWin(); });
      settings.hotkey = hk; save();
      const hv = document.getElementById("hotkey-val");
      if (hv) hv.textContent = hk;
      return;
    } catch { /* taken — try next */ }
  }
  const hv = document.getElementById("hotkey-val");
  if (hv) hv.textContent = "unavailable";
}

// ---------- boot ----------
document.getElementById("new-tab").onclick = newTab;
document.getElementById("split-v").onclick = () => splitActive("row");
document.getElementById("split-h").onclick = () => splitActive("col");
document.body.dataset.theme = settings.theme;
document.getElementById("set-theme").value = settings.theme;
document.getElementById("set-shell").value = settings.shell;
document.getElementById("set-font").value = settings.fontSize;
document.getElementById("font-val").textContent = settings.fontSize;
document.getElementById("set-cursor").value = settings.cursor;
document.getElementById("set-blink").checked = settings.blink;
document.getElementById("set-blur").checked = settings.blur;
document.body.classList.toggle("no-blur", !settings.blur);
invoke("default_shell").then((s) => {
  document.getElementById("shell-label").textContent = String(s).split("/").pop();
}).catch(() => {});
setupHotkey();
newTab();





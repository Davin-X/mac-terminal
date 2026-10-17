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

// ---------- full 16-color themes ----------
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
const DEFAULTS = {
  theme: "tokyo-night",
  shell: "",
  // Only single-width "Mono" Nerd Fonts go here: their icon glyphs occupy
  // exactly one cell. The proportional ("Propo") and non-Mono variants paint
  // icons wider than a cell, which overlaps the next character and breaks
  // terminal alignment — see the font preview in Settings.
  fontFamily: '"JetBrainsMono Nerd Font Mono", "MesloLGS NF", "Hack Nerd Font Mono", "FiraCode Nerd Font Mono", "Apple Color Emoji", Menlo, Monaco, monospace',
  fontSize: 13,
  lineHeight: 1.28,
  padding: 6,
  scrollback: 10000,
  cursor: "bar",
  blink: true,
  blur: true,
  opacity: 100,
  copyOnSelect: false,
  confirmClose: false,
};
const store = {
  load() { try { return JSON.parse(localStorage.getItem("mac-term") || "{}"); } catch { return {}; } },
  save(s) { localStorage.setItem("mac-term", JSON.stringify(s)); },
};
const settings = Object.assign({}, DEFAULTS, store.load());
const save = () => store.save(settings);
const $ = (id) => document.getElementById(id);

// Migrations:
//  v2 — "SF Mono" is not actually installed on macOS, so the old default
//       silently fell back to Menlo; move it to a Nerd Font so icons render.
//  v3 — proportional ("Propo") and non-Mono Nerd Fonts paint icons wider than
//       one cell, so they overlap the next glyph and break alignment. Only
//       single-width Mono variants are safe in a terminal.
const OLD_FONTS = [
  '"SF Mono", Menlo, monospace',
  '"SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
];
const KNOWN_GOOD_FONTS = new Set([...document.querySelectorAll("#set-font-family option")].map((o) => o.value));
const isSingleWidthFont = (f) => KNOWN_GOOD_FONTS.has(f) || !/Nerd Font(?! Mono)/.test(f);
let migratedFont = false;
if ((settings.v || 1) < 3) {
  if (OLD_FONTS.includes(settings.fontFamily) || !isSingleWidthFont(settings.fontFamily)) {
    settings.fontFamily = DEFAULTS.fontFamily;
    migratedFont = true;
  }
}
settings.v = 3;
save();

// ---------- state ----------
const tabsEl = $("tabs");
const termsEl = $("terms");
const tabs = new Map(); // tabId -> { id, n, page, btn, lbl, panes, activePane, dir, title, customTitle }
const panes = new Map(); // paneId -> pane record
let activeTab = null, activePaneId = null, tabCount = 0;
let broadcast = false;
let dragTabId = null;

// ---------- toast (stacked) ----------
const toaster = $("toaster");
function toast(msg, ms = 2200) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  toaster.appendChild(t);
  while (toaster.children.length > 4) toaster.firstChild.remove();
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 320); }, ms);
}

// ---------- chrome (theme / glass / padding) ----------
function applyChrome() {
  document.body.dataset.theme = settings.theme;
  document.body.classList.toggle("no-blur", !settings.blur);
  document.documentElement.style.setProperty("--op", String(settings.opacity / 100));
  document.documentElement.style.setProperty("--pad", `${settings.padding}px`);
  $("zoom-label").textContent = `${Math.round((settings.fontSize / 13) * 100)}%`;
}

function termOptions() {
  return {
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    letterSpacing: 0,
    cursorBlink: settings.blink,
    cursorStyle: settings.cursor,
    cursorInactiveStyle: "outline",
    scrollback: settings.scrollback,
    scrollSensitivity: 1,
    fastScrollSensitivity: 5,
    theme: THEMES[settings.theme] || THEMES["tokyo-night"],
    allowProposedApi: true,
    rescaleOverlappingGlyphs: true,
    windowsMode: false,
  };
}

// Live sample: shows the picked font with real icon glyphs, so a font that is
// missing them (boxes) or too wide (Propo) is obvious before it "doesn't work".
const FONT_SAMPLE = "\uE0B0 \uF07B ~/dev \uE0A0 main \uF121 app.ts \uE0B0 \u276F";
function updateFontPreview() {
  const el = $("font-preview");
  if (!el) return;
  const hasIcons = /Nerd Font Mono|MesloLGS NF/.test(settings.fontFamily);
  el.style.fontFamily = settings.fontFamily;
  el.replaceChildren();
  const sample = document.createElement("span");
  sample.className = "sample";
  sample.style.fontSize = `${settings.fontSize + 3}px`;
  sample.textContent = FONT_SAMPLE;
  const tag = document.createElement("span");
  tag.className = hasIcons ? "tag" : "tag warn";
  tag.textContent = hasIcons ? "icons render" : "no icon glyphs — shows boxes";
  el.append(sample, tag);
}

// refresh live terminal options after a settings change
function rethemeTerms() {
  for (const [, p] of panes) {
    const o = p.term.options;
    o.theme = THEMES[settings.theme];
    o.fontFamily = settings.fontFamily;
    o.fontSize = settings.fontSize;
    o.lineHeight = settings.lineHeight;
    o.cursorStyle = settings.cursor;
    o.cursorBlink = settings.blink;
    o.scrollback = settings.scrollback;
    // The WebGL renderer rasterises glyphs into a cached texture atlas keyed by
    // the current font metrics. Without dropping it, a font change keeps drawing
    // the old glyphs, so the new font appears to "not work".
    try { p.webgl?.clearTextureAtlas?.(); } catch { /* canvas renderer */ }
  }
}

// ---------- pane lifecycle ----------
// Perf: rAF-coalesced writes (60fps max), GPU WebGL w/ canvas fallback,
// debounced resize, binary-safe batched backend events.
async function createPane(tab, cwd, beforeEl) {
  const el = document.createElement("div");
  el.className = "pane";
  if (beforeEl) tab.page.insertBefore(el, beforeEl);
  else tab.page.appendChild(el);

  const term = new Terminal(termOptions());
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
  let webgl = null;
  try { webgl = new WebglAddon(); term.loadAddon(webgl); } catch { /* canvas fallback */ }
  fit.fit();

  const id = await invoke("create_terminal", {
    rows: term.rows, cols: term.cols,
    shell: settings.shell || null, cwd: cwd || null,
  });

  // --- 60fps-coalesced write queue (the anti-lag core) ---
  let queue = "", raf = 0;
  const flush = () => { raf = 0; if (queue) { const d = queue; queue = ""; try { term.write(d); } catch {} } };
  const push = (d) => { queue += d; if (!raf) raf = requestAnimationFrame(flush); };

  const rec = {
    id, tabId: tab.id, term, fit, search, el, webgl,
    unlisten: null, title: "", cwd: cwd || "", busy: false,
  };

  // --- busy pulse: light the tab dot while output is streaming ---
  let busyTimer = null;
  const markBusy = () => {
    if (!rec.busy) { rec.busy = true; tab.btn.classList.add("busy"); }
    clearTimeout(busyTimer);
    busyTimer = setTimeout(() => { rec.busy = false; tab.btn.classList.remove("busy"); }, 480);
  };

  // --- keyboard: hand every ⌘ combo to the app, keep Ctrl-C etc. in the shell ---
  term.attachCustomKeyEventHandler((e) => {
    if (e.type !== "keydown") return true;
    if (e.metaKey) return false;
    if (e.ctrlKey && (e.key === "Tab" || e.key === "`")) return false;
    return true;
  });

  // --- broadcast-aware input ---
  term.onData((data) => {
    if (broadcast && tab.panes.size > 1) {
      for (const [, p] of tab.panes) invoke("write_terminal", { id: p.id, data }).catch(() => {});
    } else {
      invoke("write_terminal", { id, data }).catch(() => {});
    }
  });

  // --- copy on select ---
  term.onSelectionChange(() => {
    if (!settings.copyOnSelect) return;
    const sel = term.getSelection();
    if (sel) navigator.clipboard.writeText(sel).catch(() => {});
  });

  rec.unlisten = await listen(`pty-output-${id}`, (e) => {
    if (e.payload === "__EXIT__") {
      flush();
      term.writeln("\r\n\x1b[2m[process exited — ⌘R to restart, ⌘T for a new tab]\x1b[0m");
      tab.btn.classList.remove("busy");
      return;
    }
    markBusy();
    push(e.payload);
  });

  // --- debounced PTY resize (no resize storms) ---
  let rzT = null;
  term.onResize(({ rows, cols }) => {
    clearTimeout(rzT);
    rzT = setTimeout(() => invoke("resize_terminal", { id, rows, cols }).catch(() => {}), 80);
    if (id === activePaneId) $("term-size").textContent = `${cols}×${rows}`;
  });

  // --- shell title -> tab label ---
  term.onTitleChange((t) => {
    rec.title = t;
    if (t && (id === tab.activePane || !tab.title)) { tab.title = t; updateTabLabel(tab); }
  });

  // --- OSC 7 cwd tracking (emitted by many zsh/fish configs) ---
  try {
    term.parser.registerOscHandler(7, (data) => {
      const m = /^file:\/\/[^/]*(\/.*)$/.exec(data);
      if (m) {
        rec.cwd = decodeURIComponent(m[1]);
        if (id === activePaneId) updateCwd();
      }
      return true;
    });
  } catch { /* older xterm */ }

  // --- search match counter ---
  try {
    search.onDidChangeResults(({ resultIndex, resultCount }) => {
      if (id !== activePaneId) return;
      setSearchCount(resultIndex, resultCount);
    });
  } catch { /* addon too old */ }

  panes.set(id, rec);
  tab.panes.set(id, rec);
  el.addEventListener("mousedown", () => focusPane(id), true);
  el.addEventListener("focusin", () => focusPane(id));
  return rec;
}

async function destroyPane(id) {
  const r = panes.get(id);
  if (!r) return;
  try { if (r.unlisten) await r.unlisten(); } catch {}
  try { await invoke("close_terminal", { id }); } catch {}
  try { r.term.dispose(); } catch {}
  r.el.remove();
  panes.delete(id);
  const tab = tabs.get(r.tabId);
  if (tab) tab.panes.delete(id);
}

// ---------- tabs ----------
async function newTab() {
  tabCount++;
  const tabId = `tab-${Date.now()}-${tabCount}`;
  const page = document.createElement("div");
  page.className = "tab-page dir-row";
  termsEl.appendChild(page);

  const btn = document.createElement("button");
  btn.className = "tab";
  btn.draggable = true;
  const dot = document.createElement("span"); dot.className = "dot";
  const lbl = document.createElement("span"); lbl.className = "lbl";
  const x = document.createElement("span"); x.className = "x";
  x.innerHTML = '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  x.title = "Close tab";
  btn.append(dot, lbl, x);
  tabsEl.appendChild(btn);

  x.onclick = (ev) => { ev.stopPropagation(); closeTab(tabId); };
  btn.onclick = () => activateTab(tabId);
  btn.addEventListener("dblclick", (ev) => { ev.stopPropagation(); startRename(tabId); });
  btn.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    activateTab(tabId);
    openCtx(tabMenuItems(tabId), ev.clientX, ev.clientY);
  });
  wireTabDrag(btn, tabId);

  const tab = {
    id: tabId, n: tabCount, page, btn, lbl,
    panes: new Map(), activePane: null, dir: "row", title: "", customTitle: "",
  };
  tabs.set(tabId, tab);
  updateTabLabel(tab);
  activateTab(tabId);
  refreshTabDensity();

  const rec = await createPane(tab, null);
  focusPane(rec.id);
  requestAnimationFrame(fitAll);
}

function tabLabel(tab) { return tab.customTitle || tab.title || `Terminal ${tab.n}`; }

function updateTabLabel(tab) {
  if (tab.renaming) return;
  tab.lbl.textContent = tabLabel(tab);
  tab.btn.title = tabLabel(tab);
}

function startRename(tabId) {
  const tab = tabs.get(tabId);
  if (!tab || tab.renaming) return;
  tab.renaming = true;
  tab.btn.draggable = false;
  const input = document.createElement("input");
  input.value = tabLabel(tab);
  tab.lbl.textContent = "";
  tab.lbl.appendChild(input);
  input.focus();
  input.select();
  const commit = (keep) => {
    if (!tab.renaming) return;
    tab.renaming = false;
    tab.btn.draggable = true;
    const v = input.value.trim();
    if (keep && v) tab.customTitle = v;
    if (keep && !v) tab.customTitle = "";
    tab.lbl.textContent = "";
    updateTabLabel(tab);
  };
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") commit(true);
    else if (e.key === "Escape") commit(false);
  });
  input.addEventListener("blur", () => commit(true));
  input.addEventListener("mousedown", (e) => e.stopPropagation());
  input.addEventListener("click", (e) => e.stopPropagation());
}

function wireTabDrag(btn, tabId) {
  btn.addEventListener("dragstart", (e) => {
    dragTabId = tabId;
    btn.classList.add("dragging");
    try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", tabId); } catch {}
  });
  btn.addEventListener("dragend", () => {
    dragTabId = null;
    btn.classList.remove("dragging");
    for (const t of tabsEl.children) t.classList.remove("drop-target");
  });
  btn.addEventListener("dragover", (e) => {
    if (!dragTabId || dragTabId === tabId) return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = "move"; } catch {}
    const r = btn.getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    btn.classList.toggle("drop-target", !after);
    btn.dataset.after = after ? "1" : "";
    for (const t of tabsEl.children) if (t !== btn) t.classList.remove("drop-target");
  });
  btn.addEventListener("drop", (e) => {
    e.preventDefault();
    const from = dragTabId;
    if (!from || from === tabId) return;
    const after = btn.dataset.after === "1";
    const moved = tabs.get(from);
    if (!moved) return;
    // reorder the Map so ⌘1-9 and cycling follow visual order
    const order = [...tabs.keys()].filter((k) => k !== from);
    const at = order.indexOf(tabId) + (after ? 1 : 0);
    order.splice(at, 0, from);
    const next = new Map();
    for (const k of order) next.set(k, tabs.get(k));
    tabs.clear();
    for (const [k, v] of next) tabs.set(k, v);
    // reorder the DOM
    const ref = after ? btn.nextSibling : btn;
    tabsEl.insertBefore(moved.btn, ref);
    for (const t of tabsEl.children) t.classList.remove("drop-target");
    dragTabId = null;
  });
}

async function closeTab(tabId, force) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  if (!force && settings.confirmClose && tab.panes.size) {
    const ok = await confirmAsk(
      "Close tab?",
      `“${tabLabel(tab)}” has ${tab.panes.size} pane${tab.panes.size > 1 ? "s" : ""}. Any running processes will be terminated.`,
      "Close tab"
    );
    if (!ok) return;
  }
  if (tab.renaming) tab.renaming = false;
  for (const pid of [...tab.panes.keys()]) await destroyPane(pid);
  tab.page.remove(); tab.btn.remove();
  tabs.delete(tabId);
  refreshTabDensity();
  if (activeTab === tabId) {
    const rest = [...tabs.keys()];
    if (rest.length) {
      const next = rest[rest.length - 1];
      activateTab(next);
      const t = tabs.get(next);
      focusPane(t.activePane || [...t.panes.keys()][0]);
    } else {
      activeTab = null; activePaneId = null;
      newTab();
    }
  }
}

function refreshTabDensity() {
  const n = tabs.size;
  tabsEl.classList.toggle("many", n >= 4 && n < 7);
  tabsEl.classList.toggle("crowded", n >= 7);
  const sc = $("tab-scroll");
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

function updateCwd() {
  const r = panes.get(activePaneId);
  const el = $("cwd-label");
  if (!el) return;
  if (!r || !r.cwd) { el.textContent = ""; el.title = ""; return; }
  const home = r.cwd.replace(/^\/Users\/[^/]+/, "~");
  el.textContent = home;
  el.title = r.cwd;
}

function focusPane(pid) {
  const r = panes.get(pid);
  if (!r) return;
  activePaneId = pid;
  const tab = tabs.get(r.tabId);
  if (tab) tab.activePane = pid;
  for (const [, p] of panes) {
    p.el.classList.toggle("focused", p.id === pid);
    p.el.classList.toggle("broadcast", broadcast && p.tabId === r.tabId);
  }
  const lbl = $("pane-label");
  if (lbl) lbl.textContent = r.title ? r.title.slice(0, 80) : `pane ${[...(tab?.panes.keys() || [])].indexOf(pid) + 1} of ${tab?.panes.size || 1}`;
  const sb = $("term-size");
  if (sb) sb.textContent = `${r.term.cols}×${r.term.rows}`;
  updateCwd();
  r.term.focus();
}

function cycleTab(dir) {
  const ids = [...tabs.keys()];
  if (ids.length < 2) return;
  const i = ids.indexOf(activeTab);
  activateTab(ids[(i + dir + ids.length) % ids.length]);
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
  const rec = await createPane(tab, cur.cwd || null);
  if (broadcast) rec.el.classList.add("broadcast");
  focusPane(rec.id);
  requestAnimationFrame(fitAll);
}

async function closeActivePane() {
  const tab = tabs.get(activeTab);
  if (!tab) return;
  if (tab.panes.size <= 1) { closeTab(activeTab); return; }
  const pid = activePaneId;
  const ids = [...tab.panes.keys()];
  const i = ids.indexOf(pid);
  const next = ids[i + 1] || ids[i - 1];
  await destroyPane(pid);
  if (next) focusPane(next);
  requestAnimationFrame(fitAll);
}

async function restartActivePane() {
  const tab = tabs.get(activeTab);
  const cur = panes.get(activePaneId);
  if (!tab || !cur) { toast("No active pane"); return; }
  const cwd = cur.cwd || null;
  const beforeEl = cur.el.nextSibling;
  const wasBroadcast = broadcast;
  await destroyPane(cur.id);
  const rec = await createPane(tab, cwd, beforeEl);
  if (wasBroadcast) rec.el.classList.add("broadcast");
  focusPane(rec.id);
  requestAnimationFrame(fitAll);
}

function fitAll() {
  for (const [, p] of panes) {
    if (p.tabId !== activeTab) continue;
    try { p.fit.fit(); } catch {}
  }
  const r = panes.get(activePaneId);
  const sb = $("term-size");
  if (r && sb) sb.textContent = `${r.term.cols}×${r.term.rows}`;
}
let winRz = null;
window.addEventListener("resize", () => {
  clearTimeout(winRz);
  winRz = setTimeout(() => { fitAll(); syncFullscreen(); }, 100);
});

// ---------- broadcast ----------
function setBroadcast(on) {
  broadcast = on;
  $("broadcast-btn").setAttribute("aria-pressed", String(on));
  $("broadcast-badge").classList.toggle("hidden", !on);
  const tab = tabs.get(activeTab);
  for (const [, p] of panes) p.el.classList.toggle("broadcast", on && p.tabId === activeTab);
  if (tab && tab.panes.size < 2 && on) toast("Broadcast on — split a pane to fan out");
}
function toggleBroadcast() { setBroadcast(!broadcast); toast(`Broadcast input ${broadcast ? "on" : "off"}`); }

// ---------- zoom / font ----------
function setFontSize(n) {
  settings.fontSize = Math.max(10, Math.min(20, n));
  $("font-val").textContent = settings.fontSize;
  $("set-font").value = settings.fontSize;
  updateFontPreview();
  rethemeTerms();
  applyChrome();
  save();
  requestAnimationFrame(fitAll);
}

// ---------- clipboard ----------
async function copySel() {
  const r = panes.get(activePaneId);
  if (!r) return;
  const sel = r.term.getSelection();
  if (sel) { try { await navigator.clipboard.writeText(sel); toast("Copied"); } catch { toast("Copy failed"); } }
  else toast("Nothing selected");
}
async function pasteClip() {
  const r = panes.get(activePaneId);
  if (!r) return;
  try {
    const t = await navigator.clipboard.readText();
    if (t) await invoke("write_terminal", { id: r.id, data: t });
  } catch { toast("Paste needs clipboard permission"); }
}
function selectAll() { panes.get(activePaneId)?.term.selectAll(); }
function clearPane() { panes.get(activePaneId)?.term.clear(); }
function clearScrollback() {
  const r = panes.get(activePaneId);
  if (r) { r.term.clear(); r.term.write("\x1b[2J\x1b[3J\x1b[H"); }
}

// ---------- search ----------
const searchBar = $("search-bar");
const searchInput = $("search-input");
const searchOpts = { case: false, word: false, regex: false };
const DECOR = {
  matchBackground: "#3d59a1", matchBorder: "#7aa2f7", matchOverviewRuler: "#7aa2f7",
  activeMatchBackground: "#e0af68", activeMatchBorder: "#ffc777", activeMatchColorOverviewRuler: "#e0af68",
};
function setSearchCount(index, count) {
  const el = $("search-count");
  if (!count) { el.textContent = searchInput.value ? "no results" : ""; return; }
  el.textContent = `${Math.max(1, index + 1)}/${count}`;
}
function toggleSearch(force) {
  const show = force !== undefined ? force : searchBar.classList.contains("hidden");
  if (show) closeFloating("search");
  searchBar.classList.toggle("hidden", !show);
  if (show) { searchInput.focus(); searchInput.select(); }
  else {
    $("search-count").textContent = "";
    // drop the match highlights too, so no stale boxes are left behind
    for (const [, p] of panes) { try { p.search.clearDecorations(); } catch {} }
    focusTerm();
  }
}
function searchGo(dir) {
  const r = panes.get(activePaneId);
  if (!r || !searchInput.value) return;
  const opts = {
    caseSensitive: searchOpts.case, wholeWord: searchOpts.word, regex: searchOpts.regex,
    incremental: false, decorations: DECOR,
  };
  try {
    if (dir > 0) r.search.findNext(searchInput.value, opts);
    else r.search.findPrevious(searchInput.value, opts);
  } catch { toast("Invalid search pattern"); }
}
function toggleSearchOpt(btn, key) {
  searchOpts[key] = !searchOpts[key];
  btn.setAttribute("aria-pressed", String(searchOpts[key]));
  if (searchInput.value) searchGo(1);
}
$("search-btn").onclick = () => toggleSearch();
$("search-next").onclick = () => searchGo(1);
$("search-prev").onclick = () => searchGo(-1);
$("search-close").onclick = () => toggleSearch(false);
$("search-case").onclick = (e) => toggleSearchOpt(e.currentTarget, "case");
$("search-word").onclick = (e) => toggleSearchOpt(e.currentTarget, "word");
$("search-regex").onclick = (e) => toggleSearchOpt(e.currentTarget, "regex");
searchInput.addEventListener("input", () => { if (searchInput.value) searchGo(1); else setSearchCount(0, 0); });
searchInput.addEventListener("keydown", (e) => {
  e.stopPropagation();
  if (e.key === "Escape") toggleSearch(false);
  else if (e.key === "Enter") searchGo(e.shiftKey ? -1 : 1);
});

// ---------- command palette ----------
const COMMANDS = [
  { cat: "Tabs", name: "New tab", hint: "⌘T", run: () => newTab() },
  { cat: "Tabs", name: "Close tab", hint: "⇧⌘W", run: () => activeTab && closeTab(activeTab) },
  { cat: "Tabs", name: "Next tab", hint: "⌃Tab", run: () => cycleTab(1) },
  { cat: "Tabs", name: "Previous tab", hint: "⌃⇧Tab", run: () => cycleTab(-1) },
  { cat: "Tabs", name: "Close other tabs", run: () => closeMany([...tabs.keys()].filter((k) => k !== activeTab), "Closing every other tab.") },
  { cat: "Tabs", name: "Close tabs to the left", run: () => { const ids = [...tabs.keys()]; const i = ids.indexOf(activeTab); if (i > 0) closeMany(ids.slice(0, i), "Closing tabs to the left."); } },
  { cat: "Tabs", name: "Close tabs to the right", run: () => { const ids = [...tabs.keys()]; const i = ids.indexOf(activeTab); if (i >= 0) closeMany(ids.slice(i + 1), "Closing tabs to the right."); } },
  { cat: "Tabs", name: "Close all tabs", run: () => closeMany([...tabs.keys()], "Closing every tab.") },
  { cat: "Panes", name: "Split side-by-side", hint: "⌘D", run: () => splitActive("row") },
  { cat: "Panes", name: "Split stacked", hint: "⇧⌘D", run: () => splitActive("col") },
  { cat: "Panes", name: "Close pane or tab", hint: "⌘W", run: () => closeActivePane() },
  { cat: "Panes", name: "Restart pane", hint: "⌘R", run: () => restartActivePane() },
  { cat: "Panes", name: "Toggle broadcast input", hint: "⇧⌘B", run: () => toggleBroadcast() },
  { cat: "Edit", name: "Copy selection", hint: "⌘C", run: () => copySel() },
  { cat: "Edit", name: "Paste", hint: "⌘V", run: () => pasteClip() },
  { cat: "Edit", name: "Select all", hint: "⌘A", run: () => selectAll() },
  { cat: "Edit", name: "Clear pane", hint: "⌘K", run: () => clearPane() },
  { cat: "Edit", name: "Wipe scrollback", hint: "", run: () => clearScrollback() },
  { cat: "Edit", name: "Search in terminal", hint: "⌘F", run: () => toggleSearch(true) },
  { cat: "View", name: "Zoom in", hint: "⌘+", run: () => setFontSize(settings.fontSize + 1) },
  { cat: "View", name: "Zoom out", hint: "⌘-", run: () => setFontSize(settings.fontSize - 1) },
  { cat: "View", name: "Reset zoom", hint: "⌘0", run: () => setFontSize(13) },
  { cat: "View", name: "Cycle theme", hint: "", run: () => cycleTheme() },
  { cat: "View", name: "Toggle glass blur", hint: "", run: () => toggleBlur() },
  { cat: "View", name: "Toggle full screen", hint: "⌃⌘F", run: () => toggleFullscreen() },
  { cat: "View", name: "Toggle settings", hint: "⌘,", run: () => toggleSettings() },
  { cat: "Help", name: "Keyboard shortcuts", hint: "⌘/", run: () => toggleHelp(true) },
  { cat: "Help", name: "Show global hotkey", hint: "", run: () => toast("Global hotkey: " + (settings.hotkey || "unavailable")) },
];
const palEl = $("palette");
const palInput = $("palette-input");
const palList = $("palette-list");
let palSel = 0, palFiltered = COMMANDS, recents = [];

function fuzzy(q, text) {
  if (!q) return 0;
  q = q.toLowerCase(); text = text.toLowerCase();
  let ti = 0, score = 0, streak = 0;
  for (const ch of q) {
    const idx = text.indexOf(ch, ti);
    if (idx === -1) return -1;
    streak = idx === ti ? streak + 1 : 0;
    score += (idx === ti ? 6 : 2) + streak;
    ti = idx + 1;
  }
  if (text.startsWith(q)) score += 14;
  else if (text.includes(q)) score += 8;
  return score;
}

function openPalette() {
  closeFloating("palette");
  palEl.classList.remove("hidden");
  palInput.value = "";
  renderPal(COMMANDS, "");
  palInput.focus();
}
function closePalette() { palEl.classList.add("hidden"); focusTerm(); }

function renderPal(list, q) {
  palFiltered = list;
  palSel = 0;
  palList.innerHTML = "";
  if (!list.length) {
    const d = document.createElement("div");
    d.className = "pal-empty"; d.textContent = "No matching commands";
    palList.appendChild(d);
    return;
  }
  let lastCat = null;
  list.forEach((c, i) => {
    if (c.cat !== lastCat) {
      lastCat = c.cat;
      const h = document.createElement("div");
      h.className = "pal-group"; h.textContent = c.cat;
      palList.appendChild(h);
    }
    const d = document.createElement("div");
    d.className = "pal-item" + (i === 0 ? " sel" : "");
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = c.name;
    const hint = document.createElement("span"); hint.className = "hint"; hint.textContent = c.hint || "";
    d.append(nm, hint);
    d.onclick = () => { closePalette(); c.run(); };
    d.onmousemove = () => { palSel = i; paintPalSel(); };
    palList.appendChild(d);
  });
}
function paintPalSel() {
  [...palList.querySelectorAll(".pal-item")].forEach((d, i) => d.classList.toggle("sel", i === palSel));
  const sel = palList.querySelectorAll(".pal-item")[palSel];
  sel?.scrollIntoView({ block: "nearest" });
}
function palFilter(q) {
  if (!q) {
    // show recents first when the box is empty
    const rec = recents.map((n) => COMMANDS.find((c) => c.name === n)).filter(Boolean);
    const rest = COMMANDS.filter((c) => !recents.includes(c.name));
    return [...rec, ...rest];
  }
  return COMMANDS
    .map((c) => {
      const s = Math.max(fuzzy(q, c.name), fuzzy(q, c.cat + " " + c.name) - 4);
      return { c, s: s + (recents.includes(c.name) ? 6 : 0) };
    })
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
}
palInput.addEventListener("input", () => renderPal(palFilter(palInput.value.trim()), palInput.value.trim()));
palInput.addEventListener("keydown", (e) => {
  e.stopPropagation();
  if (e.key === "Escape") closePalette();
  else if (e.key === "ArrowDown") { e.preventDefault(); palSel = Math.min(palFiltered.length - 1, palSel + 1); paintPalSel(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); palSel = Math.max(0, palSel - 1); paintPalSel(); }
  else if (e.key === "Enter") {
    const c = palFiltered[palSel];
    if (c) {
      recents = [c.name, ...recents.filter((n) => n !== c.name)].slice(0, 4);
      closePalette();
      c.run();
    }
  }
});
$("palette-btn").onclick = () => (palEl.classList.contains("hidden") ? openPalette() : closePalette());
$("palette-close").onclick = () => closePalette();

// ---------- themes ----------
function applyTheme(name) {
  settings.theme = name;
  $("set-theme").value = name;
  applyChrome();
  for (const [, p] of panes) p.term.options.theme = THEMES[name];
  save();
}
function cycleTheme() {
  const order = Object.keys(THEMES);
  applyTheme(order[(order.indexOf(settings.theme) + 1) % order.length]);
  toast(`Theme: ${settings.theme}`);
}
function toggleBlur() {
  settings.blur = !settings.blur;
  $("set-blur").checked = settings.blur;
  applyChrome(); save();
  toast(`Glass blur ${settings.blur ? "on" : "off"}`);
}

// ---------- floating panels: one at a time, dismiss on click-away ----------
function focusTerm() { panes.get(activePaneId)?.term.focus(); }

// Search / command palette / settings all float over the terminal, and only one
// is ever open. Opening one closes the others. Each closes on Esc and on its ×
// button; the palette additionally closes on an outside click. Closing always
// returns focus to the terminal so typing keeps going to the shell.
function closeFloating(except) {
  if (except !== "search" && !searchBar.classList.contains("hidden")) toggleSearch(false);
  if (except !== "palette" && !palEl.classList.contains("hidden")) closePalette();
  if (except !== "settings" && !setEl.classList.contains("hidden")) toggleSettings(false);
  if (except !== "help" && !$("help").classList.contains("hidden")) toggleHelp(false);
}

// The command palette is a transient launcher (like Spotlight), so a click
// anywhere outside it dismisses it. The find bar and the settings drawer are
// kept open until you close them with Esc, their × button, or their toolbar
// toggle — clicking in the terminal must NOT make the search bar vanish.
document.addEventListener("mousedown", (e) => {
  if (!palEl.classList.contains("hidden") && !palEl.contains(e.target) && !e.target.closest?.("#palette-btn")) {
    closePalette();
  }
}, true);

// ---------- settings drawer ----------
const setEl = $("settings");
function toggleSettings(force) {
  const show = force !== undefined ? force : setEl.classList.contains("hidden");
  if (show) closeFloating("settings");
  setEl.classList.toggle("hidden", !show);
  if (show) setEl.focus();
  else focusTerm();
}
function setSelect(id, value) {
  const sel = $(id);
  if (![...sel.options].some((o) => o.value === value)) {
    const o = document.createElement("option");
    o.value = value; o.textContent = value;
    sel.appendChild(o);
  }
  sel.value = value;
}
$("settings-btn").onclick = () => toggleSettings();
$("settings-close").onclick = () => toggleSettings(false);
$("set-theme").onchange = (e) => applyTheme(e.target.value);
$("set-shell").onchange = (e) => { settings.shell = e.target.value; save(); toast("Shell applies to new tabs"); };
$("set-font-family").onchange = (e) => {
  settings.fontFamily = e.target.value;
  updateFontPreview();
  rethemeTerms(); save(); requestAnimationFrame(fitAll);
};
$("set-font").oninput = (e) => setFontSize(+e.target.value);
$("set-line-height").oninput = (e) => {
  settings.lineHeight = +e.target.value;
  $("lh-val").textContent = settings.lineHeight.toFixed(2);
  rethemeTerms(); save(); requestAnimationFrame(fitAll);
};
$("set-padding").oninput = (e) => {
  settings.padding = +e.target.value;
  $("pad-val").textContent = settings.padding;
  applyChrome(); save(); requestAnimationFrame(fitAll);
};
$("set-scrollback").onchange = (e) => {
  settings.scrollback = +e.target.value;
  for (const [, p] of panes) p.term.options.scrollback = settings.scrollback;
  save();
};
$("set-cursor").onchange = (e) => {
  settings.cursor = e.target.value;
  for (const [, p] of panes) p.term.options.cursorStyle = settings.cursor;
  save();
};
$("set-opacity").oninput = (e) => {
  settings.opacity = +e.target.value;
  $("opacity-val").textContent = `${settings.opacity}%`;
  applyChrome(); save();
};
$("set-blink").onchange = (e) => { settings.blink = e.target.checked; for (const [, p] of panes) p.term.options.cursorBlink = settings.blink; save(); };
$("set-blur").onchange = (e) => { settings.blur = e.target.checked; applyChrome(); save(); };
$("set-copy-select").onchange = (e) => { settings.copyOnSelect = e.target.checked; save(); };
$("set-confirm-close").onchange = (e) => { settings.confirmClose = e.target.checked; save(); };

// ---------- help overlay ----------
const SHORTCUTS = [
  ["⌘T", "New tab"], ["⌘W", "Close pane / tab"], ["⇧⌘W", "Close tab"],
  ["⌘1 – ⌘9", "Jump to tab"], ["⌃Tab", "Next tab"], ["⌃⇧Tab", "Previous tab"],
  ["⌘D", "Split side-by-side"], ["⇧⌘D", "Split stacked"], ["⌘R", "Restart pane"],
  ["⇧⌘B", "Broadcast typing"], ["⌘F", "Search"], ["⌘K", "Clear pane"],
  ["⌘C", "Copy selection"], ["⌘V", "Paste"], ["⌘A", "Select all"],
  ["⌘+ / ⌘−", "Zoom in / out"], ["⌘0", "Reset zoom"], ["⌘,", "Settings"],
  ["⇧⌘P", "Command palette"], ["⌘/", "This help"], ["Alt+Space", "Summon window"],
  ["⌃⌘F", "Toggle full screen"], ["Double-click title", "Full screen"],
  ["Right-click tab", "Tab menu"],
  ["Esc", "Close overlay / search"],
];
function buildHelp() {
  const grid = $("help-grid");
  grid.innerHTML = "";
  const seen = new Set();
  for (const [k, d] of SHORTCUTS) {
    const key = k + "|" + d;
    if (seen.has(key)) continue;
    seen.add(key);
    const row = document.createElement("div");
    row.className = "row2";
    const kk = document.createElement("span"); kk.className = "k"; kk.textContent = k;
    const dd = document.createElement("span"); dd.className = "d"; dd.textContent = d;
    row.append(kk, dd);
    grid.appendChild(row);
  }
}
function toggleHelp(force) {
  const el = $("help");
  const show = force !== undefined ? force : el.classList.contains("hidden");
  if (show) closeFloating("help");
  el.classList.toggle("hidden", !show);
  if (show) $("help-close").focus();
  else focusTerm();
}
$("help-btn").onclick = () => toggleHelp();
$("help-close").onclick = () => toggleHelp(false);
$("help-x").onclick = () => toggleHelp(false);
$("help").addEventListener("click", (e) => { if (e.target === $("help")) toggleHelp(false); });

// ---------- confirm dialog ----------
let confirmResolve = null;
function confirmAsk(title, msg, okLabel = "Close") {
  $("confirm-title").textContent = title;
  $("confirm-msg").textContent = msg;
  $("confirm-ok").textContent = okLabel;
  $("confirm").classList.remove("hidden");
  $("confirm-ok").focus();
  return new Promise((res) => { confirmResolve = res; });
}
function confirmDone(v) {
  $("confirm").classList.add("hidden");
  const r = confirmResolve; confirmResolve = null;
  if (r) r(v);
}
$("confirm-ok").onclick = () => confirmDone(true);
$("confirm-cancel").onclick = () => confirmDone(false);
$("confirm").addEventListener("click", (e) => { if (e.target === $("confirm")) confirmDone(false); });

// ---------- context menu (right click) ----------
const ctxEl = $("ctx-menu");
let ctxOpen = false;

function closeCtx() {
  if (!ctxOpen) return;
  ctxEl.classList.add("hidden");
  ctxEl.innerHTML = "";
  ctxOpen = false;
}

function openCtx(items, x, y) {
  ctxEl.innerHTML = "";
  for (const it of items) {
    if (it.sep) {
      const s = document.createElement("div");
      s.className = "sep";
      ctxEl.appendChild(s);
      continue;
    }
    const d = document.createElement("div");
    d.className = "ci" + (it.disabled ? " disabled" : "");
    const nm = document.createElement("span");
    nm.textContent = it.label;
    d.appendChild(nm);
    if (it.hint) {
      const h = document.createElement("span");
      h.className = "hint";
      h.textContent = it.hint;
      d.appendChild(h);
    }
    if (!it.disabled) d.addEventListener("click", () => { closeCtx(); it.run(); });
    ctxEl.appendChild(d);
  }
  ctxEl.classList.remove("hidden");
  const r = ctxEl.getBoundingClientRect();
  ctxEl.style.left = `${Math.max(6, Math.min(x, window.innerWidth - r.width - 8))}px`;
  ctxEl.style.top = `${Math.max(6, Math.min(y, window.innerHeight - r.height - 8))}px`;
  ctxOpen = true;
}

// dismiss on any interaction elsewhere
window.addEventListener("mousedown", (e) => { if (ctxOpen && !e.target.closest("#ctx-menu")) closeCtx(); }, true);
window.addEventListener("blur", closeCtx);
window.addEventListener("wheel", closeCtx, { passive: true });

// one confirm for a bulk close, then force-close each tab
async function closeMany(ids, what) {
  const list = ids.filter((t) => tabs.has(t));
  if (!list.length) return;
  if (settings.confirmClose) {
    const ok = await confirmAsk(
      `Close ${list.length} tab${list.length > 1 ? "s" : ""}?`,
      `${what} Any running processes will be terminated.`,
      "Close tabs"
    );
    if (!ok) return;
  }
  for (const id of list) await closeTab(id, true);
}

function tabMenuItems(tabId) {
  const ids = [...tabs.keys()];
  const i = ids.indexOf(tabId);
  const others = ids.filter((k) => k !== tabId);
  const left = i > 0 ? ids.slice(0, i) : [];
  const right = i >= 0 ? ids.slice(i + 1) : [];
  return [
    { label: "New tab", hint: "⌘T", run: () => newTab() },
    { sep: true },
    { label: "Split side-by-side", hint: "⌘D", run: () => { activateTab(tabId); splitActive("row"); } },
    { label: "Split stacked", hint: "⇧⌘D", run: () => { activateTab(tabId); splitActive("col"); } },
    { sep: true },
    { label: "Rename tab", run: () => startRename(tabId) },
    { label: "Close tab", hint: "⌘W", run: () => closeTab(tabId) },
    { label: "Close other tabs", disabled: !others.length, run: () => closeMany(others, "Closing every other tab.") },
    { label: "Close tabs to the left", disabled: !left.length, run: () => closeMany(left, "Closing tabs to the left.") },
    { label: "Close tabs to the right", disabled: !right.length, run: () => closeMany(right, "Closing tabs to the right.") },
    { sep: true },
    { label: "Close all tabs", disabled: !tabs.size, run: () => closeMany([...tabs.keys()], "Closing every tab.") },
  ];
}

// right-click empty space in the tab strip
$("tab-scroll").addEventListener("contextmenu", (e) => {
  if (e.target.closest(".tab")) return;
  e.preventDefault();
  openCtx([
    { label: "New tab", hint: "⌘T", run: () => newTab() },
    { sep: true },
    { label: "Close all tabs", disabled: !tabs.size, run: () => closeMany([...tabs.keys()], "Closing every tab.") },
  ], e.clientX, e.clientY);
});

// ---------- global shortcuts ----------
window.addEventListener("keydown", (e) => {
  const inXterm = !!e.target.closest?.(".xterm");
  const inField = !inXterm && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName);
  if (inField && e.key !== "Escape") return;

  if (e.key === "Escape") {
    if (!$("confirm").classList.contains("hidden")) return confirmDone(false);
    if (ctxOpen) return closeCtx();
    if (!$("help").classList.contains("hidden")) return toggleHelp(false);
    if (!palEl.classList.contains("hidden")) return closePalette();
    if (!setEl.classList.contains("hidden")) return toggleSettings(false);
    if (!searchBar.classList.contains("hidden")) return toggleSearch(false);
    return;
  }

  if (e.ctrlKey && e.key === "Tab") { e.preventDefault(); return cycleTab(e.shiftKey ? -1 : 1); }

  if (!e.metaKey) return;
  const k = e.key.toLowerCase();
  if (e.ctrlKey && k === "f") { e.preventDefault(); return toggleFullscreen(); }
  if (e.shiftKey && k === "p") { e.preventDefault(); palEl.classList.contains("hidden") ? openPalette() : closePalette(); }
  else if (e.shiftKey && k === "d") { e.preventDefault(); splitActive("col"); }
  else if (e.shiftKey && k === "b") { e.preventDefault(); toggleBroadcast(); }
  else if (e.shiftKey && k === "w") { e.preventDefault(); if (activeTab) closeTab(activeTab); }
  else if (e.shiftKey && k === "[") { e.preventDefault(); cycleTab(-1); }
  else if (e.shiftKey && k === "]") { e.preventDefault(); cycleTab(1); }
  else if (e.shiftKey && k === "/") { e.preventDefault(); toggleHelp(); }
  else if (k === "t") { e.preventDefault(); newTab(); }
  else if (k === "w") { e.preventDefault(); closeActivePane(); }
  else if (k === "d") { e.preventDefault(); splitActive("row"); }
  else if (k === "r") { e.preventDefault(); restartActivePane(); }
  else if (k === "f") { e.preventDefault(); toggleSearch(); }
  else if (k === "v") { e.preventDefault(); pasteClip(); }
  else if (k === "a") { e.preventDefault(); selectAll(); }
  else if (k === "k") { e.preventDefault(); clearPane(); }
  else if (k === ",") { e.preventDefault(); toggleSettings(); }
  else if (k === "/") { e.preventDefault(); toggleHelp(); }
  else if (k === "=" || k === "+") { e.preventDefault(); setFontSize(settings.fontSize + 1); }
  else if (k === "-") { e.preventDefault(); setFontSize(settings.fontSize - 1); }
  else if (k === "0") { e.preventDefault(); setFontSize(13); }
  else if (/^[1-9]$/.test(k)) { const ids = [...tabs.keys()]; if (ids[+k - 1]) activateTab(ids[+k - 1]); }
});

// ---------- window: drag, double-click for full screen ----------
// Explicit startDragging on empty titlebar space, so the window always
// moves even where native drag regions misbehave on transparent windows.
let appWin = null;
try { appWin = getCurrentWindow(); } catch {}

async function syncFullscreen() {
  if (!appWin) return;
  try { document.body.classList.toggle("fullscreen", await appWin.isFullscreen()); } catch {}
}
async function toggleFullscreen() {
  if (!appWin) return;
  try {
    const fs = await appWin.isFullscreen();
    await appWin.setFullscreen(!fs);
    document.body.classList.toggle("fullscreen", !fs);
  } catch { toast("Full screen unavailable"); }
}

try {
  const titlebar = $("titlebar");
  titlebar.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button, input, select, textarea, a")) return;
    appWin.startDragging().catch(() => {});
  });
  titlebar.addEventListener("dblclick", (e) => {
    if (e.target.closest("button, input, select, textarea, a")) return;
    toggleFullscreen();
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
  for (const hk of ["Alt+Space", "Control+`", "Alt+`", "F12"]) {
    try {
      await registerHotkey(hk, (e) => { if (e.state === "Pressed") toggleWin(); });
      settings.hotkey = hk; save();
      $("hotkey-val").textContent = hk;
      return;
    } catch { /* taken — try next */ }
  }
  $("hotkey-val").textContent = "unavailable";
}

// ---------- boot ----------
$("new-tab").onclick = newTab;
$("split-v").onclick = () => splitActive("row");
$("split-h").onclick = () => splitActive("col");
$("broadcast-btn").onclick = () => toggleBroadcast();

setSelect("set-theme", settings.theme);
setSelect("set-shell", settings.shell);
setSelect("set-font-family", settings.fontFamily);
updateFontPreview();
setSelect("set-cursor", settings.cursor);
$("set-font").value = settings.fontSize;
$("font-val").textContent = settings.fontSize;
setSelect("set-scrollback", String(settings.scrollback));
$("set-line-height").value = settings.lineHeight;
$("lh-val").textContent = Number(settings.lineHeight).toFixed(2);
$("set-padding").value = settings.padding;
$("pad-val").textContent = settings.padding;
$("set-opacity").value = settings.opacity;
$("opacity-val").textContent = `${settings.opacity}%`;
$("set-blink").checked = settings.blink;
$("set-blur").checked = settings.blur;
$("set-copy-select").checked = settings.copyOnSelect;
$("set-confirm-close").checked = settings.confirmClose;

applyChrome();
buildHelp();
setBroadcast(false);
syncFullscreen();
invoke("default_shell")
  .then((s) => { $("shell-label").textContent = String(s).split("/").pop(); })
  .catch(() => {});
setupHotkey();
newTab();
if (migratedFont) {
  toast("Font fixed: single-width \u201cJetBrainsMono Nerd Font Mono\u201d — Propo/non-Mono Nerd Fonts overflow the cell", 6000);
}

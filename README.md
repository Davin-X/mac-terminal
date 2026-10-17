# Mac Terminal

A lightweight native terminal emulator for macOS, built with Tauri v2 + xterm.js + Rust `portable-pty`.

![icon](src-tauri/icons/128x128@2x.png)

## Features

### Terminal
- **Real PTY** — each tab is a native macOS pseudoterminal running your login shell (`zsh` by default), so `.zprofile` / `.zshrc`, colors, vim, htop and ssh all work like Terminal.app
- **Clickable links** — URLs in output open in your browser
- **Exit aware** — when a shell exits you get a hint; ⌘R restarts the pane
- **Perf tuned** — GPU (WebGL) rendering with a canvas fallback, rAF-coalesced writes capped at ~60 fps, 32 KB PTY reads batched into single events, debounced resize

### Tabs
- ⌘T new, ⌘W close pane/tab, ⇧⌘W close tab, ⌘1–⌘9 jump, ⌃Tab / ⌃⇧Tab cycle
- **Live titles** from the shell (OSC 0/2), falling back to `Terminal N`
- **Double-click a tab to rename** it
- **Right-click a tab** for the tab menu: close tab / other tabs / tabs to the left / tabs to the right / all tabs, split, rename
- **Drag to reorder** tabs; ⌘1–⌘9 follows the visual order
- Activity dot pulses while a tab is producing output

### Panes
- ⌘D split side-by-side, ⇧⌘D split stacked, up to 4 panes per tab
- ⇧⌘B **broadcast input** — type once, send to every pane in the tab
- ⌘R restart the active pane in place (keeps its position)

### Search
- ⌘F to open; Enter = next, ⇧Enter = previous, Esc = close
- Toggles for **match case**, **whole word** and **regular expression**
- Live **match counter** (`3/17` / `no results`) with highlighted matches

### Command palette
- ⇧⌘P — fuzzy search across all commands, grouped by category, recently used first

### Appearance & settings
- **8 themes** — Tokyo Night, Dracula, Catppuccin, Nord, Gruvbox, One Dark, Matrix, Light
- Font family, font size (⌘+ / ⌘− / ⌘0), line height, pane padding, scrollback size, cursor style, blinking cursor
- **Glass intensity** slider, toggleable backdrop blur
- Copy-on-select, confirm-before-close
- Every setting is persisted to `localStorage`

### macOS polish
- Overlay titlebar with traffic lights, transparent window, `SF Mono` font
- Drag anywhere on the titlebar; **double-click the titlebar for native full screen** (or ⌃⌘F)
- **Global hotkey** (Alt+Space) summons/hides the terminal from anywhere
- Status bar: shell, focused pane title, working directory (via OSC 7), broadcast badge, zoom level and live terminal size
- ⌘/ opens an in-app keyboard shortcut cheat sheet

## Icon

The app icon is generated, not hand-drawn: `assets/make-icon.py` renders a 1024×1024
"neon glass terminal" squircle (superellipse tile, gradient bloom, neon `>_` prompt)
with Pillow, then the Tauri CLI expands it into every platform size.

```bash
python3 assets/make-icon.py          # -> assets/icon-source.png
npx tauri icon assets/icon-source.png # -> src-tauri/icons/*
```

Requires `pillow` (`pip install pillow`).

## Project layout

```
mac-terminal/
├── src/                     # frontend (Vite + xterm.js)
│   ├── index.html           # chrome, inline SVG icons, overlays
│   ├── main.js              # tabs, panes, search, palette, settings, IPC
│   └── styles.css           # theming via CSS custom properties
├── assets/
│   ├── make-icon.py         # icon generator
│   └── icon-source.png      # 1024×1024 source icon
├── src-tauri/               # backend (Rust)
│   ├── src/main.rs          # PTY sessions via portable-pty
│   ├── tauri.conf.json
│   └── capabilities/default.json
└── dist/                    # built frontend (generated)
```

## Run it

Prerequisites: Node 18+, Rust stable, Xcode Command Line Tools.

```bash
npm install

# Dev mode (hot reload):
npx tauri dev

# Production .app / .dmg:
npx tauri build
# → src-tauri/target/release/bundle/
```

## How it works

1. The frontend creates an xterm.js instance per pane, sized with the fit addon.
2. `create_terminal` opens a native PTY pair, spawns your login shell, and returns a session id.
3. A Rust thread pumps PTY bytes to the frontend via `pty-output-{id}` events; keystrokes go back through `write_terminal`. Resize propagates via `resize_terminal`.
4. Settings live in `localStorage`; the theme accent is exposed as a CSS variable so all chrome
   (tabs, badges, glow, toggles) recolors with the terminal.

# Mac Terminal

A lightweight native terminal emulator for macOS, built with Tauri v2 + xterm.js + Rust `portable-pty`.

## Features

- **Real PTY** — each tab is a native macOS pseudoterminal running your login shell (`zsh` by default), so `.zprofile` / `.zshrc`, colors, vim, htop, ssh all work like Terminal.app
- **Tabs** — ⌘T new, ⌘W close, ⌘1–9 switch
- **Themes** — Tokyo Night, Dracula, Matrix, Light (🎨 button cycles)
- **Search** — ⌘F, Enter = next, ⇧Enter = previous, Esc = close
- **Clickable links** — URLs in output open on click
- **macOS polish** — overlay titlebar with traffic lights, transparent window, `SF Mono` font, live shell + size status bar

## Project layout

```
tauri-terminal/
├── src/                  # frontend (Vite + xterm.js)
│   ├── index.html
│   ├── main.js           # tabs, themes, search, Tauri IPC
│   └── styles.css
├── src-tauri/            # backend (Rust)
│   ├── src/main.rs       # PTY sessions via portable-pty
│   ├── tauri.conf.json
│   └── capabilities/default.json
└── dist/                 # built frontend (generated)
```

## Run it

Prerequisites: Node 18+, Rust stable, Xcode Command Line Tools.

```bash
cd tauri-terminal
npm install

# Dev mode (hot reload):
npx tauri dev

# Production .app / .dmg:
npx tauri build
# → src-tauri/target/release/bundle/
```

## How it works

1. Frontend creates an xterm.js instance per tab, sized with the fit addon.
2. `create_terminal` opens a native PTY pair, spawns your login shell, and returns a session id.
3. A Rust thread pumps PTY bytes to the frontend via `pty-output-{id}` events; keystrokes go back through `write_terminal`. Resize propagates via `resize_terminal`.

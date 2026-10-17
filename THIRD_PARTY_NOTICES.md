# Third-party notices

Mac Terminal incorporates open-source software. The project source is licensed
under the MIT License; that license does not replace the licenses of bundled
third-party components. Preserve their notices when redistributing the app.

## Bundled frontend runtime

| Component | License |
| --- | --- |
| Tauri JavaScript API | Apache-2.0 OR MIT |
| Tauri global shortcut plugin | MIT OR Apache-2.0 |
| xterm.js | MIT |
| xterm.js fit, search, Unicode 11, web-links, and WebGL addons | MIT |

## Bundled Rust runtime

| Component | License |
| --- | --- |
| Tauri and Tauri plugins | Apache-2.0 OR MIT |
| portable-pty | MIT |
| once_cell, serde, serde_json, url, and uuid | MIT OR Apache-2.0 |

## Bundled font

The JetBrainsMono NL Nerd Font Mono files in `src/fonts/` are distributed under
the SIL Open Font License 1.1. The full license text is in
[`src/fonts/OFL.txt`](./src/fonts/OFL.txt); font attribution and source details
are in [`src/fonts/README.md`](./src/fonts/README.md).

## Build tools

The project uses Vite and the Tauri CLI during development and packaging. Their
licenses are MIT and Apache-2.0 OR MIT, respectively. They are build tools and
are not bundled as application runtime components.

License declarations for Rust dependencies are recorded in
[`src-tauri/Cargo.lock`](./src-tauri/Cargo.lock), and JavaScript dependency
versions are locked in [`package-lock.json`](./package-lock.json). Each
third-party component retains its own copyright and license terms.

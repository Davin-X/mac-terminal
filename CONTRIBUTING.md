# Contributing

Thanks for your interest in improving Mac Terminal.

## Before opening an issue or pull request

- Search existing issues to avoid duplicates.
- Keep reports focused and include macOS version, app version, and clear
  reproduction steps.
- Never include passwords, access tokens, private keys, or sensitive terminal
  output in an issue or pull request.
- For security issues, follow [SECURITY.md](./SECURITY.md) instead of opening a
  public issue.

## Development

Requirements: Node.js 20 or newer, Rust stable, and Xcode Command Line Tools.

```sh
npm ci
npm run check
npx tauri dev
```

Before submitting a pull request, run `npm run check` and `cargo fmt
--manifest-path src-tauri/Cargo.toml -- --check`. Describe the user-visible
behavior, note any trade-offs, and include test evidence. Keep changes scoped
and preserve local-first behavior.

## Pull requests

Open pull requests against `main`. Keep one logical change per pull request,
link any related issue, and respond to review feedback. Changes to dependencies
must include a reason and an updated lockfile.

By contributing, you agree that your contributions are provided under the
project's [MIT License](./LICENSE).

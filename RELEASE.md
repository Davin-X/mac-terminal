# Release checklist

## Before tagging a release

- Review and merge the dependency-update pull requests intended for the release.
- Choose a semantic version and update `package.json`, `package-lock.json`,
  `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, and `src-tauri/tauri.conf.json`
  together.
- Update the release notes with user-visible changes, known limitations, and
  upgrade information.
- Run `npm ci`, `npm run check`, and
  `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`.
- On macOS, build both architectures with `npm run bundle:universal`.

## Sign and notarize the public app

Do not distribute the unsigned CI artifact as a public release. Before
publishing, sign the app with a Developer ID Application certificate using the
hardened runtime. Submit it to Apple's notary service, wait for approval, and
staple the notarization ticket to the app.

Verify the signed app before packaging:

```sh
codesign --verify --deep --strict "Mac Terminal.app"
spctl --assess --type execute --verbose "Mac Terminal.app"
```

Package the verified app into a universal DMG and verify the disk image:

```sh
hdiutil verify "Mac Terminal_<version>_universal.dmg"
shasum -a 256 "Mac Terminal_<version>_universal.dmg" > SHA256SUMS.txt
```

Keep signing certificates, Apple account credentials, and notarization
credentials in protected CI secrets or a secure local keychain. Never commit
them or place them in a release artifact.

## Publish

- Create a GitHub release for the matching version tag.
- Attach the signed and notarized universal DMG and its `SHA256SUMS.txt`.
- Include concise release notes, supported macOS version, and installation
  instructions.
- Do not publish the ad-hoc-signed CI artifact as a user-facing download.

The regular macOS CI workflow tests the source and uploads a universal DMG as a
build artifact. It does not sign, notarize, or publish a GitHub release.

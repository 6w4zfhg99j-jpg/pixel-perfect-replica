# VONA desktop

The separate renderer uses the same TanStack routes and local SQLite domain layer, with Electron persistence in `app.getPath('userData')/studio.sqlite`. No remote website is loaded. Assets, fonts and SQLite WASM are bundled locally.

On a Mac, install dependencies with `bun install` (the first install needs internet), then run:

```sh
bun run desktop:build
bun run desktop:start
# Creates an actual DMG using the Mac's native architecture:
bun run desktop:dmg
# Explicit architecture (Apple Silicon or Intel):
VONA_MAC_ARCH=arm64 bun run desktop:dmg
VONA_MAC_ARCH=x64 bun run desktop:dmg
```

The DMG is written to `desktop-release/VONA-Studio-Manager-<arch>.dmg`. The script stages only runtime files, packages an `.app` with `@electron/packager`, then creates a compressed DMG with `hdiutil` and an Applications shortcut. It requires macOS; Linux cannot run `hdiutil`. Electron download at packaging time may require internet; the installed app does not. No signing/notarization is included. A production distribution needs Apple signing and notarization. Packaged macOS offline startup and restart tests have not been performed in this Linux environment.

The database location is explicitly pinned to `~/Library/Application Support/VONA Studio Manager/studio.sqlite` on macOS, independent of installation directory or package name, with serialized atomic writes and a single-instance lock. Normal replacement of the `.app` leaves it intact. Deleting this directory or choosing a different OS user removes or separates access to data. Preview data lives in origin-scoped IndexedDB and is not automatically copied to the Mac: export a SQLite backup from preview and restore it in the desktop app.

Migration strategy: versioned, additive migrations, foreign-key checks, preservation of transaction snapshots. Before restoring a backup, integrity/schema checks run and a copy of the existing database is exported. macOS writes replace a temporary file atomically.
# Standalone offline readiness audit — 15 November 2026

## Verdict
The local desktop architecture runs, but this is not a certification of a newly built macOS release. No new frontend build or application packaging was performed during this audit. Existing `desktop-dist` output was launched with the current Electron main/preload on Linux; it is older than the latest source fixes and must be regenerated before distribution.

## Actual evidence
- Electron 45.3.2 launched a local window at `vona://studio/`, with no hosted website, external browser or dev-server connection. The custom protocol maps requests to files in `desktop-dist` through `net.fetch(file://...)`, not an internet API.
- Recorded renderer requests during reload, student/spending saves and XLSX export: zero HTTP/HTTPS/WS/WSS requests. The current desktop main process additionally cancels all such requests and denies external navigation/new windows.
- Created a test student and a €30 expense through the desktop UI, exported a real XLSX file (18,437 bytes), terminated Electron and relaunched. Both records were visible after restart. All test data was isolated under `/tmp/vona-readiness`; no user preview records were changed.
- Inspected actual persisted file: `/tmp/vona-readiness/user-data/VONA Studio Manager/studio.sqlite`, with `SQLite format 3` header. Existing renderer schema version was 3: proof that it predates current version-4 source, not evidence that latest features are packaged.
- Five local font files loaded; local stylesheet, Om PNG, inline Lucide SVG icons, SQLite JS/WASM and XLSX chunk exist in desktop output. No remote font/image URLs in application styles or components.
- Current-source integration test covers students → custom activity → four recurring classes → membership purchase/payment → booking → attendance (8 to 7 visits) → single-visit payment → expense → SQLite file close/reopen → financial report read/write. Reopened totals: €95 received, €30 spending, €65 net; 2 payments, 2 bookings, 4 classes and preserved history.
- Current-source browser flow saved €95 income and €30 spending, reloaded and read €65 profit; downloaded XLSX summary contained the same values. Zero external requests and runtime errors in that flow. This browser test verifies source changes, not an updated desktop bundle.
- 29 automated tests pass, including persistence across simulated installation removal, serialized writes and safe old-backup migration. Native macOS installation and dialogs remain untested.

## Repairs
1. Previous `desktop:dmg` only produced an app directory. Replaced it with a real macOS-only runtime staging → @electron/packager → hdiutil DMG pipeline. Linux refusal verified; actual hdiutil execution not possible here.
2. Pinned userData explicitly to `appData/VONA Studio Manager`; macOS intended path is `~/Library/Application Support/VONA Studio Manager/studio.sqlite`. Existing standard VONA directory remains unchanged. Serialized temp-file writes, fsync before rename, single-instance lock and pending-write flush on normal quit added.
3. Fixed Italian `Tutte` filter incorrectly returning zero totals; verified concrete income/spending/profit values in UI, export and tests.
4. Restore now validates and migrates a candidate before replacing the live database, checks relational integrity, retains current data on persistence failure and requires completion of the desktop safety backup. Cancellation no longer reports a successful backup.
5. Translated remaining root error/not-found and partial-payment labels; home recovery uses app navigation, not a root URL leaving the desktop experience.

## Independence and dependencies
- No Supabase client, connected backend, authentication gates, remote business API or online payment service is used by core workflows. Recorded payments are local ledger entries, not online payment processing.
- All sections share StudioProvider/StudioDB. SQLite stores students, activity types, schedules, classes, bookings, attendance, membership plans/purchases, visit history, payments, expenses/categories and settings.
- Manager has its own stable data directory and SQLite file; no Sequence Designer database/directory access found in this project. Sequence Designer's current installation/data was not accessed or independently inspected.
- Installation replacement does not target userData. File-store tests confirm preservation after removal/recreation of a simulated installation folder; actual Finder upgrade/reinstall is untested.
- Browser preview uses origin-scoped IndexedDB `vona-studio-local`, not the Mac file. Preview data does not automatically transfer to a Mac: export and restore SQLite backup.
- Root error-reporting hooks are optional editor-only hooks and do not implement outbound requests. `src/server.ts` is the hosted SSR wrapper, not imported by the separate Electron renderer. Third-party license/document-format namespace URLs are metadata, not runtime network dependencies. Build tooling/dependency/Electron downloads may require internet; runtime core features do not.

## Exact DMG command (on macOS)
```sh
bun run desktop:dmg
```
Equivalent: `npm run desktop:dmg`. Defaults to the build Mac's architecture. Explicit Intel: `VONA_MAC_ARCH=x64 bun run desktop:dmg`; Apple Silicon: `VONA_MAC_ARCH=arm64 bun run desktop:dmg`.

Output: `desktop-release/VONA-Studio-Manager-<arch>.dmg`. First install dependencies with `bun install`; Electron dependency installation must complete. The script rebuilds the renderer itself, stages only runtime files, and includes all `public` assets through the desktop Vite configuration. No user database is packaged.

## Remaining attention and untested limitations
- Must perform fresh desktop build, real DMG creation, Finder installation, cold offline launch, complete UI workflow and restart/update tests on macOS before claiming release readiness. No Mac is attached; nothing was tested on the user's Mac.
- Signing, notarization, Gatekeeper acceptance, app signing identity and Apple credentials are not configured. Current script creates an unsigned DMG. App-specific macOS icon polish is not configured.
- Native macOS save/open backup dialogs and safety-copy recovery were verified in source/tests, not operated on macOS. Linux restart used process termination, not a power-loss simulation.
- Latest activities/categories/profile changes were tested as source/domain logic, not in regenerated Electron output. Desktop UI smoke covered only students, expenses, report export and restart using older output; complete latest-feature UI certification remains open.
- Existing functionality limits remain, without feature removal: recurring schedules require an end date and do not support whole-series editing; existing booking payment-type changes are unavailable; class-specific finance filters exclude membership-income allocation/shared expenses; no separate net-profit chart. These are feature gaps, not internet dependencies.
- Durable storage protects normal replacement/reinstall, not deleting userData, disk failure, abrupt power loss or another Mac/OS account. Keep regular external backups. SQLite uses in-memory sql.js with full-file snapshots, not native streaming SQLite; large datasets/performance and multi-process crash recovery have not been stress-tested.
# VONA desktop

The separate renderer uses the same TanStack routes and local SQLite domain layer, with Electron persistence in `app.getPath('userData')/studio.sqlite`. No remote website is loaded. Assets, fonts and SQLite WASM are bundled locally.

On a Mac, run:

```sh
bunx vite build --config electron/vite.config.ts --mode desktop
bunx electron electron/main.cjs
bunx @electron/packager . 'VONA Studio Manager' --platform=darwin --arch=arm64 --out=/tmp/vona-release --overwrite --ignore='^/(src|public|node_modules|\.git|\.jj|\.lovable|desktop-release)' --ignore='^/electron/(renderer\.tsx|vite\.config\.ts|index\.html)$'
```

Set package `main` to `electron/main.cjs` before packaging. Use `--arch=x64` for Intel Macs. A production distribution needs Apple signing and notarization. Packaged macOS offline startup and restart tests have not been performed in this Linux environment.

Migration strategy: versioned, additive migrations, foreign-key checks, preservation of transaction snapshots. Before restoring a backup, integrity/schema checks run and a copy of the existing database is exported. macOS writes replace a temporary file atomically.
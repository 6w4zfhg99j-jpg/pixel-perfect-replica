const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}

async function buildDMG() {
  if (process.platform !== 'darwin') throw new Error('La creazione del DMG richiede macOS e hdiutil.');
  const arch = process.env.VONA_MAC_ARCH || process.arch;
  if (!['arm64', 'x64'].includes(arch)) throw new Error('Architettura Mac non valida: usa arm64 o x64.');
  const root = path.resolve(__dirname, '..');
  process.chdir(root);
  run('npm', ['run', 'desktop:build']);
  // Stage only runtime files; never ship repository metadata, user data or dependencies.
  const staging = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'vona-dmg-'));
  try {
    fs.cpSync(path.join(root, 'desktop-dist'), path.join(staging, 'desktop-dist'), { recursive: true });
    fs.mkdirSync(path.join(staging, 'electron'));
    for (const file of ['main.cjs', 'preload.cjs', 'local-files.cjs'])
      fs.copyFileSync(path.join(__dirname, file), path.join(staging, 'electron', file));
    fs.cpSync(path.join(__dirname, 'icons'), path.join(staging, 'electron', 'icons'), { recursive: true });
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    fs.writeFileSync(path.join(staging, 'package.json'), JSON.stringify({
      name: 'vona-studio-manager', productName: 'VONA Studio Manager',
      version: pkg.version || '1.0.0', main: 'electron/main.cjs',
    }, null, 2));
    const packager = (await import('@electron/packager')).default;
    const [appFolder] = await packager({ dir: staging, name: 'VONA Studio Manager',
      platform: 'darwin', arch, out: path.join(root, 'desktop-release'), overwrite: true,
      electronVersion: require('electron/package.json').version,
      appBundleId: 'it.vona.studio-manager', appVersion: pkg.version || '1.0.0',
      icon: path.join(__dirname, 'icons', 'icon.icns'), });
    if (!appFolder) throw new Error('Applicazione macOS non creata.');
    const imageRoot = path.join(staging, 'image');
    fs.mkdirSync(imageRoot);
    fs.cpSync(path.join(appFolder, 'VONA Studio Manager.app'), path.join(imageRoot, 'VONA Studio Manager.app'), { recursive: true });
    fs.symlinkSync('/Applications', path.join(imageRoot, 'Applications'));
    const dmg = path.join(root, 'desktop-release', `VONA-Studio-Manager-${arch}.dmg`);
    fs.rmSync(dmg, { force: true });
    run('hdiutil', ['create', '-volname', 'VONA Studio Manager', '-srcfolder', imageRoot, '-ov', '-format', 'UDZO', dmg]);
    // Give the DMG file itself the app icon (Finder custom icon).
    const rsrc = path.join(staging, 'icon.rsrc');
    const r1 = spawnSync('sh', ['-c', `sips -i "${path.join(__dirname, 'icons', 'icon.png')}" >/dev/null && DeRez -only icns "${path.join(__dirname, 'icons', 'icon.png')}" > "${rsrc}" && Rez -append "${rsrc}" -o "${dmg}" && SetFile -a C "${dmg}"`]);
    if (r1.status !== 0) console.warn('Icona del file DMG non applicata (richiede Xcode Command Line Tools); l’app ha comunque la sua icona.');
    console.log(`DMG creato: ${dmg}`);
  } finally { fs.rmSync(staging, { recursive: true, force: true }); }
}

if (require.main === module) buildDMG().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { buildDMG };
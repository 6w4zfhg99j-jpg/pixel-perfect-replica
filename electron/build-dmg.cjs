const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ICON_ICNS = path.join(__dirname, 'icons', 'icon.icns');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// Fail before packaging if the custom icon is missing or not a real .icns container.
function checkIcon() {
  if (!fs.existsSync(ICON_ICNS)) throw new Error(`Icona mancante: ${ICON_ICNS}`);
  const data = fs.readFileSync(ICON_ICNS);
  if (data.subarray(0, 4).toString('latin1') !== 'icns' || data.readUInt32BE(4) !== data.length)
    throw new Error(`File icona non valido: ${ICON_ICNS}`);
}

// The packager writes the custom icon as Contents/Resources/electron.icns (the name in Info.plist);
// verify its bytes are ours, not Electron's default.
function verifyAppIcon(appPath) {
  const resources = path.join(appPath, 'Contents', 'Resources');
  const plist = fs.readFileSync(path.join(appPath, 'Contents', 'Info.plist'), 'utf8');
  const name = (plist.match(/<key>CFBundleIconFile<\/key>\s*<string>([^<]+)<\/string>/) || [])[1];
  if (!name) throw new Error('CFBundleIconFile assente in Info.plist.');
  const bundled = path.join(resources, name.endsWith('.icns') ? name : `${name}.icns`);
  if (!fs.existsSync(bundled) || sha256(bundled) !== sha256(ICON_ICNS))
    throw new Error(`L'app contiene ancora l'icona predefinita di Electron: ${bundled}`);
  console.log(`Icona VONA verificata nell'app: ${bundled}`);
}

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
  checkIcon();
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
    const packager = (await import('@electron/packager')).packager;
    const [appFolder] = await packager({ dir: staging, name: 'VONA Studio Manager',
      platform: 'darwin', arch, out: path.join(root, 'desktop-release'), overwrite: true,
      electronVersion: require('electron/package.json').version,
      appBundleId: 'it.vona.studio-manager', appVersion: pkg.version || '1.0.0',
      icon: ICON_ICNS, });
    if (!appFolder) throw new Error('Applicazione macOS non creata.');
    verifyAppIcon(path.join(appFolder, 'VONA Studio Manager.app'));
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
    // Mount the DMG and confirm the shipped app carries the custom icon.
    const mount = path.join(staging, 'mnt');
    fs.mkdirSync(mount);
    run('hdiutil', ['attach', dmg, '-nobrowse', '-readonly', '-mountpoint', mount]);
    try { verifyAppIcon(path.join(mount, 'VONA Studio Manager.app')); }
    finally { run('hdiutil', ['detach', mount, '-force']); }
    console.log(`DMG creato: ${dmg}`);
  } finally { fs.rmSync(staging, { recursive: true, force: true }); }
}

if (require.main === module) buildDMG().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { buildDMG, checkIcon, verifyAppIcon, ICON_ICNS };
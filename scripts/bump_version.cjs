const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];
if (!newVersion) {
  console.error('⚠️ Uso: node scripts/bump_version.cjs <nueva_version>');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');

// 1. DepSyS Desktop package.json
const desktopPkgPath = path.join(rootDir, 'DepSyS', 'package.json');
if (fs.existsSync(desktopPkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(desktopPkgPath, JSON.stringify(pkg, null, 2), 'utf8');
  console.log(`✅ DepSyS package.json actualizado a v${newVersion}`);
}

// 2. Tauri config
const tauriConfPath = path.join(rootDir, 'DepSyS', 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauri = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauri.version = newVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauri, null, 2), 'utf8');
  console.log(`✅ tauri.conf.json actualizado a v${newVersion}`);
}

// 3. App-Picking package.json
const pickingPkgPath = path.join(rootDir, 'app-picking', 'package.json');
if (fs.existsSync(pickingPkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pickingPkgPath, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(pickingPkgPath, JSON.stringify(pkg, null, 2), 'utf8');
  console.log(`✅ app-picking package.json actualizado a v${newVersion}`);
}

// 4. App-Picking build.gradle
const gradlePath = path.join(rootDir, 'app-picking', 'android', 'app', 'build.gradle');
if (fs.existsSync(gradlePath)) {
  let content = fs.readFileSync(gradlePath, 'utf8');
  content = content.replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`);
  fs.writeFileSync(gradlePath, content, 'utf8');
  console.log(`✅ app-picking build.gradle actualizado a v${newVersion}`);
}

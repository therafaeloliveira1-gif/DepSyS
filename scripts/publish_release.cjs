const fs = require('fs');
const path = require('path');

const _d = (s) => Buffer.from(s, 'base64').toString('utf8');
// Token con permisos de escritura para publicar en GitHub Releases
const TOKEN = _d('Z2hwX0ZudVQ3TDhCSUROVHVyc1FoTTZzNmRkOFBpWHczUjJMQ0VNWg==');
const REPO = 'therafaeloliveira1-gif/DepSyS';

async function main() {
  const version = process.argv[2] || '1.0.0';
  const target = (process.argv[3] || 'all').toLowerCase(); // 'all', 'desktop', 'picking'
  const tagName = `v${version}`;

  console.log('====================================================');
  console.log(`  PUBLICANDO EN GITHUB RELEASES: DEPSYS ${tagName}`);
  console.log(`  Repositorio: https://github.com/${REPO}`);
  console.log(`  Objetivo: ${target.toUpperCase()}`);
  console.log('====================================================\n');

  // 1. Obtener o crear Release en GitHub
  console.log(`Verificando Release ${tagName} en GitHub...`);
  let release = null;
  const getReleaseRes = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/${tagName}`, {
    headers: { 'Authorization': `token ${TOKEN}`, 'User-Agent': 'DepSyS-Publisher' }
  });

  if (getReleaseRes.ok) {
    release = await getReleaseRes.json();
    console.log(`Release ${tagName} ya existe (ID: ${release.id}).`);
  } else {
    console.log(`Creando nueva Release ${tagName}...`);
    const createReleaseRes = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DepSyS-Publisher'
      },
      body: JSON.stringify({
        tag_name: tagName,
        name: `DepSyS v${version} • Motos Mendes S.A.`,
        body: `### Actualización Oficial DepSyS v${version}\n\n- Ecosistema de Depósito y Picking • Motos Mendes S.A.\n- Publicado el: ${new Date().toLocaleDateString('es-PY')}`,
        draft: false,
        prerelease: false
      })
    });

    if (!createReleaseRes.ok) {
      const errText = await createReleaseRes.text();
      throw new Error(`Error al crear Release en GitHub: ${createReleaseRes.status} ${errText}`);
    }
    release = await createReleaseRes.json();
    console.log(`✅ Release creada exitosamente (ID: ${release.id}).`);
  }

  // 2. Identificar archivos binarios para subir
  const filesToUpload = [];
  const rootDir = path.join(__dirname, '..');

  // A. App-Picking APK
  if (target === 'all' || target === 'picking') {
    const pickingApk = path.join(rootDir, 'app-picking', 'MendesPicking-DepSyS.apk');
    if (fs.existsSync(pickingApk)) {
      filesToUpload.push({
        filePath: pickingApk,
        assetName: `MendesPicking-DepSyS-v${version}.apk`,
        contentType: 'application/vnd.android.package-archive'
      });
      // También subir el genérico sin versión para enlaces fijos
      filesToUpload.push({
        filePath: pickingApk,
        assetName: 'MendesPicking-DepSyS.apk',
        contentType: 'application/vnd.android.package-archive'
      });
    } else {
      console.warn(`⚠️ No se encontró el APK en: ${pickingApk}`);
    }
  }

  // B. DepSyS Desktop .exe / .msi
  if (target === 'all' || target === 'desktop') {
    const bundleNsis = path.join(rootDir, 'DepSyS', 'src-tauri', 'target', 'release', 'bundle', 'nsis');
    const bundleMsi = path.join(rootDir, 'DepSyS', 'src-tauri', 'target', 'release', 'bundle', 'msi');

    let desktopInstaller = null;
    if (fs.existsSync(bundleNsis)) {
      const nsisFiles = fs.readdirSync(bundleNsis).filter(f => f.endsWith('.exe'));
      if (nsisFiles.length > 0) desktopInstaller = path.join(bundleNsis, nsisFiles[0]);
    }
    if (!desktopInstaller && fs.existsSync(bundleMsi)) {
      const msiFiles = fs.readdirSync(bundleMsi).filter(f => f.endsWith('.msi'));
      if (msiFiles.length > 0) desktopInstaller = path.join(bundleMsi, msiFiles[0]);
    }

    if (desktopInstaller && fs.existsSync(desktopInstaller)) {
      const ext = path.extname(desktopInstaller);
      filesToUpload.push({
        filePath: desktopInstaller,
        assetName: `DepSyS-Desktop-Setup-v${version}${ext}`,
        contentType: 'application/octet-stream'
      });
      filesToUpload.push({
        filePath: desktopInstaller,
        assetName: `DepSyS-Desktop-Setup${ext}`,
        contentType: 'application/octet-stream'
      });
    } else {
      console.warn('⚠️ No se encontró el instalador de escritorio en bundle/nsis ni bundle/msi');
    }
  }

  if (filesToUpload.length === 0) {
    console.log('ℹ️ No se detectaron archivos binarios nuevos para subir en esta pasada.');
    return;
  }

  // 3. Subir cada archivo a la Release
  for (const item of filesToUpload) {
    const { filePath, assetName, contentType } = item;
    const fileStat = fs.statSync(filePath);
    const sizeMb = (fileStat.size / 1024 / 1024).toFixed(2);

    // Si ya existía un asset con el mismo nombre, eliminarlo primero
    const existingAsset = Array.isArray(release.assets) && release.assets.find(a => a.name === assetName);
    if (existingAsset) {
      console.log(`Eliminando asset previo ${assetName} (ID: ${existingAsset.id})...`);
      await fetch(`https://api.github.com/repos/${REPO}/releases/assets/${existingAsset.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `token ${TOKEN}`, 'User-Agent': 'DepSyS-Publisher' }
      });
    }

    console.log(`Subiendo ${assetName} (${sizeMb} MB)...`);
    const uploadUrl = release.upload_url.replace(/\{.*?\}$/, `?name=${encodeURIComponent(assetName)}`);
    const fileBuffer = fs.readFileSync(filePath);

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Content-Type': contentType,
        'User-Agent': 'DepSyS-Publisher'
      },
      body: fileBuffer
    });

    if (uploadRes.ok) {
      console.log(`✅ ${assetName} subido exitosamente.`);
    } else {
      const err = await uploadRes.text();
      console.error(`❌ Error subiendo ${assetName}:`, err);
    }
  }

  console.log('\n====================================================');
  console.log(`🎉 RELEASE v${version} ACTIVA Y DISPONIBLE EN:`);
  console.log(`   ${release.html_url}`);
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('❌ Error fatal en el publicador:', err.message);
  process.exit(1);
});

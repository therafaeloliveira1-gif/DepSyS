/**
 * Servicio de Auto-Actualización para App-Picking (Android)
 * Consulta GitHub Releases en repositorio privado usando Token de Solo Lectura.
 */

const GITHUB_READ_TOKEN = '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';
const REPO = 'therafaeloliveira1-gif/DepSyS';

export async function checkForPickingUpdate(currentVersion = '1.0.0') {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_READ_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'DepSyS-Picking-App'
      }
    });

    if (!res.ok) {
      if (res.status === 404) return { available: false, message: 'No hay releases.' };
      return { available: false, error: `Error ${res.status}` };
    }

    const release = await res.json();
    const latestTag = (release.tag_name || '').replace(/^v/, '').trim();
    const cleanCurrent = String(currentVersion).replace(/^v/, '').trim();

    const isNewer = compareVersions(latestTag, cleanCurrent) > 0;

    if (!isNewer) {
      return { available: false, currentVersion: cleanCurrent, latestVersion: latestTag };
    }

    // Buscar APK Android
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const apkAsset = assets.find(a => a.name.endsWith('.apk'));

    return {
      available: true,
      currentVersion: cleanCurrent,
      newVersion: latestTag,
      releaseName: release.name,
      notes: release.body,
      assetName: apkAsset ? apkAsset.name : null,
      assetId: apkAsset ? apkAsset.id : null,
      downloadUrl: apkAsset ? apkAsset.browser_download_url : null,
      publishedAt: release.published_at
    };
  } catch (err) {
    console.warn('[Picking Updater] Error comprobando actualización:', err);
    return { available: false, error: err.message };
  }
}

function compareVersions(v1, v2) {
  const p1 = (v1 || '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = (v2 || '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

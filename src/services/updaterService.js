/**
 * Servicio de Auto-Actualización Oficial para DepSyS Desktop (Tauri v2)
 * Soporta actualización nativa automática y consulta de versiones en GitHub Releases.
 */

import packageJson from '../../package.json';

const REPO = 'therafaeloliveira1-gif/DepSyS';
export const CURRENT_VERSION = packageJson.version || '0.0.20';

export async function checkDesktopUpdate() {
  const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);

  // 1. Si estamos en Tauri nativo, usar el plugin oficial de auto-actualización
  if (isTauri) {
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (update && update.available) {
        console.log(`[DepSyS Updater] Nueva versión disponible: v${update.version}`);
        return {
          available: true,
          version: update.version,
          currentVersion: update.currentVersion || CURRENT_VERSION,
          body: update.body || 'Mejoras y correcciones generales en DepSyS.',
          date: update.date,
          isNativeTauri: true,
          updateHandle: update
        };
      }
      return { available: false, currentVersion: CURRENT_VERSION };
    } catch (err) {
      console.warn('[DepSyS Updater] Error con plugin-updater de Tauri, usando fallback GitHub:', err);
    }
  }

  // 2. Fallback universal vía API pública de GitHub Releases (sin requerir token)
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'DepSyS-Desktop-App'
      }
    });

    if (!res.ok) return { available: false, currentVersion: CURRENT_VERSION };

    const release = await res.json();
    const latestTag = (release.tag_name || '').replace(/^[vV]/, '').trim();
    const isNewer = compareVersions(latestTag, CURRENT_VERSION) > 0;

    if (!isNewer) {
      return { available: false, currentVersion: CURRENT_VERSION, latestVersion: latestTag };
    }

    const assets = Array.isArray(release.assets) ? release.assets : [];
    const installerAsset = assets.find(a => 
      (a.name.endsWith('.exe') || a.name.endsWith('.msi')) && 
      !a.name.toLowerCase().includes('uninstaller')
    );

    return {
      available: true,
      version: latestTag,
      currentVersion: CURRENT_VERSION,
      body: release.body || 'Mejoras y correcciones en DepSyS.',
      isNativeTauri: false,
      downloadUrl: installerAsset ? installerAsset.browser_download_url : `https://github.com/${REPO}/releases/latest`
    };
  } catch (err) {
    console.warn('[DepSyS Updater] Error en fallback de GitHub:', err);
    return { available: false, error: err.message, currentVersion: CURRENT_VERSION };
  }
}

export async function installDesktopUpdate(updateInfo, onProgress) {
  if (updateInfo.isNativeTauri && updateInfo.updateHandle) {
    let downloadedBytes = 0;
    let totalBytes = 0;

    await updateInfo.updateHandle.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        totalBytes = event.data.contentLength || 0;
        if (onProgress) onProgress({ status: 'started', totalBytes });
      } else if (event.event === 'Progress') {
        downloadedBytes += event.data.chunkLength;
        const pct = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
        if (onProgress) onProgress({ status: 'progress', downloadedBytes, totalBytes, percent: pct });
      } else if (event.event === 'Finished') {
        if (onProgress) onProgress({ status: 'finished' });
      }
    });

    // Reiniciar la aplicación con la nueva versión aplicada
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
    return { success: true };
  }

  // Si no es nativo Tauri, abrir enlace de descarga en navegador
  if (updateInfo.downloadUrl) {
    window.open(updateInfo.downloadUrl, '_blank');
    return { success: true, openedBrowser: true };
  }

  throw new Error('No se encontró método de instalación disponible.');
}

function compareVersions(v1, v2) {
  const clean1 = String(v1 || '').replace(/^[vV]/, '').trim();
  const clean2 = String(v2 || '').replace(/^[vV]/, '').trim();
  const p1 = clean1.split('.').map(n => parseInt(n, 10) || 0);
  const p2 = clean2.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

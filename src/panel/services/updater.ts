/**
 * CEP Universal Auto-Update Engine & Version Checker
 * Engineered for My Packs Pro (Adobe Premiere Pro CEP Extension)
 * (C) 2026 Alex Ascencio.
 */

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseDate?: string;
  changelog?: string[];
  downloadUrl?: string;
}

const MANIFEST_URL = 'https://raw.githubusercontent.com/Bielicoman/mypackspro/main/version.json';
const FALLBACK_DOWNLOAD_URL = 'https://github.com/Bielicoman/mypackspro/releases/latest';

// Local version fallback if version.json is not bundled
export const CURRENT_VERSION = '0.2.0';

export function compareVersions(vA: string, vB: string): number {
  const clean = (v: string) => (v || '0.0.0').replace(/^v/, '').split('.').map(Number);
  const a = clean(vA);
  const b = clean(vB);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const numA = a[i] || 0;
    const numB = b[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

export function openExternalUrl(url: string): void {
  const w = window as any;
  if (w.cep && w.cep.util && typeof w.cep.util.openURLInDefaultBrowser === 'function') {
    w.cep.util.openURLInDefaultBrowser(url);
  } else if (typeof w.require === 'function') {
    try {
      const cp = w.require('child_process');
      const startCmd = process.platform === 'darwin' ? 'open' : 'start';
      cp.exec(`${startCmd} "" "${url}"`);
    } catch {
      window.open(url, '_blank');
    }
  } else {
    window.open(url, '_blank');
  }
}

export async function checkRemoteUpdate(): Promise<UpdateInfo> {
  let localVersion = CURRENT_VERSION;

  // Try to read local version.json from extension root if in CEP
  const w = window as any;
  if (typeof w.require === 'function') {
    try {
      const fs = w.require('fs');
      const path = w.require('path');
      const verPath = path.join(w.__dirname || '', 'version.json');
      if (fs.existsSync(verPath)) {
        const localData = JSON.parse(fs.readFileSync(verPath, 'utf8'));
        if (localData && localData.version) {
          localVersion = localData.version;
        }
      }
    } catch {
      // Ignore
    }
  }

  try {
    const response = await fetch(`${MANIFEST_URL}?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        hasUpdate: false,
        currentVersion: localVersion,
        latestVersion: localVersion,
      };
    }

    const data = await response.json();
    const latestVersion = data.version || localVersion;
    const isNewer = compareVersions(latestVersion, localVersion) > 0;

    return {
      hasUpdate: isNewer,
      currentVersion: localVersion,
      latestVersion,
      releaseDate: data.releaseDate,
      changelog: Array.isArray(data.changelog) ? data.changelog : [],
      downloadUrl: data.downloadUrl || FALLBACK_DOWNLOAD_URL,
    };
  } catch (err) {
    return {
      hasUpdate: false,
      currentVersion: localVersion,
      latestVersion: localVersion,
    };
  }
}

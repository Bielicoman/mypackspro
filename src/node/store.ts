/**
 * Persistência da lista de packs em %APPDATA%\MyPacksPro\packs.json.
 *
 * Guarda apenas *referências* às pastas, nunca o índice de arquivos: a pasta é
 * a fonte de verdade e pode mudar fora do plugin. A varredura é refeita ao abrir,
 * o que é barato e nunca fica dessincronizado.
 */

import { dataDir, fsp, path } from './nodeApi.js';

export interface PackRef {
  readonly rootPath: string;
  /** Nome mostrado na aba. Por omissão é o da pasta, mas o utilizador pode renomear. */
  readonly name: string;
  readonly addedAt: number;
}

interface StoreFile {
  version: 1;
  packs: PackRef[];
}

const FILE_NAME = 'packs.json';

function storePath(): string {
  return path().join(dataDir(), FILE_NAME);
}

function normalizePathKey(p: string): string {
  return p.replace(/[\\/]+$/, '').replace(/\\/g, '/').toLowerCase();
}

export async function loadPackRefs(): Promise<PackRef[]> {
  try {
    const raw = await fsp().readFile(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.packs)) return [];

    const seen = new Set<string>();
    const valid: PackRef[] = [];

    for (const p of parsed.packs) {
      if (
        typeof p?.rootPath === 'string' &&
        p.rootPath.trim().length > 0 &&
        typeof p.name === 'string'
      ) {
        const key = normalizePathKey(p.rootPath);
        if (seen.has(key)) continue;
        seen.add(key);
        valid.push(p);
      }
    }

    return valid;
  } catch {
    // Primeiro arranque, ou arquivo ilegível: começa vazio.
    return [];
  }
}

export async function savePackRefs(packs: readonly PackRef[]): Promise<void> {
  const fs = fsp();
  await fs.mkdir(dataDir(), { recursive: true });

  const seen = new Set<string>();
  const uniquePacks: PackRef[] = [];
  for (const p of packs) {
    const key = normalizePathKey(p.rootPath);
    if (seen.has(key)) continue;
    seen.add(key);
    uniquePacks.push(p);
  }

  const payload: StoreFile = { version: 1, packs: uniquePacks };
  await fs.writeFile(storePath(), JSON.stringify(payload, null, 2), 'utf8');
}

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

export async function loadPackRefs(): Promise<PackRef[]> {
  try {
    const raw = await fsp().readFile(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.packs)) return [];

    // Filtra entradas corrompidas em vez de rejeitar o arquivo inteiro:
    // um pack malformado não deve apagar os outros.
    return parsed.packs.filter(
      (p): p is PackRef =>
        typeof p?.rootPath === 'string' &&
        p.rootPath.length > 0 &&
        typeof p.name === 'string',
    );
  } catch {
    // Primeiro arranque, ou arquivo ilegível: começa vazio.
    return [];
  }
}

export async function savePackRefs(packs: readonly PackRef[]): Promise<void> {
  const fs = fsp();
  await fs.mkdir(dataDir(), { recursive: true });
  const payload: StoreFile = { version: 1, packs: [...packs] };
  await fs.writeFile(storePath(), JSON.stringify(payload, null, 2), 'utf8');
}

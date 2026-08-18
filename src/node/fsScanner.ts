/**
 * Varredura recursiva de uma pasta de pack.
 *
 * Corre no processo do painel, com o Node do CEP. Produz exatamente o formato
 * que `core/scan/buildPack` consome — toda a regra de organização fica lá, testável.
 *
 * Três cuidados que um `readdir` ingénuo não tem:
 *  - cede o controlo ao event loop periodicamente, senão a UI congela em packs grandes;
 *  - não segue links simbólicos, que criam ciclos infinitos;
 *  - tem tetos de profundidade e de contagem, para uma pasta errada (ex.: C:\)
 *    não travar o Premiere.
 */

import type { ScannedFile } from '../core/model/types.js';
import { fsp, path } from './nodeApi.js';

export interface ScanOptions {
  maxDepth?: number;
  maxFiles?: number;
  /** Chamado a cada lote, para a UI mostrar progresso durante varreduras longas. */
  onProgress?: (found: number) => void;
  signal?: { aborted: boolean };
}

export interface ScanResult {
  files: ScannedFile[];
  /** true se a varredura parou por atingir um teto — a UI deve avisar. */
  truncated: boolean;
  dirsVisited: number;
}

const DEFAULT_MAX_DEPTH = 12;
const DEFAULT_MAX_FILES = 100_000;
/** A cada N entradas devolve-se o controlo ao browser, para o painel não bloquear. */
const YIELD_EVERY = 400;

/** Pastas que nunca contêm assets e só desperdiçam tempo. */
const SKIP_DIRS = new Set([
  'node_modules',
  '$recycle.bin',
  'system volume information',
  '.git',
  '.svn',
  'adobe premiere pro auto-save',
  'adobe premiere pro video previews',
  'adobe premiere pro audio previews',
]);

const nextTick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

export async function scanFolder(root: string, opts: ScanOptions = {}): Promise<ScanResult> {
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
  const fs = fsp();
  const p = path();

  // Lido por função: uma leitura direta de `opts.signal?.aborted` faz o
  // TypeScript estreitar o tipo após a primeira verificação e considerar as
  // seguintes impossíveis — mas o valor muda por fora, durante a varredura.
  const isAborted = (): boolean => opts.signal?.aborted === true;

  const files: ScannedFile[] = [];
  const seenRel = new Set<string>();
  const visitedDirs = new Set<string>();
  let truncated = false;
  let dirsVisited = 0;
  let sinceYield = 0;

  async function walk(absDir: string, relParts: readonly string[], depth: number): Promise<void> {
    if (truncated || isAborted()) return;
    if (depth > maxDepth) {
      truncated = true;
      return;
    }

    const normDir = absDir.replace(/[\\/]+$/, '').toLowerCase();
    if (visitedDirs.has(normDir)) return;
    visitedDirs.add(normDir);

    dirsVisited++;
    let entries;
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      // Pasta sem permissão ou removida a meio: ignora e continua o resto do pack.
      return;
    }

    for (const entry of entries) {
      if (truncated || isAborted()) return;

      // Links simbólicos criam ciclos; um pack legítimo não depende deles.
      if (entry.isSymbolicLink()) continue;

      const name = entry.name;
      if (name.startsWith('.')) continue;

      if (++sinceYield >= YIELD_EVERY) {
        sinceYield = 0;
        opts.onProgress?.(files.length);
        await nextTick();
      }

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(name.toLowerCase())) continue;
        await walk(p.join(absDir, name), [...relParts, name], depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;

      if (files.length >= maxFiles) {
        truncated = true;
        return;
      }

      const relPath = [...relParts, name].join('/');
      const relKey = relPath.toLowerCase();
      if (seenRel.has(relKey)) continue;
      seenRel.add(relKey);

      const abs = p.join(absDir, name);
      let size = 0;
      let mtimeMs = 0;
      try {
        const st = await fs.stat(abs);
        size = st.size;
        mtimeMs = st.mtimeMs;
      } catch {
        // Sem stat ainda vale mostrar o arquivo; o preview é que ficará indisponível.
      }

      files.push({
        relPath,
        sizeBytes: size,
        mtimeMs,
      });
    }
  }

  await walk(root, [], 0);
  opts.onProgress?.(files.length);

  return { files, truncated, dirsVisited };
}

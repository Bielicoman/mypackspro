/**
 * Ponte entre o painel e o mundo exterior (Node + CEP).
 *
 * O painel fala só com esta interface. Isso mantém `panel/` sem dependência
 * direta do CEP e permite abrir o mesmo bundle num browser comum para desenhar
 * a interface — onde entra a implementação simulada.
 */

import type { Pack } from '../../core/model/types.js';
import { buildPack } from '../../core/scan/buildPack.js';
import { isNodeAvailable } from '../../node/nodeApi.js';
import { scanFolder } from '../../node/fsScanner.js';
import { loadPackRefs, savePackRefs, type PackRef } from '../../node/store.js';
import { MOCK_PACKS } from '../mock/mockPacks.js';

export interface ScanFeedback {
  onProgress?: (found: number) => void;
}

export interface HostBridge {
  readonly live: boolean;
  /** Abre o diálogo nativo de pasta. `null` se o utilizador cancelar. */
  pickFolder(): Promise<string | null>;
  scanPack(ref: PackRef, fb?: ScanFeedback): Promise<{ pack: Pack; truncated: boolean }>;
  loadRefs(): Promise<PackRef[]>;
  saveRefs(refs: readonly PackRef[]): Promise<void>;
}

interface CepFsResult {
  err: number;
  data: string[];
}

interface CepFs {
  showOpenDialogEx(
    allowMultiple: boolean,
    chooseDirectory: boolean,
    title?: string,
    initialPath?: string,
    fileTypes?: string[] | null,
  ): CepFsResult;
}

function cepFs(): CepFs | undefined {
  return (window as unknown as { cep?: { fs?: CepFs } }).cep?.fs;
}

const folderName = (p: string): string => p.split(/[\\/]/).filter(Boolean).pop() ?? p;

/* ------------------------------------------------------------------ real */

const cepBridge: HostBridge = {
  live: true,

  async pickFolder() {
    const fs = cepFs();
    if (fs === undefined) return null;
    const res = fs.showOpenDialogEx(false, true, 'Escolher pasta do pack', '', null);
    const first = res?.data?.[0];
    return typeof first === 'string' && first.length > 0 ? first : null;
  },

  async scanPack(ref, fb) {
    const opts = fb?.onProgress === undefined ? {} : { onProgress: fb.onProgress };
    const result = await scanFolder(ref.rootPath, opts);
    const pack = buildPack({
      rootPath: ref.rootPath,
      name: ref.name,
      files: result.files,
      scannedAt: Date.now(),
    });
    return { pack, truncated: result.truncated };
  },

  loadRefs: loadPackRefs,
  saveRefs: savePackRefs,
};

/* ------------------------------------------------------------------ simulado */

const mockRefs: PackRef[] = MOCK_PACKS.map((p) => ({
  rootPath: p.rootPath,
  name: p.name,
  addedAt: 0,
}));

const mockBridge: HostBridge = {
  live: false,

  async pickFolder() {
    return null;
  },

  async scanPack(ref) {
    const found = MOCK_PACKS.find((p) => p.rootPath === ref.rootPath);
    return { pack: found ?? MOCK_PACKS[0]!, truncated: false };
  },

  async loadRefs() {
    return mockRefs;
  },

  async saveRefs() {
    /* sem persistência fora do CEP */
  },
};

export const bridge: HostBridge =
  isNodeAvailable() && cepFs() !== undefined ? cepBridge : mockBridge;

export { folderName };
export type { PackRef };

/** Diálogo de pasta reutilizável fora do fluxo de packs (ex.: destino das cópias). */
export const pickFolder = (): Promise<string | null> => bridge.pickFolder();

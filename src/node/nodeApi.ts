/**
 * Acesso ao Node dentro do painel CEP.
 *
 * O `require` é fornecido pelo runtime do CEP quando o manifest declara
 * `--enable-nodejs` (confirmado na Fase 0: Node 17.7.2). O acesso é feito por
 * propriedade de `window` de propósito — assim o Vite não tenta resolver estes
 * módulos em tempo de build, e o mesmo bundle continua a carregar num browser
 * comum, onde `isNodeAvailable()` devolve false.
 */

import { appDataRoot, detectPlatform, pathListSeparator, type Platform } from '../core/platform/platform.js';

type NodeRequire = (id: string) => unknown;

export interface Dirent {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

export interface Stats {
  size: number;
  mtimeMs: number;
  isDirectory(): boolean;
  isFile(): boolean;
}

export interface FsPromises {
  readdir(path: string, opts: { withFileTypes: true }): Promise<Dirent[]>;
  stat(path: string): Promise<Stats>;
  access(path: string): Promise<void>;
  readFile(path: string, encoding: 'utf8'): Promise<string>;
  writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>;
  mkdir(path: string, opts: { recursive: true }): Promise<string | undefined>;
  rename(from: string, to: string): Promise<void>;
  unlink(path: string): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;
}

interface FsModule {
  promises: FsPromises;
  existsSync(path: string): boolean;
}

export interface ChildStream {
  on(event: 'data', cb: (chunk: { toString(): string }) => void): void;
}

export interface ChildProc {
  stdout: ChildStream | null;
  stderr: ChildStream | null;
  on(event: 'close', cb: (code: number | null) => void): void;
  on(event: 'error', cb: (err: Error) => void): void;
  kill(signal?: string): void;
}

interface ChildProcessModule {
  spawn(
    command: string,
    args: readonly string[],
    options?: { windowsHide?: boolean; windowsVerbatimArguments?: boolean },
  ): ChildProc;
}

interface PathModule {
  join(...parts: string[]): string;
  dirname(p: string): string;
  basename(p: string, ext?: string): string;
  extname(p: string): string;
  sep: string;
}

function getRequire(): NodeRequire | undefined {
  const w = window as unknown as { require?: NodeRequire };
  return typeof w.require === 'function' ? w.require : undefined;
}

export function isNodeAvailable(): boolean {
  return getRequire() !== undefined;
}

function need<T>(id: string): T {
  const req = getRequire();
  if (req === undefined) {
    throw new Error(`Node indisponível: o painel não está a correr no CEP (módulo "${id}")`);
  }
  return req(id) as T;
}

export const fsp = (): FsPromises => need<FsModule>('fs').promises;
export const path = (): PathModule => need<PathModule>('path');
export const spawn = (): ChildProcessModule['spawn'] =>
  need<ChildProcessModule>('child_process').spawn;

/** Existência síncrona — usada só para localizar binários no arranque. */
export function existsSync(p: string): boolean {
  try {
    return need<FsModule>('fs').existsSync(p);
  } catch {
    return false;
  }
}

function nodeProcess(): { platform?: string; env: Record<string, string | undefined> } | undefined {
  return (window as unknown as {
    process?: { platform?: string; env: Record<string, string | undefined> };
  }).process;
}

/** Sistema em que o painel está a correr. */
export function currentPlatform(): Platform {
  return detectPlatform(nodeProcess()?.platform ?? '');
}

/** PATH do sistema, para procurar o ffmpeg quando não há binário embarcado. */
export function envPath(): string[] {
  const proc = nodeProcess();
  const sep = pathListSeparator(currentPlatform());
  return (proc?.env['PATH'] ?? '').split(sep).filter(Boolean);
}

export const DATA_FOLDER = 'MyPacksPro';
/** Nome usado antes do plugin passar a chamar-se My Packs Pro. */
export const LEGACY_DATA_FOLDER = 'AscencioPack';

/** Raiz de dados do utilizador, conforme a plataforma. */
function userDataRoot(): string {
  const env = nodeProcess()?.env ?? {};
  return appDataRoot(currentPlatform(), env) ?? '.';
}

/** Pasta de dados antiga, para a migração única do rename. */
export function legacyDataDir(): string {
  return path().join(userDataRoot(), LEGACY_DATA_FOLDER);
}

/** Pasta de dados do plugin: %APPDATA%\MyPacksPro */
export function dataDir(): string {
  return path().join(userDataRoot(), DATA_FOLDER);
}

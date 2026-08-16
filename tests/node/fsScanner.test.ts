import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scanFolder } from '../../src/node/fsScanner.js';

/**
 * Sistema de arquivos falso.
 *
 * O scanner chega ao Node por `window.require`, que é como o CEP o expõe.
 * Injetar um `window` falso permite testar profundidade, ciclos e tetos sem
 * tocar no disco — que é exatamente onde estão os riscos deste módulo.
 */

interface FakeEntry {
  name: string;
  kind: 'dir' | 'file' | 'link';
  size?: number;
  mtimeMs?: number;
}

type FakeTree = Record<string, FakeEntry[]>;

function installFakeFs(tree: FakeTree, opts: { failOn?: string } = {}) {
  const dirent = (e: FakeEntry) => ({
    name: e.name,
    isDirectory: () => e.kind === 'dir',
    isFile: () => e.kind === 'file',
    isSymbolicLink: () => e.kind === 'link',
  });

  const findEntry = (full: string): FakeEntry | undefined => {
    const parts = full.split('/');
    const name = parts.pop() as string;
    const parent = parts.join('/');
    return tree[parent]?.find((e) => e.name === name);
  };

  const fake = {
    promises: {
      readdir: async (dir: string) => {
        if (opts.failOn !== undefined && dir.includes(opts.failOn)) {
          throw new Error('EACCES');
        }
        const entries = tree[dir];
        if (entries === undefined) throw new Error(`ENOENT: ${dir}`);
        return entries.map(dirent);
      },
      stat: async (full: string) => {
        const e = findEntry(full);
        return {
          size: e?.size ?? 0,
          mtimeMs: e?.mtimeMs ?? 0,
          isDirectory: () => e?.kind === 'dir',
          isFile: () => e?.kind === 'file',
        };
      },
      readFile: async () => '',
      writeFile: async () => undefined,
      mkdir: async () => undefined,
    },
  };

  const fakePath = {
    sep: '/',
    join: (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\/+/g, '/'),
  };

  (globalThis as unknown as { window: unknown }).window = {
    require: (id: string) => {
      if (id === 'fs') return fake;
      if (id === 'path') return fakePath;
      throw new Error(`módulo inesperado: ${id}`);
    },
  };
}

const rel = (r: Awaited<ReturnType<typeof scanFolder>>) => r.files.map((f) => f.relPath).sort();

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe('scanFolder', () => {
  beforeEach(() => {
    installFakeFs({
      '/pack': [
        { name: 'solto.mp4', kind: 'file', size: 10, mtimeMs: 5 },
        { name: 'SFX', kind: 'dir' },
        { name: '.oculta', kind: 'dir' },
        { name: '.env', kind: 'file' },
        { name: 'node_modules', kind: 'dir' },
        { name: 'atalho', kind: 'link' },
      ],
      '/pack/SFX': [
        { name: 'a.wav', kind: 'file', size: 20, mtimeMs: 7 },
        { name: 'Impacto', kind: 'dir' },
      ],
      '/pack/SFX/Impacto': [{ name: 'boom.wav', kind: 'file', size: 30, mtimeMs: 9 }],
      '/pack/.oculta': [{ name: 'segredo.mp4', kind: 'file' }],
      '/pack/node_modules': [{ name: 'lixo.mp4', kind: 'file' }],
    });
  });

  it('percorre recursivamente e devolve caminhos relativos com "/"', async () => {
    const r = await scanFolder('/pack');
    expect(rel(r)).toEqual(['SFX/Impacto/boom.wav', 'SFX/a.wav', 'solto.mp4']);
  });

  it('lê tamanho e mtime, que alimentam a chave de cache', async () => {
    const r = await scanFolder('/pack');
    const boom = r.files.find((f) => f.relPath.endsWith('boom.wav'));
    expect(boom).toMatchObject({ sizeBytes: 30, mtimeMs: 9 });
  });

  it('ignora ocultos, symlinks e pastas de sistema', async () => {
    const r = await scanFolder('/pack');
    const paths = rel(r).join('|');
    expect(paths).not.toContain('segredo');
    expect(paths).not.toContain('node_modules');
    expect(paths).not.toContain('.env');
    expect(paths).not.toContain('atalho');
  });

  it('não marca truncado numa varredura normal', async () => {
    const r = await scanFolder('/pack');
    expect(r.truncated).toBe(false);
  });
});

describe('scanFolder — limites de segurança', () => {
  it('para na profundidade máxima e sinaliza truncado', async () => {
    installFakeFs({
      '/p': [{ name: 'd1', kind: 'dir' }],
      '/p/d1': [{ name: 'd2', kind: 'dir' }],
      '/p/d1/d2': [{ name: 'fundo.mp4', kind: 'file' }],
    });
    const r = await scanFolder('/p', { maxDepth: 1 });
    expect(r.truncated).toBe(true);
    expect(rel(r)).not.toContain('d1/d2/fundo.mp4');
  });

  it('para no teto de arquivos e sinaliza truncado', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      name: `f${i}.mp4`,
      kind: 'file' as const,
    }));
    installFakeFs({ '/p': many });
    const r = await scanFolder('/p', { maxFiles: 10 });
    expect(r.truncated).toBe(true);
    expect(r.files.length).toBe(10);
  });

  it('sobrevive a pasta sem permissão e continua o resto do pack', async () => {
    installFakeFs(
      {
        '/p': [
          { name: 'ok.mp4', kind: 'file', size: 1 },
          { name: 'proibida', kind: 'dir' },
        ],
        '/p/proibida': [{ name: 'x.mp4', kind: 'file' }],
      },
      { failOn: 'proibida' },
    );
    const r = await scanFolder('/p');
    expect(rel(r)).toEqual(['ok.mp4']);
    expect(r.truncated).toBe(false);
  });

  it('respeita o sinal de cancelamento', async () => {
    const many = Array.from({ length: 2000 }, (_, i) => ({
      name: `f${i}.mp4`,
      kind: 'file' as const,
    }));
    installFakeFs({ '/p': many });

    const signal = { aborted: false };
    const promise = scanFolder('/p', {
      signal,
      onProgress: () => {
        signal.aborted = true;
      },
    });
    const r = await promise;
    expect(r.files.length).toBeLessThan(2000);
  });

  it('reporta progresso durante a varredura', async () => {
    const many = Array.from({ length: 900 }, (_, i) => ({
      name: `f${i}.mp4`,
      kind: 'file' as const,
    }));
    installFakeFs({ '/p': many });

    const seen: number[] = [];
    await scanFolder('/p', { onProgress: (n) => seen.push(n) });
    expect(seen.length).toBeGreaterThan(1);
    expect(seen.at(-1)).toBe(900);
  });
});

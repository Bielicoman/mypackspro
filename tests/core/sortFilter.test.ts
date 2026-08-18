import { describe, it, expect } from 'vitest';
import { buildPack } from '../../src/core/scan/buildPack.js';
import {
  applyView,
  countByFilter,
  DEFAULT_VIEW,
  matchesFilter,
  type ViewOptions,
} from '../../src/core/scan/sortFilter.js';
import type { Asset } from '../../src/core/model/types.js';

const pack = (names: string[], sizes: number[] = [], times: number[] = []) =>
  buildPack({
    rootPath: 'D:\\P',
    scannedAt: 0,
    files: names.map((relPath, i) => ({
      relPath,
      sizeBytes: sizes[i] ?? 100,
      mtimeMs: times[i] ?? 1000,
    })),
  }).assets;

const view = (o: Partial<ViewOptions>): ViewOptions => ({ ...DEFAULT_VIEW, ...o });
const names = (a: readonly Asset[]) => a.map((x) => x.name);

describe('matchesFilter', () => {
  const assets = pack(['a.mp4', 'b.wav', 'c.png', 'd.mogrt', 'e.prproj', 'f.cr3', 'g.mxf']);
  const find = (n: string) => assets.find((a) => a.name === n)!;

  it('"all" aceita tudo', () => {
    for (const a of assets) expect(matchesFilter(a, 'all')).toBe(true);
  });

  it('vídeo inclui formatos de câmara', () => {
    expect(matchesFilter(find('a.mp4'), 'video')).toBe(true);
    expect(matchesFilter(find('g.mxf'), 'video')).toBe(true);
    expect(matchesFilter(find('b.wav'), 'video')).toBe(false);
  });

  it('imagem agrupa RAW junto das imagens comuns', () => {
    expect(matchesFilter(find('c.png'), 'image')).toBe(true);
    expect(matchesFilter(find('f.cr3'), 'image')).toBe(true);
  });

  it('gráficos isola os .mogrt', () => {
    expect(matchesFilter(find('d.mogrt'), 'graphics')).toBe(true);
    expect(matchesFilter(find('a.mp4'), 'graphics')).toBe(false);
  });

  it('projetos apanha .prproj', () => {
    expect(matchesFilter(find('e.prproj'), 'project')).toBe(true);
  });
});

describe('countByFilter', () => {
  it('conta cada grupo e o total', () => {
    const counts = countByFilter(pack(['a.mp4', 'b.mp4', 'c.wav', 'd.png']));
    expect(counts.all).toBe(4);
    expect(counts.video).toBe(2);
    expect(counts.audio).toBe(1);
    expect(counts.image).toBe(1);
    expect(counts.graphics).toBe(0);
  });
});

describe('applyView — filtro', () => {
  it('mostra só o tipo escolhido', () => {
    const assets = pack(['a.mp4', 'b.wav', 'c.png']);
    expect(names(applyView(assets, view({ filter: 'audio' })))).toEqual(['b.wav']);
  });

  it('não altera a lista original', () => {
    const assets = pack(['b.mp4', 'a.mp4']);
    const before = names(assets);
    applyView(assets, view({ sortDir: 'desc' }));
    expect(names(assets)).toEqual(before);
  });
});

describe('applyView — ordenação', () => {
  it('nome usa ordem natural, não lexicográfica', () => {
    const assets = pack(['SFX 10.wav', 'SFX 2.wav', 'SFX 1.wav']);
    expect(names(applyView(assets, view({ sortKey: 'name' })))).toEqual([
      'SFX 1.wav',
      'SFX 2.wav',
      'SFX 10.wav',
    ]);
  });

  it('descendente inverte a ordem', () => {
    const assets = pack(['a.mp4', 'b.mp4', 'c.mp4']);
    expect(names(applyView(assets, view({ sortDir: 'desc' })))).toEqual([
      'c.mp4',
      'b.mp4',
      'a.mp4',
    ]);
  });

  it('tamanho ordena por bytes', () => {
    const assets = pack(['big.mp4', 'small.mp4'], [900, 10]);
    expect(names(applyView(assets, view({ sortKey: 'size' })))).toEqual(['small.mp4', 'big.mp4']);
  });

  it('data ordena por mtime', () => {
    const assets = pack(['old.mp4', 'new.mp4'], [1, 1], [100, 900]);
    expect(names(applyView(assets, view({ sortKey: 'date' })))).toEqual(['old.mp4', 'new.mp4']);
    expect(names(applyView(assets, view({ sortKey: 'date', sortDir: 'desc' })))).toEqual([
      'new.mp4',
      'old.mp4',
    ]);
  });

  it('tipo agrupa por extensão e depois por nome', () => {
    const assets = pack(['z.mp4', 'a.wav', 'b.mp4']);
    expect(names(applyView(assets, view({ sortKey: 'type' })))).toEqual([
      'b.mp4',
      'z.mp4',
      'a.wav',
    ]);
  });

  it('nomes iguais em pastas diferentes mantêm ordem estável', () => {
    const assets = pack(['B/x.mp4', 'A/x.mp4'], [100, 200]);
    const first = names(applyView(assets, view({})));
    const second = names(applyView(assets, view({})));
    expect(first).toEqual(second);
    expect(applyView(assets, view({}))[0]!.absPath).toContain('A');
  });
});

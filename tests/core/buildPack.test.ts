import { describe, it, expect } from 'vitest';
import { buildPack, assetsIn, naturalCompare } from '../../src/core/scan/buildPack.js';
import type { ScannedFile } from '../../src/core/model/types.js';

const f = (relPath: string, sizeBytes = 1000, mtimeMs = 1): ScannedFile => ({
  relPath,
  sizeBytes,
  mtimeMs,
});

const pack = (files: ScannedFile[], rootPath = 'D:\\Packs\\Meu Pack') =>
  buildPack({ rootPath, files, scannedAt: 0 });

describe('naturalCompare', () => {
  it('ordena números como números, não como texto', () => {
    const sorted = ['SFX 10', 'SFX 2', 'SFX 1'].sort(naturalCompare);
    expect(sorted).toEqual(['SFX 1', 'SFX 2', 'SFX 10']);
  });

  it('lida com prefixos numerados típicos de packs', () => {
    const sorted = ['02 BRUTOS', '10 FINAL', '01 PROJETO'].sort(naturalCompare);
    expect(sorted).toEqual(['01 PROJETO', '02 BRUTOS', '10 FINAL']);
  });
});

describe('buildPack — categorias', () => {
  it('subpastas da raiz viram categorias', () => {
    const p = pack([f('Memes/a.mp4'), f('SFX/b.wav')]);
    expect(p.categories.map((c) => c.name)).toEqual(['Memes', 'SFX']);
  });

  it('subpastas mais fundas viram subcategorias aninhadas', () => {
    const p = pack([f('VFX/Fogo/explosao.mp4'), f('VFX/Fumaca/smoke.mov')]);
    expect(p.categories).toHaveLength(1);
    const vfx = p.categories[0]!;
    expect(vfx.name).toBe('VFX');
    expect(vfx.children.map((c) => c.name)).toEqual(['Fogo', 'Fumaca']);
    expect(vfx.children[0]!.path).toEqual(['VFX', 'Fogo']);
  });

  it('assetCount soma os descendentes', () => {
    const p = pack([
      f('VFX/Fogo/1.mp4'),
      f('VFX/Fogo/2.mp4'),
      f('VFX/Fumaca/3.mp4'),
      f('VFX/solto.mp4'),
    ]);
    const vfx = p.categories[0]!;
    expect(vfx.assetCount).toBe(4);
    expect(vfx.children.find((c) => c.name === 'Fogo')!.assetCount).toBe(2);
  });

  it('ordena categorias naturalmente', () => {
    const p = pack([f('Pack 10/a.mp4'), f('Pack 2/b.mp4'), f('Pack 1/c.mp4')]);
    expect(p.categories.map((c) => c.name)).toEqual(['Pack 1', 'Pack 2', 'Pack 10']);
  });
});

describe('buildPack — arquivos soltos na raiz', () => {
  it('ficam fora de qualquer categoria', () => {
    const p = pack([f('solto.mp4'), f('Memes/dentro.mp4')]);
    expect(p.looseCount).toBe(1);
    const solto = p.assets.find((a) => a.name === 'solto.mp4')!;
    expect(solto.categoryPath).toEqual([]);
    expect(p.categories.map((c) => c.name)).toEqual(['Memes']);
  });
});

describe('buildPack — lixo de sistema', () => {
  it('descarta Thumbs.db, desktop.ini, .DS_Store, dotfiles e arquivos XML', () => {
    const p = pack([
      f('Thumbs.db'),
      f('Memes/desktop.ini'),
      f('Memes/.DS_Store'),
      f('.gitignore'),
      f('Sequencia.xml'),
      f('FinalCut.fcpxml'),
      f('Memes/projeto.xml'),
      f('Memes/bom.mp4'),
    ]);
    expect(p.assets.map((a) => a.name)).toEqual(['bom.mp4']);
    expect(p.looseCount).toBe(0);
  });
});

describe('buildPack — assets', () => {
  it('monta caminho absoluto com o separador da raiz', () => {
    const p = pack([f('Memes/a.mp4')]);
    expect(p.assets[0]!.absPath).toBe('D:\\Packs\\Meu Pack\\Memes\\a.mp4');
  });

  it('preserva separador POSIX quando a raiz é POSIX', () => {
    const p = pack([f('Memes/a.mp4')], '/home/alex/packs/meu');
    expect(p.assets[0]!.absPath).toBe('/home/alex/packs/meu/Memes/a.mp4');
  });

  it('classifica pelo registro de formatos', () => {
    const p = pack([f('a.mkv')]);
    const mkv = p.assets.find((a) => a.name === 'a.mkv')!;
    expect(mkv.format.family).toBe('video');
    expect(mkv.format.importable).toBe(true);
  });

  it('esconde o que o Premiere não importa', () => {
    const p = pack([f('a.mkv'), f('b.ffx'), f('c.pdf'), f('d.ttf'), f('e.cube')]);
    expect(p.assets.map((a) => a.name)).toEqual(['a.mkv', 'e.cube']);
  });

  it('inclui os inutilizáveis quando explicitamente pedido', () => {
    const p = buildPack({
      rootPath: 'D:\Packs\Meu Pack',
      files: [f('a.mkv'), f('b.ffx')],
      scannedAt: 0,
      includeUnusable: true,
    });
    expect(p.assets).toHaveLength(2);
  });

  it('poda categorias que ficam vazias depois do filtro', () => {
    const p = pack([f('Usaveis/a.mp4'), f('Docs/manual.pdf'), f('Fontes/x.ttf')]);
    expect(p.categories.map((c) => c.name)).toEqual(['Usaveis']);
  });

  it('poda subcategoria vazia mas mantém a mãe com conteúdo', () => {
    const p = pack([f('SFX/a.wav'), f('SFX/Docs/leia.pdf')]);
    const sfx = p.categories.find((c) => c.name === 'SFX')!;
    expect(sfx.assetCount).toBe(1);
    expect(sfx.children).toHaveLength(0);
  });

  it('ids são estáveis e distintos', () => {
    const a = pack([f('Memes/a.mp4')]);
    const b = pack([f('Memes/a.mp4')]);
    expect(a.assets[0]!.id).toBe(b.assets[0]!.id);
    const two = pack([f('Memes/a.mp4', 1000), f('SFX/b.mp4', 2000)]);
    expect(two.assets[0]!.id).not.toBe(two.assets[1]!.id);
  });

  it('nunca duplica arquivos idênticos presentes em pastas diferentes', () => {
    const p = pack([
      f('11 - Memes/CJNYCB.avif', 50000),
      f('10 - Elementos/aleatorio/CJNYCB.avif', 50000),
      f('06 - Texturas/3.jpg', 120000),
      f('11 - Memes/3.jpg', 40000),
      f('10 - Elementos/aleatorio/3.jpg', 40000),
    ]);
    // CJNYCB duplicado é ignorado (fica 1).
    // 3.jpg tem 1 textura (120k) e 1 meme (40k) — a cópia duplicada de 40k é ignorada (ficam 2 de 3.jpg).
    expect(p.assets).toHaveLength(3);
    expect(p.assets.map((a) => a.name)).toEqual(['3.jpg', '3.jpg', 'CJNYCB.avif']);
  });

  it('nome do pack vem da última pasta da raiz', () => {
    expect(pack([]).name).toBe('Meu Pack');
    expect(buildPack({ rootPath: 'D:\\Packs\\X\\', files: [], scannedAt: 0 }).name).toBe('X');
  });
});

describe('assetsIn — filtro da barra lateral', () => {
  const p = pack([
    f('solto.mp4'),
    f('VFX/topo.mp4'),
    f('VFX/Fogo/a.mp4'),
    f('VFX/Fogo/b.mp4'),
    f('SFX/c.wav'),
  ]);

  it('null devolve tudo', () => {
    expect(assetsIn(p, null)).toHaveLength(5);
  });

  it('vazio devolve só os soltos da raiz', () => {
    expect(assetsIn(p, []).map((a) => a.name)).toEqual(['solto.mp4']);
  });

  it('categoria inclui descendentes por omissão', () => {
    expect(assetsIn(p, ['VFX']).map((a) => a.name).sort()).toEqual([
      'a.mp4',
      'b.mp4',
      'topo.mp4',
    ]);
  });

  it('pode excluir descendentes', () => {
    expect(assetsIn(p, ['VFX'], false).map((a) => a.name)).toEqual(['topo.mp4']);
  });

  it('subcategoria devolve só o seu conteúdo', () => {
    expect(assetsIn(p, ['VFX', 'Fogo']).map((a) => a.name)).toEqual(['a.mp4', 'b.mp4']);
  });

  it('não confunde categorias com prefixo comum', () => {
    const q = pack([f('VFX/a.mp4'), f('VFXtra/b.mp4')]);
    expect(assetsIn(q, ['VFX']).map((a) => a.name)).toEqual(['a.mp4']);
  });
});

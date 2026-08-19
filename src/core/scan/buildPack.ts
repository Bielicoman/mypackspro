/**
 * Monta a árvore de um pack a partir de uma lista plana de arquivos.
 *
 * Puro de propósito: a varredura do disco (Node) fica em src/node/fsScanner.ts.
 * Assim toda a regra de organização é testável sem tocar no sistema de arquivos.
 *
 * Regras, conforme especificado:
 *  - subpastas da raiz são categorias; subpastas mais fundas são subcategorias
 *  - arquivos soltos na raiz aparecem fora de qualquer categoria
 */

import type { Asset, Category, Pack, ScannedFile } from '../model/types.js';
import { classify, extensionOf } from '../formats/registry.js';
import { fnv1a } from '../util/hash.js';

/** Lixo de sistema que nunca deve aparecer na grade. */
const JUNK = new Set(['thumbs.db', 'desktop.ini', '.ds_store', 'ehthumbs.db', '.directory']);

function isJunk(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    JUNK.has(lower) ||
    lower.startsWith('.') ||
    lower.endsWith('.xml') ||
    lower.endsWith('.fcpxml')
  );
}

/**
 * Comparador natural: "SFX 2" vem antes de "SFX 10".
 * Packs de edição são quase sempre numerados, e ordem lexicográfica pura
 * embaralharia a numeração do utilizador.
 */
export function naturalCompare(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g;
  const ta = a.toLowerCase().match(re) ?? [];
  const tb = b.toLowerCase().match(re) ?? [];
  const n = Math.min(ta.length, tb.length);

  for (let i = 0; i < n; i++) {
    const xa = ta[i] as string;
    const xb = tb[i] as string;
    const na = Number(xa);
    const nb = Number(xb);
    const bothNumeric = !Number.isNaN(na) && !Number.isNaN(nb);

    if (bothNumeric) {
      if (na !== nb) return na - nb;
    } else if (xa !== xb) {
      return xa < xb ? -1 : 1;
    }
  }
  return ta.length - tb.length;
}

/** Nó mutável usado só durante a construção. */
interface Node {
  name: string;
  path: string[];
  children: Map<string, Node>;
  ownCount: number;
}

function makeNode(name: string, path: string[]): Node {
  return { name, path, children: new Map(), ownCount: 0 };
}

function toCategory(node: Node): Category {
  const children = [...node.children.values()]
    .map(toCategory)
    // Uma subpasta só com arquivos inutilizáveis fica vazia depois do filtro;
    // mostrá-la seria oferecer uma categoria que não abre nada.
    .filter((c) => c.assetCount > 0)
    .sort((a, b) => naturalCompare(a.name, b.name));

  const assetCount = children.reduce((sum, c) => sum + c.assetCount, node.ownCount);

  return { name: node.name, path: node.path, children, assetCount };
}

export interface BuildPackInput {
  readonly rootPath: string;
  /** nome a mostrar na aba; por omissão, o último segmento de rootPath */
  readonly name?: string;
  readonly files: readonly ScannedFile[];
  readonly scannedAt: number;
  /**
   * Incluir arquivos que o Premiere não importa (PDF, fontes, presets, LUTs).
   * Falso por omissão: o painel é para assets que se arrastam para a edição, e
   * mostrar o que não se pode usar só polui a grade.
   */
  readonly includeUnusable?: boolean;
}

export function buildPack(input: BuildPackInput): Pack {
  const { rootPath, files, scannedAt } = input;
  const name = input.name ?? (rootPath.split(/[\\/]/).filter(Boolean).pop() ?? rootPath);

  const packId = fnv1a(rootPath.toLowerCase());
  const roots = new Map<string, Node>();
  const assets: Asset[] = [];
  const seenPaths = new Set<string>();
  const seenSignatures = new Set<string>();
  let looseCount = 0;

  for (const f of files) {
    const segments = f.relPath.split('/').filter(Boolean);
    const fileName = segments.pop();
    if (fileName === undefined || isJunk(fileName)) continue;

    const format = classify(fileName);
    if (!format.importable && input.includeUnusable !== true) continue;

    const absPath = joinPath(rootPath, f.relPath);
    const normAbs = absPath.toLowerCase().replace(/[\\/]+/g, '/');
    if (seenPaths.has(normAbs)) continue;

    const lowerName = fileName.toLowerCase();
    const sig =
      f.sizeBytes > 0
        ? `${lowerName}::${f.sizeBytes}`
        : f.mtimeMs > 0
          ? `${lowerName}::0::${f.mtimeMs}`
          : `${lowerName}::${normAbs}`;

    if (seenSignatures.has(sig)) continue;
    seenPaths.add(normAbs);
    seenSignatures.add(sig);

    // registra a categoria (e ancestrais) a que o arquivo pertence
    if (segments.length > 0) {
      let level = roots;
      let node: Node | undefined;
      const acc: string[] = [];

      for (const seg of segments) {
        acc.push(seg);
        let next = level.get(seg);
        if (next === undefined) {
          next = makeNode(seg, [...acc]);
          level.set(seg, next);
        }
        node = next;
        level = next.children;
      }
      if (node !== undefined) node.ownCount++;
    } else {
      looseCount++;
    }

    assets.push({
      id: fnv1a(absPath.toLowerCase()),
      packId,
      absPath,
      name: fileName,
      ext: extensionOf(fileName),
      format,
      sizeBytes: f.sizeBytes,
      mtimeMs: f.mtimeMs,
      categoryPath: segments,
    });
  }

  assets.sort((a, b) => naturalCompare(a.name, b.name));

  const categories = [...roots.values()]
    .map(toCategory)
    .filter((c) => c.assetCount > 0)
    .sort((a, b) => naturalCompare(a.name, b.name));

  return {
    id: packId,
    name,
    rootPath,
    categories,
    assets,
    looseCount,
    scannedAt,
  };
}

/** Junta raiz + caminho relativo preservando o separador da raiz. */
function joinPath(root: string, rel: string): string {
  const useBackslash = root.includes('\\');
  const sep = useBackslash ? '\\' : '/';
  const cleanRoot = root.replace(/[\\/]+$/, '');
  const cleanRel = useBackslash ? rel.replace(/\//g, '\\') : rel;
  return `${cleanRoot}${sep}${cleanRel}`;
}

/**
 * Assets visíveis para uma seleção da barra lateral.
 * `categoryPath` vazio devolve os soltos da raiz; `null` devolve tudo.
 */
export function assetsIn(
  pack: Pack,
  categoryPath: readonly string[] | null,
  includeDescendants = true,
): readonly Asset[] {
  if (categoryPath === null) return pack.assets;

  return pack.assets.filter((a) => {
    if (categoryPath.length === 0) return a.categoryPath.length === 0;
    if (includeDescendants) {
      if (a.categoryPath.length < categoryPath.length) return false;
    } else if (a.categoryPath.length !== categoryPath.length) {
      return false;
    }
    return categoryPath.every((seg, i) => a.categoryPath[i] === seg);
  });
}

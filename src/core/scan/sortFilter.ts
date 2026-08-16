/**
 * Filtragem por tipo e ordenação da grade.
 *
 * Puro e testável: a UI só escolhe as opções, a regra vive aqui.
 */

import type { Asset } from '../model/types.js';
import type { Family } from '../formats/types.js';
import { naturalCompare } from './buildPack.js';

export type TypeFilter = 'all' | 'video' | 'audio' | 'image' | 'graphics' | 'project';
export type SortKey = 'name' | 'type' | 'size' | 'date';
export type SortDir = 'asc' | 'desc';

export interface ViewOptions {
  filter: TypeFilter;
  sortKey: SortKey;
  sortDir: SortDir;
}

export const DEFAULT_VIEW: ViewOptions = {
  filter: 'all',
  sortKey: 'name',
  sortDir: 'asc',
};

/**
 * Que famílias entram em cada filtro.
 *
 * Agrupado pelo que o editor procura, não pela taxonomia interna: quem filtra
 * "Imagens" quer ver PNG, RAW e PSD juntos, sem pensar em como estão classificados.
 */
const FILTER_FAMILIES: Record<Exclude<TypeFilter, 'all'>, ReadonlySet<Family>> = {
  video: new Set<Family>(['video', 'videoCamera']),
  audio: new Set<Family>(['audio']),
  image: new Set<Family>(['image', 'raw', 'photoshop', 'vector']),
  graphics: new Set<Family>(['mogrt']),
  project: new Set<Family>(['projectPremiere', 'projectAfterEffects', 'interchange', 'caption']),
};

export const FILTER_LABELS: ReadonlyArray<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'video', label: 'Vídeos' },
  { value: 'audio', label: 'Áudios' },
  { value: 'image', label: 'Imagens' },
  { value: 'graphics', label: 'Gráficos (.mogrt)' },
  { value: 'project', label: 'Projetos e legendas' },
];

export const SORT_LABELS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: 'name', label: 'Nome' },
  { value: 'type', label: 'Tipo' },
  { value: 'size', label: 'Tamanho' },
  { value: 'date', label: 'Data de modificação' },
];

export function matchesFilter(asset: Asset, filter: TypeFilter): boolean {
  if (filter === 'all') return true;
  return FILTER_FAMILIES[filter].has(asset.format.family);
}

/** Quantos assets de cada filtro existem — alimenta os contadores do menu. */
export function countByFilter(assets: readonly Asset[]): Record<TypeFilter, number> {
  const counts: Record<TypeFilter, number> = {
    all: assets.length,
    video: 0,
    audio: 0,
    image: 0,
    graphics: 0,
    project: 0,
  };
  for (const a of assets) {
    for (const key of ['video', 'audio', 'image', 'graphics', 'project'] as const) {
      if (FILTER_FAMILIES[key].has(a.format.family)) counts[key]++;
    }
  }
  return counts;
}

function compare(a: Asset, b: Asset, key: SortKey): number {
  switch (key) {
    case 'size':
      return a.sizeBytes - b.sizeBytes;
    case 'date':
      return a.mtimeMs - b.mtimeMs;
    case 'type': {
      // Dentro do mesmo tipo, nome natural — senão a lista fica arbitrária.
      const byExt = naturalCompare(a.ext, b.ext);
      return byExt !== 0 ? byExt : naturalCompare(a.name, b.name);
    }
    case 'name':
    default:
      return naturalCompare(a.name, b.name);
  }
}

/**
 * Aplica filtro e ordenação. Não altera a lista recebida.
 *
 * O desempate é sempre pelo caminho absoluto: sem isso, dois arquivos com o
 * mesmo nome em pastas diferentes trocariam de posição a cada renderização.
 */
export function applyView(assets: readonly Asset[], view: ViewOptions): Asset[] {
  const out = assets.filter((a) => matchesFilter(a, view.filter));
  const sign = view.sortDir === 'desc' ? -1 : 1;

  out.sort((a, b) => {
    const primary = compare(a, b, view.sortKey);
    if (primary !== 0) return primary * sign;
    return naturalCompare(a.absPath, b.absPath);
  });

  return out;
}

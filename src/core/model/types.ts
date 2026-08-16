import type { FormatDef } from '../formats/types.js';

/** Estado do preview de um asset. Espelha a máquina de estados da referência. */
export type PreviewState = 'waiting' | 'generating' | 'ready' | 'failed' | 'canceled';

/** Um arquivo dentro de um pack. */
export interface Asset {
  /** id estável derivado do caminho absoluto */
  readonly id: string;
  /** pack a que pertence — necessário para resolver a regra de destino da cópia */
  readonly packId: string;
  readonly absPath: string;
  /** nome do arquivo com extensão */
  readonly name: string;
  readonly ext: string;
  readonly format: FormatDef;
  readonly sizeBytes: number;
  readonly mtimeMs: number;
  /**
   * Categoria a que pertence, do topo para baixo.
   * Vazio significa que o arquivo está solto na raiz do pack — a UI mostra-o
   * fora de qualquer categoria, como pedido.
   */
  readonly categoryPath: readonly string[];
}

/** Uma subpasta do pack. Pode ter subcategorias em qualquer profundidade. */
export interface Category {
  readonly name: string;
  /** caminho completo desde a raiz do pack, incluindo o próprio nome */
  readonly path: readonly string[];
  readonly children: readonly Category[];
  /** número de assets nesta categoria e em todas as descendentes */
  readonly assetCount: number;
}

/** Uma pasta importada pelo utilizador. */
export interface Pack {
  readonly id: string;
  /** nome da pasta importada — é o rótulo da aba no topo do painel */
  readonly name: string;
  readonly rootPath: string;
  readonly categories: readonly Category[];
  /** todos os assets, em lista plana; a UI filtra por categoryPath */
  readonly assets: readonly Asset[];
  /** assets soltos na raiz, fora de qualquer categoria */
  readonly looseCount: number;
  readonly scannedAt: number;
}

/** Entrada bruta produzida pela varredura do sistema de arquivos. */
export interface ScannedFile {
  /** caminho relativo à raiz do pack, sempre com '/' como separador */
  readonly relPath: string;
  readonly sizeBytes: number;
  readonly mtimeMs: number;
}

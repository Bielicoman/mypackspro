/**
 * Registro de formatos — fonte única de verdade.
 *
 * Para suportar uma extensão nova: acrescente-a ao array da família certa em GROUPS.
 * Nada mais no código precisa mudar.
 *
 * Os tiers e estratégias estão explicados em ./types.ts.
 */

import type { Family, FormatDef, PreviewTier, PreviewStrategy, ProbeInfo } from './types.js';

interface Group {
  readonly family: Family;
  readonly tier: PreviewTier;
  readonly strategy: PreviewStrategy;
  readonly importable: boolean;
  readonly icon: string;
  readonly ext: readonly string[];
}

const GROUPS: readonly Group[] = [
  // ---------------------------------------------------------------- tier 1
  {
    family: 'video',
    tier: 1,
    strategy: 'ffmpegVideo',
    importable: true,
    icon: 'video',
    ext: [
      'mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'mxf', 'mpg', 'mpeg', 'm2v',
      'm2ts', 'mts', 'ts', 'wmv', 'flv', 'f4v', '3gp', '3g2', 'vob', 'ogv',
      'asf', 'dv', 'divx',
    ],
  },
  {
    family: 'videoCamera',
    tier: 1,
    strategy: 'ffmpegVideo',
    importable: true,
    icon: 'videoCamera',
    ext: ['r3d', 'braw', 'ari', 'dpx', 'cin'],
  },
  {
    family: 'audio',
    tier: 1,
    strategy: 'ffmpegAudio',
    importable: true,
    icon: 'audio',
    ext: [
      'mp3', 'wav', 'm4a', 'aac', 'opus', 'flac', 'ogg', 'oga', 'aif', 'aiff',
      'aifc', 'wma', 'ac3', 'eac3', 'dts', 'mp2', 'mka', 'caf', 'au', 'amr', 'weba',
    ],
  },
  {
    family: 'image',
    tier: 1,
    strategy: 'ffmpegImage',
    importable: true,
    icon: 'image',
    ext: [
      'jpg', 'jpeg', 'jfif', 'png', 'webp', 'bmp', 'dib', 'tif', 'tiff', 'tga',
      'exr', 'hdr', 'avif', 'heic', 'heif', 'jp2', 'ppm', 'pgm', 'pcx', 'ico',
    ],
  },
  {
    family: 'image',
    tier: 1,
    strategy: 'ffmpegAnimated',
    importable: true,
    icon: 'image',
    ext: ['gif', 'apng'],
  },

  // ---------------------------------------------------------------- tier 2
  {
    family: 'mogrt',
    tier: 2,
    strategy: 'zipPreview',
    importable: true,
    icon: 'mogrt',
    ext: ['mogrt'],
  },
  {
    family: 'photoshop',
    tier: 2,
    strategy: 'embeddedComposite',
    importable: true,
    icon: 'photoshop',
    ext: ['psd', 'psb'],
  },
  {
    family: 'vector',
    tier: 2,
    strategy: 'embeddedThumb',
    // O Premiere importa Illustrator e EPS como imagem estática.
    importable: true,
    icon: 'vector',
    ext: ['ai', 'eps'],
  },
  {
    family: 'vector',
    tier: 2,
    strategy: 'embeddedThumb',
    // PDF e SVG não constam dos formatos que o Premiere importa.
    importable: false,
    icon: 'vector',
    ext: ['pdf', 'svg'],
  },
  {
    family: 'raw',
    tier: 2,
    strategy: 'embeddedJpeg',
    importable: true,
    icon: 'raw',
    ext: [
      'cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'raf', 'pef', 'srw',
      'sr2', '3fr', 'erf',
    ],
  },
  {
    family: 'lut',
    tier: 2,
    strategy: 'lut3d',
    importable: true,
    icon: 'lut',
    ext: ['cube', '3dl', 'look', 'csp', 'm3d', 'cdl'],
  },

  // ---------------------------------------------------------------- tier 3
  {
    family: 'projectPremiere',
    tier: 3,
    strategy: 'icon',
    importable: true,
    icon: 'premiere',
    ext: ['prproj', 'prel', 'ppj'],
  },
  {
    family: 'projectAfterEffects',
    tier: 3,
    strategy: 'icon',
    importable: true,
    icon: 'aftereffects',
    ext: ['aep', 'aepx', 'aet'],
  },
  {
    family: 'projectAdobe',
    tier: 3,
    strategy: 'icon',
    importable: false,
    icon: 'adobe',
    ext: ['indd', 'idml', 'xd', 'fla', 'xfl', 'chproj', 'sesx', 'ses'],
  },
  {
    family: 'preset',
    tier: 3,
    strategy: 'icon',
    importable: false,
    icon: 'preset',
    ext: [
      'ffx', 'prfpset', 'epr', 'abr', 'atn', 'asl', 'pat', 'aco', 'ase',
      'grd', 'lrtemplate',
    ],
  },
  {
    family: 'interchange',
    tier: 3,
    strategy: 'icon',
    importable: true,
    icon: 'interchange',
    ext: ['aaf', 'edl', 'omf', 'drp'],
  },
  {
    family: 'interchange',
    tier: 3,
    strategy: 'icon',
    importable: false,
    icon: 'interchange',
    ext: ['xml', 'fcpxml'],
  },
  {
    family: 'font',
    tier: 3,
    strategy: 'icon',
    importable: false,
    icon: 'font',
    ext: ['ttf', 'otf', 'ttc', 'woff', 'woff2'],
  },
  {
    family: 'caption',
    tier: 3,
    strategy: 'icon',
    importable: true,
    icon: 'caption',
    ext: ['srt', 'vtt', 'ass', 'ssa', 'sbv'],
  },
];

export const UNKNOWN: FormatDef = {
  family: 'unknown',
  tier: 3,
  strategy: 'icon',
  importable: false,
  icon: 'unknown',
};

/** extensão (sem ponto, minúscula) → definição */
const BY_EXT: ReadonlyMap<string, FormatDef> = (() => {
  const map = new Map<string, FormatDef>();
  for (const g of GROUPS) {
    const def: FormatDef = {
      family: g.family,
      tier: g.tier,
      strategy: g.strategy,
      importable: g.importable,
      icon: g.icon,
    };
    for (const e of g.ext) {
      if (map.has(e)) {
        throw new Error(`Registro de formatos: extensão duplicada ".${e}"`);
      }
      map.set(e, def);
    }
  }
  return map;
})();

/** Extrai a extensão normalizada de um nome ou caminho. '' se não houver. */
export function extensionOf(nameOrPath: string): string {
  const base = nameOrPath.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

/** Classifica um arquivo. Nunca lança: desconhecido devolve UNKNOWN. */
export function classify(nameOrPath: string): FormatDef {
  return BY_EXT.get(extensionOf(nameOrPath)) ?? UNKNOWN;
}

/** O arquivo pode ser arrastado para o Premiere? */
export function isImportable(nameOrPath: string): boolean {
  return classify(nameOrPath).importable;
}

/** Todas as extensões conhecidas — usado pelo scanner para filtrar a varredura. */
export function knownExtensions(): readonly string[] {
  return [...BY_EXT.keys()];
}

// ---------------------------------------------------------------------------
// Otimização confirmada na Fase 0: o CEF da Adobe toca H.264/AAC nativamente,
// então arquivos que já são leves e nativamente reproduzíveis dispensam proxy.
// ---------------------------------------------------------------------------

/** Contêineres que o Chromium 99 abre direto. `.mov` e `.mkv` ficam de fora — medido. */
const NATIVE_CONTAINERS = new Set(['mp4', 'm4v', 'webm']);

/** Codecs de vídeo que o Chromium 99 decodifica. Medido via canPlayType. */
const NATIVE_VIDEO_CODECS = new Set(['h264', 'avc1', 'vp8', 'vp9']);

/** Acima disto, gerar proxy compensa mesmo que o original fosse reproduzível. */
export const PROXY_THRESHOLD_BYTES = 80 * 1024 * 1024;
export const PROXY_THRESHOLD_HEIGHT = 1080;

/**
 * Decide se vale gastar ffmpeg neste arquivo.
 *
 * Falso apenas quando o original é seguramente leve E nativamente reproduzível —
 * nesse caso a grade aponta direto para ele e a fila nem o vê.
 */
export function needsProxy(nameOrPath: string, info: ProbeInfo): boolean {
  const def = classify(nameOrPath);
  if (def.strategy !== 'ffmpegVideo') return def.tier === 1;

  const ext = extensionOf(nameOrPath);
  if (!NATIVE_CONTAINERS.has(ext)) return true;
  if (info.sizeBytes > PROXY_THRESHOLD_BYTES) return true;
  if (info.height !== undefined && info.height > PROXY_THRESHOLD_HEIGHT) return true;
  if (info.videoCodec !== undefined && !NATIVE_VIDEO_CODECS.has(info.videoCodec.toLowerCase())) {
    return true;
  }
  // Sem informação de codec não dá para afirmar que toca — na dúvida, gera proxy.
  return info.videoCodec === undefined;
}

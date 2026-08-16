/**
 * Cache de previews em %APPDATA%\MyPacksPro\cache.
 *
 * O nome do arquivo inclui caminho, tamanho e mtime do original, por isso
 * editar o asset invalida o preview sozinho — não há limpeza manual a fazer.
 *
 * Junto de cada preview fica um `.json` com a duração. Sem ele, a duração
 * desapareceria assim que o preview passasse a vir do disco, já que aí o
 * ffprobe não chega a correr.
 */

import type { Asset } from '../core/model/types.js';
import type { PreviewStrategy } from '../core/formats/types.js';
import { cacheKey } from '../core/util/hash.js';
import { needsProxy } from '../core/formats/registry.js';
import { dataDir, fsp, path } from './nodeApi.js';
import {
  makeAnimatedProxy,
  makeImageThumb,
  makeLutPreview,
  makeVideoProxy,
  makeWaveform,
  probe,
  type FfmpegTools,
} from './ffmpeg.js';

export type PreviewKind = 'video' | 'image';

export interface Preview {
  /** URL pronto a usar em <video> ou <img>. */
  readonly url: string;
  readonly kind: PreviewKind;
  /** Duração do original em segundos. Ausente em imagens e LUTs. */
  readonly durationSec?: number;
}

/** Estratégias que o pipeline já sabe produzir. As restantes ficam no ícone. */
const SUPPORTED = new Set<PreviewStrategy>([
  'ffmpegVideo',
  'ffmpegAudio',
  'ffmpegImage',
  'ffmpegAnimated',
  'lut3d',
]);

export function canPreview(strategy: PreviewStrategy): boolean {
  return SUPPORTED.has(strategy);
}

function outputExt(strategy: PreviewStrategy): string {
  return strategy === 'ffmpegVideo' || strategy === 'ffmpegAnimated' ? 'webm' : 'png';
}

/** Converte caminho nativo em URL file:// que o CEF aceita. */
export function fileUrl(nativePath: string): string {
  const norm = nativePath.replace(/\\/g, '/');
  const withSlash = norm.startsWith('/') ? norm : `/${norm}`;
  // Espaços e acentos são comuns em pastas de edição e partiriam o URL.
  return `file://${encodeURI(withSlash).replace(/#/g, '%23').replace(/\?/g, '%3F')}`;
}

export function cacheDir(): string {
  return path().join(dataDir(), 'cache');
}

function baseName(asset: Asset): string {
  return cacheKey(asset.absPath, asset.sizeBytes, asset.mtimeMs);
}

function cachePath(asset: Asset): string {
  return path().join(cacheDir(), `${baseName(asset)}.${outputExt(asset.format.strategy)}`);
}

function metaPath(asset: Asset): string {
  return path().join(cacheDir(), `${baseName(asset)}.json`);
}

/**
 * Cache válido = arquivo existe **e tem conteúdo**.
 *
 * Verificar só a existência era um bug: quando o ffmpeg falha, deixa para trás
 * um arquivo de 0 bytes. Na visita seguinte isso passaria por preview pronto e
 * a célula mostraria um vídeo partido para sempre, sem nunca tentar de novo.
 */
async function hasContent(p: string): Promise<boolean> {
  try {
    const st = await fsp().stat(p);
    return st.size > 0;
  } catch {
    return false;
  }
}

/** Remove a saída parcial de uma geração falhada, para não envenenar o cache. */
async function discard(p: string): Promise<void> {
  try {
    await fsp().unlink(p);
  } catch {
    /* já não existe, ou está bloqueado: a verificação de tamanho cobre isso */
  }
}

/** Corre um gerador e limpa a saída se ele falhar. */
async function generate(out: string, work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (e) {
    await discard(out);
    throw e;
  }
  if (!(await hasContent(out))) {
    await discard(out);
    throw new Error('ffmpeg terminou sem produzir saída');
  }
}

interface CachedMeta {
  durationSec?: number;
  /** Picos da waveform, 0–1. Só para áudio. */
  peaks?: number[];
}

async function readMeta(asset: Asset): Promise<CachedMeta> {
  try {
    const raw = await fsp().readFile(metaPath(asset), 'utf8');
    const parsed = JSON.parse(raw) as CachedMeta;
    return typeof parsed.durationSec === 'number' ? parsed : {};
  } catch {
    return {};
  }
}

/** Metadados de áudio guardados: duração e picos da waveform. */
export async function readAudioMeta(
  asset: Asset,
): Promise<{ durationSec: number; peaks: number[] } | null> {
  const meta = await readMeta(asset);
  if (typeof meta.durationSec !== 'number' || !Array.isArray(meta.peaks)) return null;
  return { durationSec: meta.durationSec, peaks: meta.peaks };
}

export async function writeAudioMeta(
  asset: Asset,
  durationSec: number,
  peaks: readonly number[],
): Promise<void> {
  await fsp().mkdir(cacheDir(), { recursive: true });
  await writeMeta(asset, { durationSec, peaks: [...peaks] });
}

async function writeMeta(asset: Asset, meta: CachedMeta): Promise<void> {
  try {
    await fsp().writeFile(metaPath(asset), JSON.stringify(meta), 'utf8');
  } catch {
    // Metadados são um extra: falhar aqui não deve estragar o preview.
  }
}

/** Junta o URL com a duração, omitindo-a quando não existe. */
function withDuration(url: string, kind: PreviewKind, durationSec?: number): Preview {
  return durationSec !== undefined && durationSec > 0
    ? { url, kind, durationSec }
    : { url, kind };
}

/**
 * Garante que existe um preview para o asset e devolve como o mostrar.
 *
 * Lança se não for possível gerar — quem chama marca a célula como falhada.
 */
export async function ensurePreview(tools: FfmpegTools, asset: Asset): Promise<Preview> {
  const strategy = asset.format.strategy;
  if (!canPreview(strategy)) {
    throw new Error(`Sem gerador para "${strategy}"`);
  }

  /* ---------------------------------------------------------------- vídeo */
  if (strategy === 'ffmpegVideo') {
    const out = cachePath(asset);
    const cachedMeta = await readMeta(asset);

    if (cachedMeta.durationSec !== undefined && (await hasContent(out))) {
      return withDuration(fileUrl(out), 'video', cachedMeta.durationSec);
    }

    const info = await probe(tools, asset.absPath);
    await fsp().mkdir(cacheDir(), { recursive: true });
    await writeMeta(asset, { durationSec: info.durationSec });

    // Vídeo já leve e nativamente reproduzível dispensa proxy — medido na Fase 0.
    const proxyNeeded = needsProxy(asset.name, {
      sizeBytes: asset.sizeBytes,
      ...(info.height !== undefined ? { height: info.height } : {}),
      ...(info.videoCodec !== undefined ? { videoCodec: info.videoCodec } : {}),
    });
    if (!proxyNeeded) {
      return withDuration(fileUrl(asset.absPath), 'video', info.durationSec);
    }

    if (!(await hasContent(out))) {
      await generate(out, () => makeVideoProxy(tools, asset.absPath, out, info));
    }
    return withDuration(fileUrl(out), 'video', info.durationSec);
  }

  /* ------------------------------------------------------- restantes tipos */
  const out = cachePath(asset);
  const kind: PreviewKind = strategy === 'ffmpegAnimated' ? 'video' : 'image';
  const timed = strategy === 'ffmpegAudio' || strategy === 'ffmpegAnimated';

  if (await hasContent(out)) {
    const meta = await readMeta(asset);
    // Preview antigo, gerado antes de haver metadados: aceita-o sem duração.
    if (!timed || meta.durationSec !== undefined) {
      return withDuration(fileUrl(out), kind, meta.durationSec);
    }
  }

  await fsp().mkdir(cacheDir(), { recursive: true });

  let durationSec: number | undefined;
  if (timed) {
    try {
      durationSec = (await probe(tools, asset.absPath)).durationSec;
      await writeMeta(asset, { durationSec });
    } catch {
      // Sem duração o preview continua a valer; só não se mostra o tempo.
    }
  }

  if (!(await hasContent(out))) {
    await generate(out, async () => {
      switch (strategy) {
        case 'ffmpegAudio':
          await makeWaveform(tools, asset.absPath, out);
          break;
        case 'ffmpegImage':
          await makeImageThumb(tools, asset.absPath, out);
          break;
        case 'ffmpegAnimated':
          await makeAnimatedProxy(tools, asset.absPath, out);
          break;
        case 'lut3d':
          await makeLutPreview(tools, asset.absPath, out);
          break;
        default:
          throw new Error(`Estratégia não tratada: ${strategy}`);
      }
    });
  }

  return withDuration(fileUrl(out), kind, durationSec);
}

/** Apaga o cache de previews. Devolve quantos arquivos foram removidos. */
export async function clearPreviewCache(): Promise<number> {
  const fs = fsp();
  const dir = cacheDir();
  let removed = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile()) continue;
      try {
        await fs.unlink(path().join(dir, e.name));
        removed++;
      } catch {
        // Um arquivo em uso pelo painel não impede a limpeza dos restantes.
      }
    }
  } catch {
    /* cache ainda não existe */
  }
  return removed;
}

/**
 * Camada sobre o ffmpeg/ffprobe.
 *
 * Formato dos proxies: **VP8/WebM**. A Fase 0 mediu que o CEF do Premiere toca
 * H.264 nativamente, mas codificar H.264 exige `libx264`, que é GPL e
 * contaminaria a distribuição do plugin. `libvpx` é BSD e roda numa build LGPL.
 */

import { bundledBinSubdir, executableName } from '../core/platform/platform.js';
import { currentPlatform, envPath, existsSync, path, spawn, type ChildProc } from './nodeApi.js';

export interface FfmpegTools {
  ffmpeg: string;
  ffprobe: string;
}

export interface MediaInfo {
  durationSec: number;
  width?: number;
  height?: number;
  videoCodec?: string;
  hasAudio: boolean;
}

/* ------------------------------------------------------------------ localização */



/**
 * Procura os binários, em ordem de preferência:
 *  1. embarcados no plugin (o que será distribuído)
 *  2. caminho configurado pelo utilizador
 *  3. PATH do sistema (comum em máquinas de edição)
 */
export function findTools(pluginDir: string, configured?: string): FfmpegTools | null {
  const p = path();
  const platform = currentPlatform();
  const bundled = bundledBinSubdir(platform);

  const candidates: string[] = [
    ...(bundled === null ? [] : [p.join(pluginDir, ...bundled.split('/'))]),
    ...(configured !== undefined && configured !== '' ? [configured] : []),
    ...envPath(),
  ];

  for (const dir of candidates) {
    const ffmpeg = p.join(dir, executableName('ffmpeg', platform));
    const ffprobe = p.join(dir, executableName('ffprobe', platform));
    if (existsSync(ffmpeg) && existsSync(ffprobe)) return { ffmpeg, ffprobe };
  }
  return null;
}

/* ------------------------------------------------------------------ execução */

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export class FfmpegError extends Error {
  constructor(
    message: string,
    readonly stderr: string,
  ) {
    super(message);
    this.name = 'FfmpegError';
  }
}

/** Executa um binário e recolhe a saída. `signal` permite matar o processo. */
/**
 * Tecto de tempo por processo.
 *
 * Generoso de proposito: medido, um ProRes 4444 4K de 216 MB numa drive
 * sincronizada leva ~57 s so a ser lido. O objectivo aqui nao e cortar cedo, e
 * garantir que um processo encravado nao segura uma vaga da fila para sempre.
 */
const RUN_TIMEOUT_MS = 6 * 60 * 1000;

export function run(
  bin: string,
  args: readonly string[],
  signal?: { aborted: boolean; onAbort?: (kill: () => void) => void },
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    let proc: ChildProc;
    try {
      proc = spawn()(bin, args, { windowsHide: true });
    } catch (e) {
      reject(new FfmpegError(`Falha ao iniciar ${bin}: ${(e as Error).message}`, ''));
      return;
    }

    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (c) => {
      stdout += c.toString();
    });
    // O ffmpeg escreve progresso e diagnóstico em stderr mesmo quando corre bem.
    proc.stderr?.on('data', (c) => {
      stderr += c.toString();
    });

    signal?.onAbort?.(() => proc.kill());

    const timer = setTimeout(() => {
      proc.kill();
      reject(new FfmpegError(`Tempo esgotado ao processar (${RUN_TIMEOUT_MS / 1000}s)`, stderr));
    }, RUN_TIMEOUT_MS);

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new FfmpegError(err.message, stderr));
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

async function mustSucceed(bin: string, args: readonly string[], what: string): Promise<RunResult> {
  const r = await run(bin, args);
  if (r.code !== 0) {
    // As últimas linhas do stderr são as que explicam a falha.
    const tail = r.stderr.trim().split('\n').slice(-4).join(' | ');
    throw new FfmpegError(`${what} falhou (código ${r.code}): ${tail}`, r.stderr);
  }
  return r;
}

/* ------------------------------------------------------------------ sondagem */

interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
}

interface ProbeJson {
  streams?: ProbeStream[];
  format?: { duration?: string };
}

export async function probe(tools: FfmpegTools, src: string): Promise<MediaInfo> {
  const r = await mustSucceed(
    tools.ffprobe,
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', src],
    'ffprobe',
  );

  const json = JSON.parse(r.stdout) as ProbeJson;
  const streams = json.streams ?? [];
  const video = streams.find((s) => s.codec_type === 'video');
  const audio = streams.find((s) => s.codec_type === 'audio');

  const info: MediaInfo = {
    durationSec: Number(json.format?.duration ?? 0) || 0,
    hasAudio: audio !== undefined,
  };
  if (video?.width !== undefined) Object.assign(info, { width: video.width });
  if (video?.height !== undefined) Object.assign(info, { height: video.height });
  if (video?.codec_name !== undefined) Object.assign(info, { videoCodec: video.codec_name });
  return info;
}

/* ------------------------------------------------------------------ geradores */

/** Altura do proxy. 240p mantém a grade fluida mesmo com dezenas de players. */
const PROXY_HEIGHT = 240;
/** Duração do laço de pré-visualização. Curto o suficiente para gerar depressa. */
const PROXY_SECONDS = 6;

/**
 * Proxy de vídeo em VP8/WebM, com áudio Opus quando existe.
 *
 * Começa a amostragem a 10% da duração: muitos assets abrem com fade-in preto,
 * e um preview que começa preto não diz nada ao editor.
 */
export async function makeVideoProxy(
  tools: FfmpegTools,
  src: string,
  out: string,
  info: MediaInfo,
): Promise<void> {
  const start = info.durationSec > 12 ? Math.min(info.durationSec * 0.1, 30) : 0;

  // Áudio só entra quando existe; caso contrário `-an` evita uma faixa vazia.
  const audioArgs = info.hasAudio ? ['-c:a', 'libopus', '-b:a', '64k'] : ['-an'];

  const args = [
    '-y',
    '-hide_banner',
    '-v', 'error',
    // -ss antes de -i faz o salto usar o índice do contêiner: muito mais rápido.
    ...(start > 0 ? ['-ss', start.toFixed(2)] : []),
    '-i', src,
    '-t', String(PROXY_SECONDS),
    // format=yuv420p é obrigatório, não cosmético: muitos overlays de VFX são
    // ProRes 4444 com alfa (yuva444p12le) e o libvpx recusa-os com
    // "Transparency encoding with auto_alt_ref does not work". Estes packs já
    // vêm renderizados sobre preto, por isso descartar o alfa dá o visual certo.
    '-vf', `scale=-2:${PROXY_HEIGHT}:flags=fast_bilinear,format=yuv420p`,
    '-c:v', 'libvpx',
    '-b:v', '500k',
    '-crf', '32',
    '-auto-alt-ref', '0',
    // libvpx é lento por omissão; estes dois trocam compressão por velocidade,
    // que é o compromisso certo para uma miniatura descartável.
    '-cpu-used', '8',
    '-deadline', 'realtime',
    ...audioArgs,
    out,
  ];

  await mustSucceed(tools.ffmpeg, args, 'Proxy de vídeo');
}

/**
 * Waveform estéreo em PNG — `split_channels` desenha os canais separados,
 * que é exatamente a leitura visual usada pelos painéis de referência.
 */
export async function makeWaveform(tools: FfmpegTools, src: string, out: string): Promise<void> {
  await mustSucceed(
    tools.ffmpeg,
    [
      '-y', '-hide_banner', '-v', 'error',
      '-i', src,
      '-filter_complex',
      'showwavespic=s=480x240:split_channels=1:colors=0xe2e2e2|0xe2e2e2',
      '-frames:v', '1',
      out,
    ],
    'Waveform',
  );
}

/** Miniatura de imagem estática. */
export async function makeImageThumb(tools: FfmpegTools, src: string, out: string): Promise<void> {
  await mustSucceed(
    tools.ffmpeg,
    [
      '-y', '-hide_banner', '-v', 'error',
      '-i', src,
      '-vf', `scale=-2:${PROXY_HEIGHT}:flags=lanczos`,
      '-frames:v', '1',
      out,
    ],
    'Miniatura',
  );
}

/** GIF/APNG animado → WebM curto, para não pagar o custo de um GIF grande na grade. */
export async function makeAnimatedProxy(
  tools: FfmpegTools,
  src: string,
  out: string,
): Promise<void> {
  await mustSucceed(
    tools.ffmpeg,
    [
      '-y', '-hide_banner', '-v', 'error',
      '-i', src,
      '-t', String(PROXY_SECONDS),
      // GIF quase sempre tem transparência — mesmo motivo do proxy de vídeo.
      '-vf', `scale=-2:${PROXY_HEIGHT}:flags=fast_bilinear,format=yuv420p`,
      '-c:v', 'libvpx', '-b:v', '400k', '-cpu-used', '8', '-deadline', 'realtime',
      '-auto-alt-ref', '0',
      '-an',
      out,
    ],
    'Proxy animado',
  );
}

/**
 * Pré-visualização de LUT: aplica a tabela a uma imagem de referência gerada
 * na hora (gradiente + barras), para se ver o efeito da LUT sem depender de
 * nenhum asset embarcado.
 */
export async function makeLutPreview(tools: FfmpegTools, src: string, out: string): Promise<void> {
  // Escapa o caminho para o parser de filtros: ':' e '\' têm significado próprio.
  const escaped = src.replace(/\\/g, '/').replace(/:/g, '\\:');
  await mustSucceed(
    tools.ffmpeg,
    [
      '-y', '-hide_banner', '-v', 'error',
      '-f', 'lavfi',
      '-i', `smptebars=size=426x240,format=rgb24`,
      '-vf', `lut3d=file='${escaped}'`,
      '-frames:v', '1',
      out,
    ],
    'Pré-visualização de LUT',
  );
}

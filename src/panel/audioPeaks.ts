/**
 * Picos de áudio calculados no painel, com a Web Audio API.
 *
 * A Fase 0 mediu que o CEF decodifica MP3, AAC, Opus, FLAC e WAV nativamente,
 * por isso não é preciso chamar o ffmpeg: `decodeAudioData` dá as amostras e a
 * duração numa só passagem. O resultado fica em cache, logo cada arquivo só é
 * decodificado uma vez na vida.
 */

import type { Asset } from '../core/model/types.js';
import { computePeaks, normalizePeaks, PEAK_BUCKETS } from '../core/preview/peaks.js';
import { fileUrl, readAudioMeta, writeAudioMeta } from '../node/previewCache.js';

export interface AudioMeta {
  durationSec: number;
  peaks: number[];
}

/**
 * Acima disto não se decodifica: um arquivo muito grande viraria centenas de MB
 * em memória dentro do processo do painel, que corre dentro do Premiere.
 */
const MAX_DECODE_BYTES = 120 * 1024 * 1024;

let ctx: AudioContext | null = null;
function audioContext(): AudioContext {
  ctx ??= new AudioContext();
  return ctx;
}


export async function ensureAudioMeta(asset: Asset): Promise<AudioMeta> {
  const cached = await readAudioMeta(asset);
  if (cached !== null) return cached;

  if (asset.sizeBytes > MAX_DECODE_BYTES) {
    throw new Error('Arquivo grande demais para gerar a waveform');
  }

  const response = await fetch(fileUrl(asset.absPath));
  const bytes = await response.arrayBuffer();
  const buffer = await audioContext().decodeAudioData(bytes);

  // Um canal basta para a forma; misturar os dois só suavizaria os transientes.
  const samples = buffer.getChannelData(0);
  const peaks = normalizePeaks(computePeaks(samples, PEAK_BUCKETS));

  const meta: AudioMeta = { durationSec: buffer.duration, peaks };
  await writeAudioMeta(asset, meta.durationSec, meta.peaks);
  return meta;
}

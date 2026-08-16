/**
 * Extração de picos para desenhar a waveform em barras.
 *
 * Guardamos picos em vez de uma imagem porque o desenho passa a ser dinâmico:
 * dá para colorir a parte já reproduzida, ajustar o número de barras à largura
 * da célula e sobrepor a agulha — nada disso é possível com um PNG pronto.
 */

/** Número de barras guardado em cache. A UI reamostra para o que couber. */
export const PEAK_BUCKETS = 96;

/**
 * Reduz as amostras a `buckets` picos entre 0 e 1.
 *
 * Usa o valor absoluto máximo de cada intervalo, não a média: a média achata
 * transientes curtos e um whoosh acabaria por parecer silêncio.
 */
export function computePeaks(samples: Float32Array, buckets = PEAK_BUCKETS): number[] {
  if (buckets <= 0) return [];
  if (samples.length === 0) return new Array<number>(buckets).fill(0);

  const out = new Array<number>(buckets).fill(0);
  const size = samples.length / buckets;

  for (let b = 0; b < buckets; b++) {
    const start = Math.floor(b * size);
    const end = Math.min(samples.length, Math.max(start + 1, Math.floor((b + 1) * size)));

    let peak = 0;
    for (let i = start; i < end; i++) {
      const v = Math.abs(samples[i] as number);
      if (v > peak) peak = v;
    }
    out[b] = peak;
  }
  return out;
}

/**
 * Normaliza para o pico mais alto ocupar toda a altura.
 *
 * Sem isto, gravações com pouco volume ficavam quase invisíveis na grade — o
 * que interessa aqui é reconhecer a forma do som, não comparar volumes.
 */
export function normalizePeaks(peaks: readonly number[]): number[] {
  const max = peaks.reduce((m, p) => (p > m ? p : m), 0);
  if (max <= 0) return peaks.map(() => 0);
  return peaks.map((p) => p / max);
}

/** Reamostra para outro número de barras, para a célula caber sem distorcer. */
export function resamplePeaks(peaks: readonly number[], target: number): number[] {
  if (target <= 0 || peaks.length === 0) return [];
  if (target === peaks.length) return [...peaks];

  const out = new Array<number>(target).fill(0);
  const size = peaks.length / target;

  for (let b = 0; b < target; b++) {
    const start = Math.floor(b * size);
    const end = Math.min(peaks.length, Math.max(start + 1, Math.floor((b + 1) * size)));
    let peak = 0;
    for (let i = start; i < end; i++) {
      const v = peaks[i] as number;
      if (v > peak) peak = v;
    }
    out[b] = peak;
  }
  return out;
}

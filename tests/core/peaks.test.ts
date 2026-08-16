import { describe, it, expect } from 'vitest';
import {
  computePeaks,
  normalizePeaks,
  PEAK_BUCKETS,
  resamplePeaks,
} from '../../src/core/preview/peaks.js';

describe('computePeaks', () => {
  it('devolve o número de barras pedido', () => {
    expect(computePeaks(new Float32Array(1000), 32)).toHaveLength(32);
    expect(computePeaks(new Float32Array(1000))).toHaveLength(PEAK_BUCKETS);
  });

  it('usa o máximo absoluto do intervalo, não a média', () => {
    // um transiente isolado tem de sobreviver
    const s = new Float32Array(100);
    s[50] = 0.9;
    const peaks = computePeaks(s, 2);
    expect(peaks[1]).toBeCloseTo(0.9, 5);
  });

  it('trata amplitude negativa como positiva', () => {
    const s = new Float32Array([-0.8, 0.1, -0.2, 0.05]);
    expect(computePeaks(s, 1)[0]).toBeCloseTo(0.8, 5);
  });

  it('silêncio dá zeros', () => {
    expect(computePeaks(new Float32Array(64), 8).every((p) => p === 0)).toBe(true);
  });

  it('entrada vazia devolve barras a zero em vez de quebrar', () => {
    expect(computePeaks(new Float32Array(0), 4)).toEqual([0, 0, 0, 0]);
  });

  it('mais barras do que amostras não produz buracos', () => {
    const peaks = computePeaks(new Float32Array([1, 1]), 8);
    expect(peaks).toHaveLength(8);
    expect(peaks.every((p) => Number.isFinite(p))).toBe(true);
  });
});

describe('normalizePeaks', () => {
  it('leva o pico mais alto a 1', () => {
    expect(normalizePeaks([0.1, 0.25, 0.05])).toEqual([0.4, 1, 0.2]);
  });

  it('silêncio total continua a zero, sem divisão por zero', () => {
    expect(normalizePeaks([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('resamplePeaks', () => {
  it('reduz mantendo os picos', () => {
    expect(resamplePeaks([0, 1, 0, 0.5], 2)).toEqual([1, 0.5]);
  });

  it('amplia sem perder o número de barras', () => {
    expect(resamplePeaks([0, 1], 6)).toHaveLength(6);
  });

  it('mesmo tamanho devolve cópia, não a mesma referência', () => {
    const input = [0.2, 0.4];
    const out = resamplePeaks(input, 2);
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
  });

  it('alvos inválidos devolvem lista vazia', () => {
    expect(resamplePeaks([1, 2], 0)).toEqual([]);
    expect(resamplePeaks([], 8)).toEqual([]);
  });
});

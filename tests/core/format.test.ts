import { describe, it, expect } from 'vitest';
import { formatDuration } from '../../src/core/util/format.js';

describe('formatDuration', () => {
  it('formata segundos como m:ss', () => {
    expect(formatDuration(3)).toBe('0:03');
    expect(formatDuration(59)).toBe('0:59');
    expect(formatDuration(83)).toBe('1:23');
  });

  it('usa h:mm:ss apenas acima de uma hora', () => {
    expect(formatDuration(3599)).toBe('59:59');
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3723)).toBe('1:02:03');
  });

  it('arredonda para o segundo mais próximo', () => {
    expect(formatDuration(2.4)).toBe('0:02');
    expect(formatDuration(2.6)).toBe('0:03');
  });

  it('devolve vazio para valores inválidos', () => {
    expect(formatDuration(NaN)).toBe('');
    expect(formatDuration(-1)).toBe('');
    expect(formatDuration(Infinity)).toBe('');
  });

  it('trata zero como duração legítima', () => {
    expect(formatDuration(0)).toBe('0:00');
  });
});

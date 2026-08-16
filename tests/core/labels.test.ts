import { describe, it, expect } from 'vitest';
import { findLabel, labelByIndex, PREMIERE_LABELS } from '../../src/core/copy/labels.js';
import { ruleKey } from '../../src/core/copy/rules.js';

const PACK = 'p1';

describe('PREMIERE_LABELS', () => {
  it('tem os 16 rótulos, com índices contínuos', () => {
    expect(PREMIERE_LABELS).toHaveLength(16);
    PREMIERE_LABELS.forEach((l, i) => expect(l.index).toBe(i));
  });

  it('nomes e cores são únicos', () => {
    expect(new Set(PREMIERE_LABELS.map((l) => l.name)).size).toBe(16);
    expect(new Set(PREMIERE_LABELS.map((l) => l.hex)).size).toBe(16);
  });

  it('labelByIndex devolve indefinido fora do intervalo', () => {
    expect(labelByIndex(0)?.name).toBe('Violeta');
    expect(labelByIndex(15)?.name).toBe('Amarelo');
    expect(labelByIndex(16)).toBeUndefined();
    expect(labelByIndex(-1)).toBeUndefined();
  });
});

describe('findLabel', () => {
  const labels = {
    [ruleKey(PACK, ['SFX'])]: 9,
    [ruleKey(PACK, ['SFX', 'Impacto'])]: 6,
  };

  it('encontra o rótulo exato', () => {
    expect(findLabel(labels, PACK, ['SFX'])).toBe(9);
  });

  it('herda do ancestral mais próximo', () => {
    expect(findLabel(labels, PACK, ['SFX', 'Whoosh'])).toBe(9);
    expect(findLabel(labels, PACK, ['SFX', 'Whoosh', 'Longos'])).toBe(9);
  });

  it('o mais específico ganha ao pai', () => {
    expect(findLabel(labels, PACK, ['SFX', 'Impacto'])).toBe(6);
  });

  it('sem regra devolve indefinido', () => {
    expect(findLabel(labels, PACK, ['VFX'])).toBeUndefined();
    expect(findLabel(labels, 'outro', ['SFX'])).toBeUndefined();
  });

  it('índice 0 é válido e não confundido com ausência', () => {
    expect(findLabel({ [ruleKey(PACK, ['VFX'])]: 0 }, PACK, ['VFX'])).toBe(0);
  });

  it('ignora índices fora do intervalo', () => {
    expect(findLabel({ [ruleKey(PACK, ['VFX'])]: 99 }, PACK, ['VFX'])).toBeUndefined();
  });

  it('uma regra na raiz do pack vale para tudo', () => {
    expect(findLabel({ [ruleKey(PACK, [])]: 3 }, PACK, ['SFX', 'Whoosh'])).toBe(3);
  });
});

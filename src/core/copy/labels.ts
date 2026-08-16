/**
 * Rótulos de cor do Premiere.
 *
 * A ordem é a da própria aplicação (índices 0–15) — é ela que o ExtendScript
 * espera em `setColorLabel`. Os nomes seguem a interface em português; as cores
 * são aproximações das amostras do Premiere, usadas só para desenhar o seletor.
 */

export interface PremiereLabel {
  readonly index: number;
  /** Nome mostrado no painel, na lingua da interface. */
  readonly name: string;
  /**
   * Nome interno que o Premiere grava nos metadados do projeto.
   *
   * E sempre em ingles, independentemente do idioma da aplicacao: os rotulos
   * do Premiere sao *nomes*, e a cor de cada nome vem das Preferencias do
   * utilizador. E por isso que mudar o esquema de cores nas Preferencias muda
   * o aspecto sem mudar o rotulo.
   */
  readonly xmpName: string;
  /** Cor aproximada, so para desenhar o seletor. */
  readonly hex: string;
}

export const PREMIERE_LABELS: readonly PremiereLabel[] = [
  { index: 0, name: 'Violeta', xmpName: 'Violet', hex: '#6f5fc0' },
  { index: 1, name: 'Íris', xmpName: 'Iris', hex: '#2f5f80' },
  { index: 2, name: 'Caribe', xmpName: 'Caribbean', hex: '#2f6b46' },
  { index: 3, name: 'Lavanda', xmpName: 'Lavender', hex: '#8f7fd0' },
  { index: 4, name: 'Cerúleo', xmpName: 'Cerulean', hex: '#2f7f9f' },
  { index: 5, name: 'Verde-floresta', xmpName: 'Forest', hex: '#3f6b2f' },
  { index: 6, name: 'Rosa', xmpName: 'Rose', hex: '#b0405f' },
  { index: 7, name: 'Manga', xmpName: 'Mango', hex: '#b06a20' },
  { index: 8, name: 'Roxo', xmpName: 'Purple', hex: '#8f3fbf' },
  { index: 9, name: 'Azul', xmpName: 'Blue', hex: '#2f5fcf' },
  { index: 10, name: 'Azul-petróleo', xmpName: 'Teal', hex: '#1f6f7f' },
  { index: 11, name: 'Magenta', xmpName: 'Magenta', hex: '#a02f7f' },
  { index: 12, name: 'Ferrugem', xmpName: 'Tan', hex: '#9f7f5f' },
  { index: 13, name: 'Verde', xmpName: 'Green', hex: '#4f9f4f' },
  { index: 14, name: 'Marrom', xmpName: 'Brown', hex: '#7f5f3f' },
  { index: 15, name: 'Amarelo', xmpName: 'Yellow', hex: '#b0b040' },
];

export function labelByIndex(index: number): PremiereLabel | undefined {
  return PREMIERE_LABELS[index];
}

/** chave "packId::Categoria" → índice do rótulo */
export type LabelRules = Readonly<Record<string, number>>;

/**
 * Rótulo aplicável a uma categoria, herdado do ancestral mais próximo.
 *
 * Mesma regra dos destinos de cópia: definir em "SFX" vale para "SFX/Whoosh",
 * e uma definição mais específica sobrepõe-se à do pai.
 */
export function findLabel(
  labels: LabelRules,
  packId: string,
  categoryPath: readonly string[],
): number | undefined {
  // Defensivo: ver nota em rules.findRule.
  if (labels === undefined || labels === null) return undefined;

  for (let depth = categoryPath.length; depth >= 0; depth--) {
    const key = `${packId}::${categoryPath.slice(0, depth).join('/')}`;
    const value = labels[key];
    if (typeof value === 'number' && value >= 0 && value < PREMIERE_LABELS.length) return value;
  }
  return undefined;
}

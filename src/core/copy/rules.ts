/**
 * Regras de destino por categoria.
 *
 * Motivação: um pack traz SFX, VFX, TRILHAS… e o projeto do editor já tem a sua
 * própria organização (`03 SFX`, `04 VFX`…). Sem isto, tudo aterra numa pasta só
 * e a arrumação fica por fazer à mão. Com uma regra por categoria, o asset é
 * copiado já para o sítio certo.
 */

import { isAbsolutePath, joinPath } from '../util/path.js';

/** chave "packId::Categoria/Subcategoria" → pasta destino */
export type CopyRules = Readonly<Record<string, string>>;

/** Subpasta usada quando a categoria não tem regra própria. */
export const DEFAULT_SUBFOLDER = 'My Packs Pro';

export function ruleKey(packId: string, categoryPath: readonly string[]): string {
  return `${packId}::${categoryPath.join('/')}`;
}

/**
 * Regra aplicável a uma categoria, herdada do ancestral mais próximo.
 *
 * Definir a regra em "SFX" passa a valer para "SFX/Whoosh" e "SFX/Impacto" sem
 * as configurar uma a uma; uma regra mais específica sobrepõe-se à do pai.
 */
export function findRule(
  rules: CopyRules,
  packId: string,
  categoryPath: readonly string[],
): string | undefined {
  // Defensivo: definicoes gravadas por versoes antigas podem nao ter o mapa.
  if (rules === undefined || rules === null) return undefined;

  for (let depth = categoryPath.length; depth >= 0; depth--) {
    const value = rules[ruleKey(packId, categoryPath.slice(0, depth))];
    if (value !== undefined && value !== '') return value;
  }
  return undefined;
}

export interface ResolveOptions {
  /** Pasta base: a do projeto, ou a escolhida nas definições. */
  root: string;
  packId: string;
  categoryPath: readonly string[];
  rules: CopyRules;
}

/**
 * Pasta final onde o asset deve ser copiado.
 *
 * Uma regra absoluta (`D:\Bibliotecas\SFX`) é usada tal e qual — serve para
 * quem guarda mídia fora do projeto. Uma regra relativa (`03 SFX`) pendura-se
 * na base, por isso continua a funcionar quando se muda de projeto, que é o
 * caso comum de quem repete a mesma estrutura de pastas.
 */
export function resolveCopyDir({ root, packId, categoryPath, rules }: ResolveOptions): string {
  const rule = findRule(rules, packId, categoryPath);
  if (rule === undefined) return joinPath(root, DEFAULT_SUBFOLDER);
  return isAbsolutePath(rule) ? rule : joinPath(root, rule);
}

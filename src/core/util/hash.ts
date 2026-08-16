/**
 * Hash determinístico e sem dependências (FNV-1a, 32 bits).
 *
 * Serve para dois usos, ambos internos:
 *  - id estável de asset/pack (chave de lista na UI)
 *  - nome de arquivo no cache de previews
 *
 * Não é criptográfico e não precisa ser: colisão aqui só causaria reuso de um
 * preview, e o nome do cache inclui tamanho e mtime além do caminho.
 */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // multiplicação por 16777619 sem estourar 32 bits
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Chave de cache de um arquivo. Inclui tamanho e mtime para que editar o
 * original invalide o preview automaticamente, sem precisar de limpeza manual.
 */
export function cacheKey(absPath: string, sizeBytes: number, mtimeMs: number): string {
  return fnv1a(`${absPath.toLowerCase()}|${sizeBytes}|${Math.floor(mtimeMs)}`);
}

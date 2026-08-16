/**
 * Manipulacao de caminhos sem depender do Node.
 *
 * O nucleo e puro para poder ser testado sem o CEP, mas continua a lidar com
 * caminhos Windows reais — que e onde o plugin corre.
 */

/** `C:\x`, `\\servidor\share` ou `/home/x` sao absolutos; `03 SFX` nao e. */
export function isAbsolutePath(p: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('\\\\') || p.startsWith('/');
}

/** Junta preservando o separador dominante da base. */
export function joinPath(base: string, ...parts: string[]): string {
  const sep = base.includes('\\') && !base.includes('/') ? '\\' : '/';
  const clean = parts
    .flatMap((p) => p.split(/[\\/]+/))
    .filter((p) => p !== '' && p !== '.');
  if (clean.length === 0) return base;
  const trimmed = base.replace(/[\\/]+$/, '');
  return `${trimmed}${sep}${clean.join(sep)}`;
}

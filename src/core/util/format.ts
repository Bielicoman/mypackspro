/**
 * Formata uma duração para a etiqueta da célula.
 *
 * Regras pensadas para packs de edição, onde a esmagadora maioria dos assets
 * dura segundos: `0:03`, `1:23`, e só passa a `1:02:03` acima de uma hora.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '';

  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');

  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

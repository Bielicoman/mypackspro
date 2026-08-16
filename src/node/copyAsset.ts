/**
 * Cópia do asset para junto do projeto.
 *
 * Motivo: os packs vivem em discos externos e drives sincronizadas. Importar o
 * arquivo de onde ele está deixa o projeto dependente desse disco — tirar o SSD
 * transforma tudo em mídia offline. Copiar para a pasta do projeto torna a
 * edição autossuficiente.
 */

import { fsp, path } from './nodeApi.js';

async function sizeOf(p: string): Promise<number | null> {
  try {
    return (await fsp().stat(p)).size;
  } catch {
    return null;
  }
}

/**
 * Copia `src` para dentro de `destDir`, devolvendo o caminho final.
 *
 * `destDir` já vem resolvido por `core/copy/rules` — inclui a regra da categoria
 * ou a subpasta padrão. Esta função não decide organização, só copia.
 *
 * Se já lá existir um arquivo com o mesmo nome **e o mesmo tamanho**, assume-se
 * que é a mesma mídia e reaproveita-se — sem isso, cada importação criaria uma
 * cópia nova e a pasta do projeto crescia sem controlo. Se o tamanho diferir, o
 * nome recebe um sufixo em vez de se destruir o arquivo que já lá estava.
 */
export async function copyAsset(src: string, destDir: string): Promise<string> {
  const p = path();
  const fs = fsp();

  const dir = destDir;
  await fs.mkdir(dir, { recursive: true });

  const ext = p.extname(src);
  const stem = p.basename(src, ext);
  const srcSize = await sizeOf(src);

  let dest = p.join(dir, `${stem}${ext}`);
  for (let n = 2; ; n++) {
    const existing = await sizeOf(dest);
    if (existing === null) break; // livre
    if (srcSize !== null && existing === srcSize) return dest; // já copiado antes
    dest = p.join(dir, `${stem} (${n})${ext}`);
    if (n > 999) throw new Error('Demasiadas cópias com o mesmo nome');
  }

  await fs.copyFile(src, dest);
  return dest;
}

/** Pasta que contém o .prproj — destino natural das cópias. */
export function projectFolderOf(prprojPath: string): string {
  return prprojPath === '' ? '' : path().dirname(prprojPath);
}

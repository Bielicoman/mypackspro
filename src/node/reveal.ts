import { revealCommand } from '../core/platform/platform.js';
import { currentPlatform, fsp, path, spawn } from './nodeApi.js';

async function isFile(absPath: string): Promise<boolean> {
  try {
    return (await fsp().stat(absPath)).isFile();
  } catch {
    return false;
  }
}

/**
 * Lanca um processo e so resolve depois de saber que arrancou.
 *
 * Sem o ouvinte de 'error', uma falha de arranque emite um evento sem tratamento
 * em vez de chegar a quem chamou — e o painel ficava a dizer que correu bem.
 * O gestor de ficheiros devolve codigos de saida arbitrarios mesmo quando abre
 * a janela, por isso o criterio de sucesso e "arrancou", nao "saiu com zero".
 */
function launch(
  cmd: string,
  args: readonly string[],
  verbatim: boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    try {
      // NAO passar windowsHide aqui. Medido: com windowsHide o processo nasce
      // com SW_HIDE e o Explorer obedece — a janela abre escondida e parece que
      // o botao nao faz nada. (0 janelas com hide, 1 sem hide.)
      const proc = spawn()(cmd, args, { windowsVerbatimArguments: verbatim });
      proc.on('error', (err) => {
        if (settled) return;
        settled = true;
        reject(err);
      });
      setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve();
      }, 200);
    } catch (e) {
      reject(e as Error);
    }
  });
}

/** Revela o caminho no gestor de ficheiros: Explorer no Windows, Finder no macOS. */
export async function revealInExplorer(absPath: string): Promise<void> {
  const platform = currentPlatform();
  const file = await isFile(absPath);
  const target = file ? absPath : path().dirname(absPath);

  const cmd = revealCommand(platform, target, file);
  if (cmd === null) {
    throw new Error('Esta plataforma nao tem um gestor de ficheiros suportado');
  }

  await launch(cmd.command, cmd.args, cmd.windowsVerbatimArguments);
}

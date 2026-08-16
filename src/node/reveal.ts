import { fsp, path, spawn } from './nodeApi.js';

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
 * O Explorer devolve codigos de saida arbitrarios mesmo quando abre a janela,
 * por isso o criterio de sucesso e "arrancou", nao "saiu com zero".
 */
function launch(cmd: string, args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    try {
      const proc = spawn()(cmd, args, {
        // NAO passar windowsHide aqui. Medido: com windowsHide o processo nasce
        // com SW_HIDE e o Explorer obedece — a janela abre escondida e parece
        // que o botao nao faz nada. (0 janelas com hide, 1 sem hide.)
        // Para o ffmpeg continua a fazer sentido, porque ai queremos mesmo
        // esconder a consola.
        //
        // O Explorer faz o seu proprio parsing de /select, e o Node volta a citar
        // os argumentos por cima — o que parte caminhos com espacos. O verbatim
        // desliga essa segunda citacao e deixa-nos citar como ele espera.
        windowsVerbatimArguments: true,
      });
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

/** Abre o Explorer com o arquivo selecionado; se ele sumiu, abre a pasta. */
export async function revealInExplorer(absPath: string): Promise<void> {
  const target = absPath.replace(/\//g, '\\');
  if (await isFile(absPath)) {
    await launch('explorer.exe', ['/select,"' + target + '"']);
    return;
  }
  const folder = path().dirname(target);
  await launch('explorer.exe', ['"' + folder + '"']);
}

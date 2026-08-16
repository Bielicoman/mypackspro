/**
 * Decisões que dependem do sistema operativo.
 *
 * Puras de propósito. O plugin é desenvolvido em Windows e não há como executar
 * o caminho macOS aqui — mantendo estas funções sem efeitos colaterais, o
 * comportamento no Mac fica coberto por testes em vez de ficar por verificar.
 *
 * Quem as usa (`nodeApi`, `ffmpeg`, `reveal`) limita-se a passar
 * `process.platform` e a agir sobre o resultado.
 */

export type Platform = 'win' | 'mac' | 'other';

/** Traduz `process.platform` do Node para as três famílias que interessam. */
export function detectPlatform(nodePlatform: string): Platform {
  if (nodePlatform === 'win32') return 'win';
  if (nodePlatform === 'darwin') return 'mac';
  return 'other';
}

/** Executáveis só levam `.exe` no Windows. */
export function executableName(base: string, platform: Platform): string {
  return platform === 'win' ? `${base}.exe` : base;
}

/**
 * Subpasta dos binários embutidos, dentro da extensão.
 *
 * Separadas por plataforma porque o pacote de uma nunca serve à outra: no
 * Windows são `.exe` com DLLs ao lado; no macOS, Mach-O.
 */
export function bundledBinSubdir(platform: Platform): string | null {
  if (platform === 'win') return 'bin/win';
  if (platform === 'mac') return 'bin/mac';
  return null;
}

/** Separador de itens da variável PATH. */
export function pathListSeparator(platform: Platform): string {
  return platform === 'win' ? ';' : ':';
}

export interface RevealCommand {
  readonly command: string;
  readonly args: readonly string[];
  /**
   * Só o Windows precisa de desligar a segunda citação do Node: o Explorer faz
   * o seu próprio parsing de `/select,` e argumentos re-citados chegam partidos.
   */
  readonly windowsVerbatimArguments: boolean;
}

/**
 * Comando que revela um caminho no gestor de ficheiros.
 *
 * Windows: `explorer.exe /select,"caminho"` — as aspas fazem parte do argumento.
 * macOS:   `open -R caminho` para selecionar o ficheiro, `open caminho` para
 *          abrir a pasta. O `open` aceita o caminho como argumento normal, por
 *          isso aqui não se cita nada à mão.
 */
export function revealCommand(
  platform: Platform,
  absPath: string,
  isFile: boolean,
): RevealCommand | null {
  if (platform === 'win') {
    const target = absPath.replace(/\//g, '\\');
    return {
      command: 'explorer.exe',
      args: isFile ? [`/select,"${target}"`] : [`"${target}"`],
      windowsVerbatimArguments: true,
    };
  }

  if (platform === 'mac') {
    return {
      command: 'open',
      args: isFile ? ['-R', absPath] : [absPath],
      windowsVerbatimArguments: false,
    };
  }

  return null;
}

/**
 * Raiz onde a aplicação guarda dados do utilizador.
 *
 * Windows usa `%APPDATA%`; o macOS convenciona
 * `~/Library/Application Support`. Devolver a raiz (e não a pasta final)
 * mantém o nome do produto num sítio só, em `nodeApi`.
 */
export function appDataRoot(
  platform: Platform,
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  if (platform === 'win') return env['APPDATA'] ?? null;

  const home = env['HOME'];
  if (home === undefined || home === '') return null;
  if (platform === 'mac') return `${home}/Library/Application Support`;
  return `${home}/.config`;
}

/** Pasta de extensões CEP do utilizador — usada pelos instaladores. */
export function cepExtensionsDir(
  platform: Platform,
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const root = appDataRoot(platform, env);
  if (root === null) return null;
  return platform === 'win' ? `${root}\\Adobe\\CEP\\extensions` : `${root}/Adobe/CEP/extensions`;
}

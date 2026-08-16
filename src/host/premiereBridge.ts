/**
 * Ponte painel → ExtendScript.
 *
 * O `evalScript` do CEP é assíncrono por callback e sem tipos; aqui fica
 * embrulhado em Promises e com o resultado já interpretado, para o resto do
 * painel nunca ver strings soltas.
 */

interface CepApi {
  evalScript(script: string, cb: (result: string) => void): void;
}

function cep(): CepApi | undefined {
  return (window as unknown as { __adobe_cep__?: CepApi }).__adobe_cep__;
}

/** Escapa uma string para caber num literal ExtendScript entre aspas. */
function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]/g, ' ');
}

function evalScript(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const api = cep();
    if (api === undefined) {
      reject(new Error('Fora do Premiere: ExtendScript indisponível'));
      return;
    }
    api.evalScript(code, (result) => {
      if (result === 'EvalScript error.') {
        reject(new Error('O script do host falhou ao ser avaliado'));
        return;
      }
      resolve(result ?? '');
    });
  });
}

/** Converte a resposta "chave=valor" em mapa. */
function parse(result: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of result.split('\n')) {
    const at = line.indexOf('=');
    if (at > 0) out[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return out;
}

function unwrap(result: string): Record<string, string> {
  const map = parse(result);
  const err = map['error'];
  if (err !== undefined && err !== '') throw new Error(err);
  return map;
}

export interface HostStatus {
  projectName: string;
  /** Caminho completo do .prproj. Vazio se o projeto nunca foi gravado. */
  projectPath: string;
  sequenceName: string;
  videoTracks: number;
  audioTracks: number;
}

export async function hostStatus(): Promise<HostStatus | null> {
  try {
    const map = unwrap(await evalScript('apStatus()'));
    return {
      projectName: map['project'] ?? '',
      projectPath: map['projectPath'] ?? '',
      sequenceName: map['sequence'] ?? '',
      videoTracks: Number(map['videoTracks'] ?? 0),
      audioTracks: Number(map['audioTracks'] ?? 0),
    };
  } catch {
    return null;
  }
}

/** Importa para o painel Projeto, sem tocar na timeline. */
export async function importToProject(paths: readonly string[]): Promise<number> {
  if (paths.length === 0) return 0;
  const map = unwrap(await evalScript(`apImport("${esc(paths.join('|'))}")`));
  return Number(map['imported'] ?? 0);
}

/**
 * Importa e coloca no playhead da sequência ativa.
 *
 * É este o caminho para pôr um asset na timeline: o arrasto nativo do CEP só
 * consegue chegar ao painel Projeto.
 */
export async function insertAtPlayhead(
  paths: readonly string[],
  kind: 'video' | 'audio',
): Promise<number> {
  if (paths.length === 0) return 0;
  const map = unwrap(
    await evalScript(`apInsertAtPlayhead("${esc(paths.join('|'))}", "${kind}")`),
  );
  return Number(map['placed'] ?? 0);
}

/**
 * Coloca no playhead **sem sobrescrever nada**: procura a primeira faixa livre
 * no intervalo que o clipe ocuparia. Usado pelo arrasto, onde não se sabe se o
 * utilizador queria mesmo largar ali.
 */
export async function dropAtPlayhead(
  paths: readonly string[],
  kind: 'video' | 'audio',
): Promise<number> {
  if (paths.length === 0) return 0;
  const map = unwrap(await evalScript(`apDropAtPlayhead("${esc(paths.join('|'))}", "${kind}")`));
  return Number(map['placed'] ?? 0);
}

/**
 * Faz o projeto apontar para a cópia local em vez do original.
 * Usado depois de copiar o asset para junto do projeto.
 */
export async function adoptCopy(originalPath: string, copyPath: string): Promise<string> {
  const map = unwrap(
    await evalScript(`apAdoptCopy("${esc(originalPath)}", "${esc(copyPath)}")`),
  );
  return map['adopted'] ?? '';
}

/**
 * Aplica o rótulo de cor do Premiere ao item importado.
 * Devolve o nome da via que funcionou, para diagnóstico.
 */
export async function setLabel(
  absPath: string,
  labelIndex: number,
  labelName: string,
): Promise<string> {
  const map = unwrap(
    await evalScript(`apSetLabel("${esc(absPath)}", ${labelIndex}, "${esc(labelName)}")`),
  );
  return map['verified'] ?? map['label'] ?? '';
}

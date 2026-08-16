import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Asset, PreviewState } from '../../core/model/types.js';
import { PreviewQueue } from '../../core/preview/queue.js';
import { isNodeAvailable } from '../../node/nodeApi.js';
import { findTools, type FfmpegTools } from '../../node/ffmpeg.js';
import { canPreview, ensurePreview, type Preview } from '../../node/previewCache.js';
import { ensureAudioMeta } from '../audioPeaks.js';

/** Acima disto o trabalho entra na pista estreita. */
const HEAVY_BYTES = 80 * 1024 * 1024;

export interface PreviewEntry {
  state: PreviewState;
  preview?: Preview;
  /** Picos da waveform, 0–1. Só para áudio. */
  peaks?: number[];
  /** Motivo da falha, mostrado na dica da célula em vez de ficar mudo. */
  error?: string;
}

export interface PreviewsApi {
  get: (assetId: string) => PreviewEntry | undefined;
  /**
   * Liga uma célula ao observador de visibilidade. `null` desliga.
   *
   * `onNear` é chamado quando a célula entra ou sai das imediações do ecrã.
   * A célula usa isso para montar e desmontar o `<video>`: manter milhares de
   * elementos de vídeo com `src` atribuído consome memória sem limite e é o
   * que faz o painel engasgar em máquinas modestas.
   */
  register: (el: Element | null, asset: Asset, onNear?: (near: boolean) => void) => void;
  remaining: number;
  stop: () => void;
  /** false quando não há ffmpeg — a UI avisa em vez de falhar em silêncio. */
  toolsReady: boolean;
}

/** Pasta da extensão, para achar o ffmpeg embarcado em bin/win. */
function extensionDir(): string {
  const cep = (window as unknown as { __adobe_cep__?: { getSystemPath?: (k: string) => string } })
    .__adobe_cep__;
  try {
    return cep?.getSystemPath?.('extension') ?? '';
  } catch {
    return '';
  }
}

function cpuCount(): number {
  try {
    const req = (window as unknown as { require?: (id: string) => { cpus(): unknown[] } }).require;
    return req?.('os').cpus().length ?? 4;
  } catch {
    return 4;
  }
}

/**
 * Geração de previews conduzida pela viewport.
 *
 * Com packs de milhares de arquivos, gerar tudo à entrada custaria horas de CPU
 * para previews que ninguém vai ver. Aqui só se gera o que entra no ecrã — e
 * como o resultado fica em cache no disco, cada asset só é processado uma vez
 * na vida.
 */
export function usePreviews(): PreviewsApi {
  const [, setTick] = useState(0);
  const entries = useRef(new Map<string, PreviewEntry>());
  /**
   * Entradas "só estado" reaproveitadas por (id, estado).
   *
   * Devolver um objeto novo a cada leitura anulava o `memo` das células: o
   * `entry` chegava sempre diferente e milhares de células voltavam a
   * renderizar sem nada ter mudado.
   */
  const shells = useRef(new Map<string, PreviewEntry>());
  const frame = useRef(0);
  const [toolsReady, setToolsReady] = useState(false);
  const toolsRef = useRef<FfmpegTools | null>(null);
  const toolsReadyRef = useRef(false);

  // Metade dos núcleos: o Premiere precisa de CPU para reproduzir a timeline.
  const concurrency = useMemo(() => Math.max(1, Math.min(6, Math.floor(cpuCount() / 2))), []);

  useEffect(() => {
    if (!isNodeAvailable()) return;
    const found = findTools(extensionDir());
    toolsRef.current = found;
    toolsReadyRef.current = found !== null;
    setToolsReady(found !== null);
  }, []);

  /**
   * Produz o preview de um asset e guarda o resultado.
   *
   * Separado da fila para a fila continuar a tratar apenas de escalonamento.
   */
  const generateFor = useCallback(async (id: string, asset: Asset): Promise<void> => {
    // Áudio não passa pelo ffmpeg: o CEF decodifica nativamente, e a Web Audio
    // API dá amostras e duração numa só passagem. Guardamos picos em vez de uma
    // imagem para poder desenhar a parte tocada e a agulha.
    if (asset.format.family === 'audio') {
      const meta = await ensureAudioMeta(asset);
      entries.current.set(id, {
        state: 'ready',
        peaks: meta.peaks,
        preview: { url: '', kind: 'image', durationSec: meta.durationSec },
      });
      return;
    }

    const tools = toolsRef.current;
    if (tools === null) throw new Error('ffmpeg indisponível');

    const preview = await ensurePreview(tools, asset);
    entries.current.set(id, { state: 'ready', preview });
  }, []);

  const queue = useMemo(
    () =>
      new PreviewQueue<Asset>({
        concurrency,
        // Ficheiros grandes vivem quase sempre em drives sincronizadas ou discos
        // externos, onde o gargalo é a leitura e não a CPU. Duas pistas chegam.
        heavyConcurrency: 2,
        isHeavy: (asset) => asset.sizeBytes > HEAVY_BYTES,
        onChange: () => {
          /*
           * Um pedido gera várias transições seguidas (em espera → a gerar →
           * pronto), e cada uma re-renderizava o painel inteiro. Agrupar por
           * quadro faz uma rajada de mudanças custar um único render.
           */
          if (frame.current !== 0) return;
          frame.current = window.requestAnimationFrame(() => {
            frame.current = 0;
            setTick((n) => n + 1);
          });
        },
        run: async (id, asset) => {
          try {
            await generateFor(id, asset);
          } catch (e) {
            // Guardar a razão antes de relançar: a fila só sabe "falhou", e uma
            // célula sem explicação obriga a adivinhar o que correu mal.
            entries.current.set(id, { state: 'failed', error: (e as Error).message });
            throw e;
          }
        },
      }),
    [concurrency, generateFor],
  );

  /* Um único observador para toda a grade — milhares de alvos num só observer
     custa muito menos que um observer por célula. */
  interface Target {
    asset: Asset;
    onNear?: ((near: boolean) => void) | undefined;
  }
  const targets = useRef(new Map<Element, Target>());
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          const target = targets.current.get(r.target);
          if (target === undefined) continue;

          target.onNear?.(r.isIntersecting);
          if (!r.isIntersecting) continue;

          const asset = target.asset;
          const isAudio = asset.format.family === 'audio';
          if (!isAudio && !canPreview(asset.format.strategy)) continue;
          // Só o áudio dispensa ffmpeg; o resto sem ferramentas nem entra na fila.
          if (!isAudio && !toolsReadyRef.current) continue;
          queue.request(asset.id, asset);
        }
      },
      // Começa a gerar um pouco antes de entrar no ecrã, para o preview já
      // estar pronto quando o utilizador chega lá.
      { rootMargin: '300px 0px', threshold: 0.01 },
    );
    observer.current = obs;
    return () => {
      obs.disconnect();
      observer.current = null;
      targets.current.clear();
      if (frame.current !== 0) {
        window.cancelAnimationFrame(frame.current);
        frame.current = 0;
      }
    };
  }, [queue]);

  const register = useCallback(
    (el: Element | null, asset: Asset, onNear?: (near: boolean) => void) => {
      const obs = observer.current;
      if (obs === null || el === null) return;
      targets.current.set(el, { asset, onNear });
      obs.observe(el);
    },
    [],
  );

  const get = useCallback(
    (assetId: string): PreviewEntry | undefined => {
      const stored = entries.current.get(assetId);
      if (stored !== undefined) return stored;

      const state = queue.getState(assetId);
      if (state === undefined) return undefined;

      const cached = shells.current.get(assetId);
      if (cached !== undefined && cached.state === state) return cached;

      const shell: PreviewEntry = { state };
      shells.current.set(assetId, shell);
      return shell;
    },
    [queue],
  );

  const stop = useCallback(() => queue.stop(), [queue]);

  return { get, register, remaining: queue.remaining, stop, toolsReady };
}

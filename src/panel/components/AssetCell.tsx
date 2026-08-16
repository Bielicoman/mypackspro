import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { Asset } from '../../core/model/types.js';
import { formatDuration } from '../../core/util/format.js';
import { resamplePeaks } from '../../core/preview/peaks.js';
import type { PreviewEntry } from '../hooks/usePreviews.js';
import { FamilyIcon, IconStar } from './Icon.js';

interface Props {
  asset: Asset;
  /** Duplo-clique: importa e insere no playhead. */
  onInsert: (asset: Asset) => void;
  /** Fim do arrasto — o App decide se largou fora do painel. */
  onDragFinished: (asset: Asset) => void;
  onOpenMenu: (asset: Asset, x: number, y: number) => void;
  entry: PreviewEntry | undefined;
  favorite: boolean;
  /** Falso quando o painel está oculto — para toda a reprodução. */
  active: boolean;
  onToggleFavorite: (id: string) => void;
  register: (el: Element | null, asset: Asset, onNear?: (near: boolean) => void) => void;
}

const STATE_LABEL: Record<string, string> = {
  waiting: 'Na fila…',
  generating: 'Gerando preview…',
  canceled: 'Cancelado',
};

/** URL file:// do original — usado para tocar áudio no hover, sem proxy. */
function originalUrl(absPath: string): string {
  const norm = absPath.replace(/\\/g, '/');
  return `file://${encodeURI(norm.startsWith('/') ? norm : `/${norm}`)}`;
}

/** Barras da waveform, no estilo do BadFX: discretas, espelhadas no centro. */
const WAVE_BARS = 56;
/**
 * Altura mínima de cada barra. É o que transforma o silêncio numa linha
 * pontilhada em vez de um vazio — o detalhe que dá a leitura do BadFX.
 */
const WAVE_MIN = 1.4;

function Waveform({ peaks, progress }: { peaks: readonly number[]; progress: number }) {
  const bars = resamplePeaks(peaks, WAVE_BARS);
  const step = 100 / WAVE_BARS;
  const width = step * 0.5;

  return (
    <svg className="wave__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {bars.map((peak, i) => {
        const half = Math.max(WAVE_MIN, peak * 45);
        const played = progress > 0 && i / WAVE_BARS < progress;
        return (
          <rect
            key={i}
            x={i * step + (step - width) / 2}
            y={50 - half}
            width={width}
            height={half * 2}
            rx={width / 2}
            fill={played ? '#f0f0f0' : '#7f7f7f'}
          />
        );
      })}
    </svg>
  );
}

function AssetCellBase({
  asset,
  entry,
  favorite,
  active,
  onInsert,
  onDragFinished,
  onOpenMenu,
  onToggleFavorite,
  register,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hover, setHover] = useState(false);
  /** Posição de reprodução do áudio, 0..1. Só muda enquanto o rato está em cima. */
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  /**
   * A célula está à vista (ou perto)?
   *
   * Enquanto não estiver, o `<video>` nem chega a existir. Sem isto, percorrer
   * um pack grande deixava para trás milhares de elementos de vídeo com `src`
   * atribuído, cada um a segurar buffers — a causa principal de o painel ficar
   * lento em máquinas modestas.
   */
  const [near, setNear] = useState(false);

  const draggable = asset.format.importable;
  const isAudio = asset.format.family === 'audio';
  const state = entry?.state;
  const preview = entry?.preview;
  const peaks = entry?.peaks;
  const failure = entry?.error;
  const duration = preview?.durationSec;

  useEffect(() => {
    register(rootRef.current, asset, setNear);
  }, [register, asset]);

  /*
   * Reprodução automática: só com o painel visível e com o play ligado.
   * O hover é uma acção explícita do utilizador, por isso toca à mesma quando
   * a reprodução automática está pausada — é para isso que serve o botão.
   */
  useEffect(() => {
    const v = videoRef.current;
    if (v === null) return;
    if (active || hover) void v.play().catch(() => undefined);
    else v.pause();
  }, [active, hover, preview]);

  /* Áudio toca o arquivo original: a Fase 0 mediu que MP3, AAC, Opus e FLAC
     tocam nativamente no CEF, por isso não é preciso gerar proxy de áudio. */
  const startAudio = useCallback(() => {
    // Sem verificar `active`: o hover só acontece com o painel à vista, e deve
    // tocar mesmo com a reprodução automática pausada.
    if (!isAudio) return;

    let el = audioRef.current;
    if (el === null) {
      el = new Audio(originalUrl(asset.absPath));
      el.loop = true;
      // Alimenta a linha de progresso sobre a waveform.
      el.addEventListener('timeupdate', () => {
        const total = el?.duration ?? 0;
        const now = el?.currentTime ?? 0;
        setElapsed(now);
        setProgress(total > 0 ? now / total : 0);
      });
      audioRef.current = el;
    }
    void el.play().catch(() => undefined);
  }, [asset, isAudio]);

  const stopAudio = useCallback(() => {
    const el = audioRef.current;
    if (el !== null) {
      el.pause();
      el.currentTime = 0;
    }
    setProgress(0);
    setElapsed(0);
  }, []);

  /* Ao desmontar, largar o elemento de áudio por completo: pausar não liberta
     o arquivo nem os buffers, e eles acumulavam-se ao navegar pelo pack. */
  useEffect(
    () => () => {
      const el = audioRef.current;
      if (el !== null) {
        el.pause();
        el.src = '';
        audioRef.current = null;
      }
    },
    [],
  );

  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggable) {
      e.preventDefault();
      return;
    }
    // O gesto central: o Premiere recebe o caminho absoluto do arquivo original.
    e.dataTransfer.setData('com.adobe.cep.dnd.file.0', asset.absPath);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onEnter = () => {
    setHover(true);
    startAudio();
    const v = videoRef.current;
    if (v !== null) {
      v.muted = false;
      void v.play().catch(() => undefined);
    }
  };

  const onLeave = () => {
    setHover(false);
    stopAudio();
    const v = videoRef.current;
    if (v !== null) {
      v.muted = true;
      if (!active) v.pause();
    }
  };

  /* A etiqueta mostra o tempo decorrido enquanto o áudio toca, e a duração
     total no resto do tempo — que é a informação útil ao escolher um asset. */
  const timeLabel =
    isAudio && hover && elapsed > 0
      ? formatDuration(elapsed)
      : duration !== undefined
        ? formatDuration(duration)
        : '';

  const badge = [timeLabel, asset.ext.toUpperCase()].filter(Boolean).join(' · ');

  return (
    <div
      ref={rootRef}
      className={`cell${draggable ? '' : ' cell--locked'}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={() => onDragFinished(asset)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onDoubleClick={() => onInsert(asset)}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu(asset, e.clientX, e.clientY);
      }}
      title={[
        asset.absPath,
        failure === undefined ? null : `Preview falhou: ${failure}`,
        draggable
          ? 'Duplo-clique: inserir no playhead\nArrastar: importar para o Projeto'
          : 'O Premiere nao importa este tipo de arquivo',
      ]
        .filter((part): part is string => part !== null)
        .join('\n\n')}
    >
      <div className="cell__thumb">
        {isAudio && peaks !== undefined ? (
          <div className="wave">
            <Waveform peaks={peaks} progress={progress} />
            {hover && progress > 0 ? (
              <>
                <span className="wave__cursor" style={{ left: `${progress * 100}%` }} />
                <span
                  className="wave__time"
                  style={{ left: `${progress * 100}%` }}
                >
                  {formatDuration(elapsed)}
                </span>
              </>
            ) : null}
          </div>
        ) : preview !== undefined && preview.kind === 'video' ? (
          near ? (
            <video
              ref={videoRef}
              src={preview.url}
              muted
              loop
              playsInline
              autoPlay={active}
              preload="metadata"
            />
          ) : (
            <span className="cell__idle" />
          )
        ) : preview !== undefined && preview.url !== '' ? (
          <img src={preview.url} alt="" loading="lazy" />
        ) : state !== undefined && state !== 'failed' ? (
          <span className="cell__state">{STATE_LABEL[state] ?? ''}</span>
        ) : (
          <span style={{ opacity: 0.5 }}>
            <FamilyIcon family={asset.format.family} size={30} />
          </span>
        )}

        {(preview !== undefined || peaks !== undefined) && badge !== '' ? (
          <span className="cell__badge">{badge}</span>
        ) : null}
      </div>

      <div className="cell__foot">
        <span className="cell__type">
          <FamilyIcon family={asset.format.family} />
        </span>
        <span className="cell__name">{asset.name}</span>
        <button
          className={`cell__star${favorite ? ' cell__star--on' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(asset.id);
          }}
          title="Favorito"
        >
          <IconStar filled={favorite} />
        </button>
      </div>
    </div>
  );
}

export const AssetCell = memo(AssetCellBase);

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
  const thumbRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hover, setHover] = useState(false);
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  /** Posição de reprodução do áudio, 0..1. */
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
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
   * Reprodução automática / hover: só com o painel visível.
   * Quando não está em scrubbing manual, o vídeo toca normalmente.
   */
  useEffect(() => {
    const v = videoRef.current;
    if (v === null) return;
    if (isScrubbing) {
      v.pause();
    } else if (active || hover) {
      void v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, [active, hover, isScrubbing, preview]);

  /* Áudio toca o arquivo original com suporte a seek em tempo real */
  const startAudio = useCallback(() => {
    if (!isAudio) return;

    let el = audioRef.current;
    if (el === null) {
      el = new Audio(originalUrl(asset.absPath));
      el.loop = true;
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

  /* Ao desmontar, largar o elemento de áudio */
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
    setIsScrubbing(false);
    setScrubRatio(null);
    stopAudio();
    const v = videoRef.current;
    if (v !== null) {
      v.muted = true;
      if (!active) v.pause();
      else void v.play().catch(() => undefined);
    }
  };

  /**
   * Hover Scrub / Skimming estilo Final Cut Pro e Adobe Premiere Pro.
   * Ao mover o mouse sobre o thumbnail (0% da esquerda a 100% da direita),
   * busca imediatamente o frame do vídeo ou posição do áudio com agulha visual.
   */
  const onMouseMoveThumb = (e: React.MouseEvent<HTMLDivElement>) => {
    const thumb = thumbRef.current;
    if (!thumb) return;
    const rect = thumb.getBoundingClientRect();
    if (rect.width <= 0) return;

    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setScrubRatio(ratio);
    setIsScrubbing(true);

    if (preview !== undefined && preview.kind === 'video' && videoRef.current) {
      const v = videoRef.current;
      const dur = (v.duration && !isNaN(v.duration) && isFinite(v.duration) && v.duration > 0)
        ? v.duration
        : (duration && duration > 0 ? duration : 0);
      if (dur > 0) {
        const targetTime = ratio * dur;
        v.currentTime = targetTime;
        setElapsed(targetTime);
      }
    } else if (isAudio && audioRef.current) {
      const a = audioRef.current;
      const dur = (a.duration && !isNaN(a.duration) && isFinite(a.duration) && a.duration > 0)
        ? a.duration
        : (duration && duration > 0 ? duration : 0);
      if (dur > 0) {
        const targetTime = ratio * dur;
        a.currentTime = targetTime;
        setElapsed(targetTime);
        setProgress(ratio);
      }
    }
  };

  const timeLabel =
    (isAudio || (preview !== undefined && preview.kind === 'video')) && hover && elapsed > 0
      ? formatDuration(elapsed)
      : duration !== undefined
        ? formatDuration(duration)
        : '';

  const badge = [timeLabel, asset.ext.toUpperCase()].filter(Boolean).join(' · ');

  const currentScrubTime =
    scrubRatio !== null
      ? formatDuration(elapsed || (scrubRatio * (duration || 0)))
      : '';

  const showVideoSkimmer = hover && preview !== undefined && preview.kind === 'video';

  return (
    <div
      ref={rootRef}
      className={`cell${draggable ? '' : ' cell--locked'}${hover ? ' cell--hover' : ''}`}
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
          ? 'Duplo-clique: inserir no playhead\nArrastar: importar para o Projeto\nPasse o mouse: navegar na timeline do asset'
          : 'O Premiere nao importa este tipo de arquivo',
      ]
        .filter((part): part is string => part !== null)
        .join('\n\n')}
    >
      <div
        ref={thumbRef}
        className="cell__thumb"
        onMouseMove={onMouseMoveThumb}
      >
        {isAudio && peaks !== undefined ? (
          <div className="wave">
            <Waveform peaks={peaks} progress={scrubRatio ?? progress} />
            {hover && (scrubRatio !== null || progress > 0) ? (
              <>
                <span
                  className="wave__cursor"
                  style={{ left: `${((scrubRatio ?? progress) * 100)}%` }}
                />
                <span
                  className="wave__time"
                  style={{
                    left: `${Math.min(88, Math.max(12, (scrubRatio ?? progress) * 100))}%`,
                  }}
                >
                  {currentScrubTime || formatDuration(elapsed)}
                </span>
              </>
            ) : null}
          </div>
        ) : preview !== undefined && preview.kind === 'video' ? (
          near ? (
            <>
              <video
                ref={videoRef}
                src={preview.url}
                muted
                loop
                playsInline
                autoPlay={active}
                preload="metadata"
              />
              {showVideoSkimmer ? (
                <div className="cell__skimmer" aria-hidden="true">
                  <div className="cell__skimmer-track">
                    <div
                      className="cell__skimmer-progress"
                      style={{
                        width: `${((scrubRatio ?? (videoRef.current?.currentTime && duration ? videoRef.current.currentTime / duration : 0)) * 100)}%`,
                      }}
                    />
                    <div
                      className="cell__skimmer-needle"
                      style={{ left: `${((scrubRatio ?? 0) * 100)}%` }}
                    />
                  </div>
                  {scrubRatio !== null && (
                    <span
                      className="cell__skimmer-tooltip"
                      style={{
                        left: `${Math.min(88, Math.max(12, scrubRatio * 100))}%`,
                      }}
                    >
                      {currentScrubTime}
                    </span>
                  )}
                </div>
              ) : null}
            </>
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

        {(preview !== undefined || peaks !== undefined) && badge !== '' && !showVideoSkimmer ? (
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

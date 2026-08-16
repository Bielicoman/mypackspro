import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PREMIERE_LABELS } from '../../core/copy/labels.js';

export type MenuEntry =
  | { kind: 'header'; label: string }
  | { kind: 'separator' }
  /** Fila de rótulos do Premiere. `undefined` limpa o rótulo. */
  | {
      kind: 'swatches';
      value: number | undefined;
      onPick: (index: number | undefined) => void;
    }
  | {
      kind?: 'item';
      label: string;
      onSelect: () => void;
      /** Mostra a marca de selecionado, como nos menus do Windows. */
      checked?: boolean;
      /** Contagem a direita, para "Videos 124". */
      badge?: string;
      danger?: boolean;
    };

export interface MenuState {
  x: number;
  y: number;
  items: MenuEntry[];
}

interface Props {
  state: MenuState;
  onClose: () => void;
}

export function ContextMenu({ state, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: state.x, y: state.y });

  /* Reposiciona antes de pintar, para o menu nao sair do painel — que pode
     estar bem estreito — nem piscar na posicao errada. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.max(4, Math.min(state.x, window.innerWidth - r.width - 4)),
      y: Math.max(4, Math.min(state.y, window.innerHeight - r.height - 4)),
    });
  }, [state.x, state.y, state.items]);

  useEffect(() => {
    /**
     * Fechar ao clicar fora — mas **nunca** quando o clique e no proprio menu.
     *
     * O ouvinte corre em fase de captura, logo dispara antes de o React
     * processar o clique do botao. Sem esta verificacao, o menu desmontava-se
     * primeiro e o item nunca chegava a ser accionado: era esse o motivo de
     * "Remover pack" nao fazer nada.
     */
    const close = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node) === true) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onBlur = (): void => onClose();

    window.addEventListener('mousedown', close, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="ctxmenu" style={{ left: pos.x, top: pos.y }}>
      {state.items.map((entry, i) => {
        if (entry.kind === 'separator') {
          return <div key={`sep${i}`} className="ctxmenu__sep" />;
        }
        if (entry.kind === 'swatches') {
          return (
            <div key={`sw${i}`} className="swatches">
              <button
                className={`swatch swatch--none${entry.value === undefined ? ' swatch--on' : ''}`}
                title="Sem rótulo"
                onClick={() => {
                  entry.onPick(undefined);
                  onClose();
                }}
              />
              {PREMIERE_LABELS.map((l) => (
                <button
                  key={l.index}
                  className={`swatch${entry.value === l.index ? ' swatch--on' : ''}`}
                  style={{ background: l.hex }}
                  title={l.name}
                  onClick={() => {
                    entry.onPick(l.index);
                    onClose();
                  }}
                />
              ))}
              <span className="swatches__name">
                {entry.value === undefined
                  ? 'Sem rótulo'
                  : (PREMIERE_LABELS[entry.value]?.name ?? '')}
              </span>
            </div>
          );
        }
        if (entry.kind === 'header') {
          return (
            <div key={`h${entry.label}`} className="ctxmenu__header">
              {entry.label}
            </div>
          );
        }
        return (
          <button
            key={entry.label}
            className={`ctxmenu__item${entry.danger === true ? ' ctxmenu__item--danger' : ''}`}
            onClick={() => {
              entry.onSelect();
              onClose();
            }}
          >
            <span className="ctxmenu__tick">{entry.checked === true ? '•' : ''}</span>
            <span className="ctxmenu__label">{entry.label}</span>
            {entry.badge !== undefined ? (
              <span className="ctxmenu__badge">{entry.badge}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

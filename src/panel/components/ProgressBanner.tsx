interface Props {
  label: string;
  detail: string;
  /** Quando presente, mostra o botão de interromper. */
  onStop?: () => void;
}

/**
 * Faixa de estado no topo do painel.
 *
 * Serve a varredura de pastas e, na Fase 3, a fila de geração de previews.
 * Só aparece enquanto há trabalho — o painel volta ao normal sozinho.
 */
export function ProgressBanner({ label, detail, onStop }: Props) {
  return (
    <div className="progress">
      <span className="progress__title">{label}</span>
      <span className="progress__count">{detail}</span>
      {onStop !== undefined ? (
        <button className="progress__stop" onClick={onStop}>
          Parar
        </button>
      ) : null}
    </div>
  );
}

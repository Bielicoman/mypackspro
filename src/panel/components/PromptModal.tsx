import { useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  hint: string;
  initial: string;
  placeholder: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  /** Botão extra para escolher uma pasta absoluta pelo diálogo do sistema. */
  onBrowse?: () => Promise<string | null>;
}

/** Caixa de entrada de texto — usada para definir o destino de uma categoria. */
export function PromptModal({
  title,
  hint,
  initial,
  placeholder,
  onConfirm,
  onCancel,
  onBrowse,
}: Props) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="modal" onClick={onCancel}>
      <div className="modal__box" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <span>{title}</span>
          <button className="modal__x" onClick={onCancel} title="Fechar">
            ×
          </button>
        </div>

        <div className="modal__body">
          <p className="setting__hint" style={{ margin: '2px 0 10px' }}>
            {hint}
          </p>
          <div className="prompt__row">
            <input
              ref={inputRef}
              className="prompt__input"
              value={value}
              placeholder={placeholder}
              spellCheck={false}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm(value.trim());
                if (e.key === 'Escape') onCancel();
              }}
            />
            {onBrowse !== undefined ? (
              <button
                className="btn"
                onClick={() => {
                  void onBrowse().then((dir) => {
                    if (dir !== null) setValue(dir);
                  });
                }}
              >
                Procurar…
              </button>
            ) : null}
          </div>
        </div>

        <div className="modal__foot" style={{ display: 'flex', gap: 8 }}>
          <span className="modal__note" style={{ flex: '1 1 auto' }}>
            Vazio remove a regra.
          </span>
          <button className="btn" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={() => onConfirm(value.trim())}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

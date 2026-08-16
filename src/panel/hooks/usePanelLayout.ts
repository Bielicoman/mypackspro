import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Estado persistido em localStorage.
 *
 * O painel do Premiere é recriado a cada reabertura e a cada reload do CEP;
 * sem isto o utilizador perderia largura da barra lateral e tamanho da grade
 * a toda a hora.
 */
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function usePersistentState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;

      const stored = JSON.parse(raw) as T;

      /*
       * Objetos gravados por versões anteriores não têm os campos novos.
       * Devolvê-los tal e qual deixava, por exemplo, `settings.copyLabels`
       * indefinido — e a primeira leitura rebentava o render inteiro, deixando
       * o painel em branco. Completar com os valores por omissão torna cada
       * campo novo compatível com o que já estava guardado.
       */
      if (isPlainObject(stored) && isPlainObject(initial)) {
        return { ...initial, ...stored } as T;
      }
      return stored;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        window.localStorage.setItem(key, JSON.stringify(v));
      } catch {
        /* quota cheia ou storage bloqueado: o painel continua a funcionar */
      }
    },
    [key],
  );

  return [value, set];
}

/** Largura observada de um elemento. Base do layout responsivo — Chromium 99 não tem container queries. */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;

    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry !== undefined) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

interface ResizableOptions {
  min: number;
  max: number;
}

/**
 * Divisória arrastável.
 *
 * Usa pointer capture para o arrasto sobreviver ao ponteiro sair do elemento —
 * sem isso, arrastar depressa "solta" a divisória no meio do caminho.
 */
export function useResizable(
  width: number,
  setWidth: (w: number) => void,
  { min, max }: ResizableOptions,
) {
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      startX.current = e.clientX;
      startW.current = width;
      setDragging(true);
    },
    [width],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragging) return;
      const next = startW.current + (e.clientX - startX.current);
      setWidth(Math.round(Math.min(max, Math.max(min, next))));
    },
    [dragging, max, min, setWidth],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  }, []);

  return { dragging, onPointerDown, onPointerMove, onPointerUp };
}

interface CepApi {
  addEventListener?: (type: string, cb: (e: { data?: unknown }) => void) => void;
}

/**
 * Visibilidade real do painel dentro do Premiere.
 *
 * `document.visibilityState` não é fiável em painéis CEP — medido na Fase 0 que
 * o evento CSXS dispara corretamente. Serve para parar toda a reprodução quando
 * o painel está oculto.
 */
export function usePanelVisible(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cep = (window as unknown as { __adobe_cep__?: CepApi }).__adobe_cep__;
    if (cep?.addEventListener === undefined) return;

    const handler = (e: { data?: unknown }) => {
      setVisible(e.data === true || e.data === 'true');
    };
    try {
      cep.addEventListener('com.adobe.csxs.events.WindowVisibilityChanged', handler);
    } catch {
      /* fora do CEP (ex.: pré-visualização no browser): assume visível */
    }
  }, []);

  return visible;
}

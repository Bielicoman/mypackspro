import type { PreviewState } from '../model/types.js';

export interface QueueDeps<P> {
  /** Trabalhos simultâneos. Metade dos núcleos deixa CPU para o Premiere renderizar. */
  concurrency: number;
  /**
   * Limite separado para trabalhos pesados.
   *
   * Medido: um ProRes 4444 4K de 216 MB numa drive sincronizada leva ~57 s só
   * a ser lido. Com uma dezena desses ao mesmo tempo, o disco estrangula e uns
   * quantos acabam por falhar. Uma pista estreita só para eles mantém a grade
   * a encher depressa com o que é leve.
   */
  heavyConcurrency?: number;
  /** Classifica o trabalho. Sem isto tudo conta como leve. */
  isHeavy?: (payload: P) => boolean;
  /** Executa um trabalho. Lançar marca o item como falhado. */
  run: (id: string, payload: P) => Promise<void>;
  /** Chamado sempre que algum estado muda, para a UI se actualizar. */
  onChange: () => void;
}

/**
 * Fila de geração de previews.
 *
 * **LIFO de propósito.** Com milhares de assets, o que interessa é o que está
 * no ecrã *agora*; quando o utilizador rola depressa, os pedidos antigos já
 * saíram da vista. Uma fila FIFO gastaria a CPU a gerar previews que ninguém
 * está a olhar.
 *
 * Não conhece ffmpeg nem sistema de arquivos — recebe o trabalho por injeção,
 * o que a torna testável sem tocar em disco.
 */
export class PreviewQueue<P> {
  private readonly states = new Map<string, PreviewState>();
  private readonly payloads = new Map<string, P>();
  /** Pilha: o topo é o pedido mais recente. */
  private stack: string[] = [];
  private active = 0;
  private activeHeavy = 0;
  private stopped = false;

  constructor(private readonly deps: QueueDeps<P>) {}

  getState(id: string): PreviewState | undefined {
    return this.states.get(id);
  }

  /** Trabalhos por terminar — alimenta o contador da faixa de progresso. */
  get remaining(): number {
    return this.stack.length + this.active;
  }

  get isIdle(): boolean {
    return this.remaining === 0;
  }

  /**
   * Pede o preview de um item. Repetir o pedido de algo já pronto, a correr ou
   * falhado não faz nada; repetir o de algo em espera promove-o ao topo, porque
   * significa que voltou a estar visível.
   */
  request(id: string, payload: P): void {
    const state = this.states.get(id);

    if (state === 'ready' || state === 'generating' || state === 'failed') return;

    if (state === 'waiting') {
      const at = this.stack.indexOf(id);
      if (at >= 0 && at !== this.stack.length - 1) {
        this.stack.splice(at, 1);
        this.stack.push(id);
      }
      return;
    }

    this.states.set(id, 'waiting');
    this.payloads.set(id, payload);
    this.stack.push(id);
    this.stopped = false;
    this.deps.onChange();
    this.pump();
  }

  /** Marca um item como já disponível (achado em cache), sem passar pela fila. */
  markReady(id: string): void {
    this.states.set(id, 'ready');
    this.deps.onChange();
  }

  /** Interrompe a fila. O que já está a correr termina; o resto fica cancelado. */
  stop(): void {
    this.stopped = true;
    for (const id of this.stack) this.states.set(id, 'canceled');
    this.stack = [];
    this.deps.onChange();
  }

  /** Permite tentar de novo o que falhou ou foi cancelado. */
  reset(id: string): void {
    const s = this.states.get(id);
    if (s === 'failed' || s === 'canceled') {
      this.states.delete(id);
      this.payloads.delete(id);
    }
  }

  private pump(): void {
    const heavyLimit = this.deps.heavyConcurrency ?? this.deps.concurrency;

    while (!this.stopped && this.active < this.deps.concurrency && this.stack.length > 0) {
      // Procura do topo para baixo o primeiro trabalho que cabe agora. Um pesado
      // bloqueado não pode travar os leves que estão atrás dele na pilha.
      let index = -1;
      let heavy = false;
      for (let i = this.stack.length - 1; i >= 0; i--) {
        const candidate = this.payloads.get(this.stack[i] as string);
        if (candidate === undefined) continue;
        const candidateHeavy = this.deps.isHeavy?.(candidate) ?? false;
        if (candidateHeavy && this.activeHeavy >= heavyLimit) continue;
        index = i;
        heavy = candidateHeavy;
        break;
      }
      if (index < 0) break;

      const id = this.stack.splice(index, 1)[0] as string;
      const payload = this.payloads.get(id);
      if (payload === undefined) continue;

      this.active++;
      if (heavy) this.activeHeavy++;
      this.states.set(id, 'generating');
      this.deps.onChange();

      void this.deps
        .run(id, payload)
        .then(() => {
          this.states.set(id, 'ready');
        })
        .catch(() => {
          // Falha não é fatal: a célula mostra "Sem preview" e a fila segue.
          this.states.set(id, 'failed');
        })
        .finally(() => {
          this.active--;
          if (heavy) this.activeHeavy--;
          this.payloads.delete(id);
          this.deps.onChange();
          this.pump();
        });
    }
  }
}

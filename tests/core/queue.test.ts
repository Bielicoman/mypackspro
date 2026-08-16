import { describe, it, expect, vi } from 'vitest';
import { PreviewQueue } from '../../src/core/preview/queue.js';

/** Trabalho controlável: resolve/rejeita quando o teste mandar. */
function deferred() {
  let resolve!: () => void;
  let reject!: (e?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeHeavyQueue(concurrency: number, heavyConcurrency: number, heavyIds: string[]) {
  const jobs = new Map<string, ReturnType<typeof deferred>>();
  const started: string[] = [];

  const queue = new PreviewQueue<string>({
    concurrency,
    heavyConcurrency,
    isHeavy: (payload) => heavyIds.includes(payload),
    onChange: () => undefined,
    run: (id) => {
      started.push(id);
      const d = deferred();
      jobs.set(id, d);
      return d.promise;
    },
  });

  return { queue, jobs, started };
}

function makeQueue(concurrency: number) {
  const jobs = new Map<string, ReturnType<typeof deferred>>();
  const started: string[] = [];

  const queue = new PreviewQueue<string>({
    concurrency,
    onChange: () => undefined,
    run: (id) => {
      started.push(id);
      const d = deferred();
      jobs.set(id, d);
      return d.promise;
    },
  });

  return { queue, jobs, started };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('PreviewQueue', () => {
  it('respeita a concorrência', async () => {
    const { queue, started } = makeQueue(2);
    for (const id of ['a', 'b', 'c', 'd']) queue.request(id, id);

    expect(started).toHaveLength(2);
    expect(queue.remaining).toBe(4);
  });

  it('atende em LIFO — o pedido mais recente é o que está no ecrã', async () => {
    const { queue, started } = makeQueue(1);
    queue.request('a', 'a');
    queue.request('b', 'b');
    queue.request('c', 'c');

    // 'a' entrou logo (havia vaga); os pendentes saem do topo da pilha.
    expect(started).toEqual(['a']);
    expect(queue.remaining).toBe(3);
  });

  it('avança para o próximo quando um termina', async () => {
    const { queue, jobs, started } = makeQueue(1);
    queue.request('a', 'a');
    queue.request('b', 'b');
    queue.request('c', 'c');

    jobs.get('a')!.resolve();
    await flush();

    expect(started).toEqual(['a', 'c']); // 'c' é o topo da pilha
    expect(queue.getState('a')).toBe('ready');
  });

  it('repetir pedido de item em espera promove-o ao topo', async () => {
    const { queue, jobs, started } = makeQueue(1);
    queue.request('a', 'a');
    queue.request('b', 'b');
    queue.request('c', 'c');

    queue.request('b', 'b'); // 'b' voltou a ficar visível
    jobs.get('a')!.resolve();
    await flush();

    expect(started).toEqual(['a', 'b']);
  });

  it('falha marca o item e não trava a fila', async () => {
    const { queue, jobs, started } = makeQueue(1);
    queue.request('a', 'a');
    queue.request('b', 'b');

    jobs.get('a')!.reject(new Error('ffmpeg morreu'));
    await flush();

    expect(queue.getState('a')).toBe('failed');
    expect(started).toEqual(['a', 'b']);
  });

  it('não repete trabalho já pronto, a correr ou falhado', async () => {
    const { queue, jobs, started } = makeQueue(1);
    queue.request('a', 'a');
    queue.request('a', 'a');
    expect(started).toEqual(['a']);

    jobs.get('a')!.resolve();
    await flush();
    queue.request('a', 'a');
    expect(started).toEqual(['a']);
  });

  it('stop cancela os pendentes mas não os que já correm', async () => {
    const { queue, jobs, started } = makeQueue(1);
    queue.request('a', 'a');
    queue.request('b', 'b');

    queue.stop();

    expect(queue.getState('b')).toBe('canceled');
    expect(queue.getState('a')).toBe('generating');

    jobs.get('a')!.resolve();
    await flush();
    expect(queue.getState('a')).toBe('ready');
    expect(started).toEqual(['a']);
  });

  it('após stop, um novo pedido volta a arrancar a fila', async () => {
    const { queue, jobs, started } = makeQueue(1);
    queue.request('a', 'a');
    queue.request('b', 'b');
    queue.stop();
    jobs.get('a')!.resolve();
    await flush();

    queue.reset('b');
    queue.request('b', 'b');
    expect(started).toEqual(['a', 'b']);
  });

  it('markReady evita trabalho para o que já está em cache', () => {
    const { queue, started } = makeQueue(1);
    queue.markReady('a');
    queue.request('a', 'a');

    expect(queue.getState('a')).toBe('ready');
    expect(started).toEqual([]);
    expect(queue.isIdle).toBe(true);
  });

  it('remaining conta pendentes e activos', async () => {
    const { queue, jobs } = makeQueue(2);
    for (const id of ['a', 'b', 'c']) queue.request(id, id);
    expect(queue.remaining).toBe(3);

    jobs.get('a')!.resolve();
    await flush();
    expect(queue.remaining).toBe(2);
  });

  it('limita os pesados sem travar os leves', () => {
    // 'h1' e 'h2' sao pesados; a pista pesada so aceita 1 de cada vez.
    const { queue, started } = makeHeavyQueue(3, 1, ['h1', 'h2']);
    queue.request('h1', 'h1');
    queue.request('h2', 'h2');
    queue.request('l1', 'l1');
    queue.request('l2', 'l2');

    // h2 fica de fora por causa do limite, mas os leves passam a frente dele.
    expect(started).toContain('h1');
    expect(started).not.toContain('h2');
    expect(started).toContain('l1');
    expect(started).toContain('l2');
    expect(started).toHaveLength(3);
  });

  it('liberta a pista pesada quando um pesado termina', async () => {
    const { queue, jobs, started } = makeHeavyQueue(3, 1, ['h1', 'h2']);
    queue.request('h1', 'h1');
    queue.request('h2', 'h2');
    expect(started).toEqual(['h1']);

    jobs.get('h1')!.resolve();
    await flush();
    expect(started).toEqual(['h1', 'h2']);
  });

  it('sem isHeavy tudo conta como leve', () => {
    const { queue, started } = makeQueue(2);
    queue.request('a', 'a');
    queue.request('b', 'b');
    expect(started).toHaveLength(2);
  });

  it('notifica a UI a cada transição', () => {
    const onChange = vi.fn();
    const q = new PreviewQueue<string>({
      concurrency: 1,
      onChange,
      run: () => Promise.resolve(),
    });
    q.request('a', 'a');
    expect(onChange).toHaveBeenCalled();
  });
});

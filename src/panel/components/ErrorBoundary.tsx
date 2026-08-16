import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  stack: string;
}

/**
 * Rede de segurança do painel.
 *
 * Sem isto, qualquer exceção durante o render desmonta a árvore e o painel fica
 * **completamente preto** — sem mensagem, sem pista, e dentro do Premiere não há
 * consola à mão. Já aconteceu uma vez, com definições gravadas por uma versão
 * anterior. Mostrar o erro transforma meia hora de adivinhação em dez segundos.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, stack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ error, stack: info.componentStack ?? '' });
  }

  private reset = (): void => {
    this.setState({ error: null, stack: '' });
  };

  private resetSettings = (): void => {
    try {
      for (const key of ['ap.settings', 'ap.view', 'ap.favorites']) {
        window.localStorage.removeItem(key);
      }
    } catch {
      /* storage bloqueado: o recarregar ainda pode resolver */
    }
    window.location.reload();
  };

  override render(): ReactNode {
    const { error, stack } = this.state;
    if (error === null) return this.props.children;

    return (
      <div className="crash">
        <div className="crash__title">O painel encontrou um erro</div>
        <pre className="crash__msg">{error.message}</pre>
        {stack !== '' ? <pre className="crash__stack">{stack.trim()}</pre> : null}
        <div className="crash__actions">
          <button className="btn" onClick={this.reset}>
            Tentar de novo
          </button>
          <button className="btn btn--primary" onClick={this.resetSettings}>
            Repor configurações e recarregar
          </button>
        </div>
      </div>
    );
  }
}

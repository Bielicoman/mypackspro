/**
 * O que fazer quando o asset é arrastado para fora do painel.
 *
 * O CEP só sabe entregar ficheiros, e o Premiere só os aceita no painel
 * Projeto — a timeline ignora-os. Não há forma de largar numa posição escolhida
 * com o rato, por isso a escolha real é entre estas três.
 */
export type DragMode = 'playhead' | 'project' | 'off';

export type CopyDest = 'project' | 'custom';

export interface PanelSettings {
  dragMode: DragMode;
  /** Copiar o asset para junto do projeto antes de o importar. */
  copyToProject: boolean;
  copyDest: CopyDest;
  copyCustomPath: string;
  /**
   * Destino por categoria: "packId::Categoria" → pasta.
   * Relativa (`03 SFX`) pendura-se na base; absoluta é usada tal e qual.
   */
  copyRules: Record<string, string>;
  /** Rótulo de cor por categoria: "packId::Categoria" → índice 0–15. */
  copyLabels: Record<string, number>;
}

export const DEFAULT_SETTINGS: PanelSettings = {
  // Arrastar vai para o Projeto e o duplo-clique vai para a timeline: assim os
  // dois destinos ficam disponíveis ao mesmo tempo, sem trocar de definição.
  dragMode: 'project',
  // Ligado por omissão: os packs vivem em discos externos, e sem cópia o
  // projeto fica dependente desse disco estar sempre ligado.
  copyToProject: true,
  copyDest: 'project',
  copyCustomPath: '',
  copyRules: {},
  copyLabels: {},
};

const DRAG_MODES: ReadonlyArray<{ value: DragMode; label: string; hint: string }> = [
  {
    value: 'playhead',
    label: 'Colocar direto no playhead',
    hint: 'Entra na primeira faixa livre a partir do playhead e fica selecionado, pronto a arrastar. Nunca sobrescreve nada. Use se preferir saltar o passo pelo Projeto.',
  },
  {
    value: 'project',
    label: 'Importar para o Projeto (recomendado)',
    hint: 'Não toca na timeline. Dali arrasta para a timeline com precisão total do rato. O duplo-clique continua a colocar no playhead, por isso ficam os dois caminhos disponíveis.',
  },
  {
    value: 'off',
    label: 'Não fazer nada',
    hint: 'O arrasto continua a funcionar para o painel Projeto do Premiere, sem qualquer ação extra do plugin.',
  },
];

interface Props {
  settings: PanelSettings;
  onChange: (next: PanelSettings) => void;
  onClose: () => void;
  cacheInfo: string;
  onClearCache: () => void;
  onPickCopyFolder: () => void;
}

export function Settings({
  settings,
  onChange,
  onClose,
  cacheInfo,
  onClearCache,
  onPickCopyFolder,
}: Props) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__box" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <span>Configurações</span>
          <button className="modal__x" onClick={onClose} title="Fechar">
            ×
          </button>
        </div>

        <div className="modal__body">
          <div className="setting setting--block">
            <span className="setting__label">Ao arrastar para fora do painel</span>
            {DRAG_MODES.map((m) => (
              <label key={m.value} className="radio">
                <input
                  type="radio"
                  name="dragMode"
                  checked={settings.dragMode === m.value}
                  onChange={() => onChange({ ...settings, dragMode: m.value })}
                />
                <span className="setting__body">
                  <span className="setting__label">{m.label}</span>
                  <span className="setting__hint">{m.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <label className="setting">
            <input
              type="checkbox"
              checked={settings.copyToProject}
              onChange={(e) => onChange({ ...settings, copyToProject: e.target.checked })}
            />
            <span className="setting__body">
              <span className="setting__label">Copiar o asset ao importar</span>
              <span className="setting__hint">
                O arquivo é copiado para junto do projeto e é a cópia que entra na edição.
                Sem isto, desligar o disco onde está o pack deixa a mídia offline.
              </span>
            </span>
          </label>

          {settings.copyToProject ? (
            <div className="setting setting--block">
              <span className="setting__label">Copiar para</span>
              <label className="radio">
                <input
                  type="radio"
                  name="copyDest"
                  checked={settings.copyDest === 'project'}
                  onChange={() => onChange({ ...settings, copyDest: 'project' })}
                />
                <span className="setting__body">
                  <span className="setting__label">Pasta do projeto</span>
                  <span className="setting__hint">
                    Numa subpasta “My Packs Pro” ao lado do .prproj. Exige o projeto gravado.
                    Cada categoria pode ter destino próprio: botão direito nela, na lista à esquerda.
                  </span>
                </span>
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="copyDest"
                  checked={settings.copyDest === 'custom'}
                  onChange={() => onChange({ ...settings, copyDest: 'custom' })}
                />
                <span className="setting__body">
                  <span className="setting__label">Pasta escolhida</span>
                  <span className="setting__hint">
                    {settings.copyCustomPath === ''
                      ? 'Nenhuma pasta definida.'
                      : settings.copyCustomPath}
                  </span>
                </span>
              </label>
              {settings.copyDest === 'custom' ? (
                <button className="btn" onClick={onPickCopyFolder}>
                  Escolher pasta…
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="setting setting--static">
            <span className="setting__body">
              <span className="setting__label">Cache de previews</span>
              <span className="setting__hint">{cacheInfo}</span>
            </span>
            <button className="btn" onClick={onClearCache}>
              Limpar
            </button>
          </div>
        </div>

        <div className="modal__foot">
          <span className="modal__note">
            <b>Arrastar</b> segue a opção acima · <b>Duplo-clique</b> coloca sempre no
            playhead, em qualquer modo.
          </span>
        </div>
      </div>
    </div>
  );
}

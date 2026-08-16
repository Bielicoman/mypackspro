import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { assetsIn } from '../core/scan/buildPack.js';
import { findRule, resolveCopyDir, ruleKey } from '../core/copy/rules.js';
import { findLabel, labelByIndex } from '../core/copy/labels.js';
import { PromptModal } from './components/PromptModal.js';
import {
  applyView,
  countByFilter,
  DEFAULT_VIEW,
  FILTER_LABELS,
  SORT_LABELS,
  type ViewOptions,
} from '../core/scan/sortFilter.js';
import type { Asset } from '../core/model/types.js';
import {
  adoptCopy,
  setLabel,
  dropAtPlayhead,
  hostStatus,
  importToProject,
  insertAtPlayhead,
} from '../host/premiereBridge.js';
import { Sidebar, type Selection } from './components/Sidebar.js';
import { AssetCell } from './components/AssetCell.js';
import { ProgressBanner } from './components/ProgressBanner.js';
import { IconGear, IconGrip, IconPause, IconPlay, IconPlus, IconSort } from './components/Icon.js';
import { DEFAULT_SETTINGS, Settings, type PanelSettings } from './components/Settings.js';
import { ContextMenu, type MenuState } from './components/ContextMenu.js';
import { pickFolder } from './bridge/index.js';
import { copyText } from './clipboard.js';
import { usePacks } from './hooks/usePacks.js';
import { usePreviews } from './hooks/usePreviews.js';
import { clearPreviewCache } from '../node/previewCache.js';
import { copyAsset, projectFolderOf } from '../node/copyAsset.js';
import { revealInExplorer } from '../node/reveal.js';
import {
  useElementWidth,
  usePanelVisible,
  usePersistentState,
  useResizable,
} from './hooks/usePanelLayout.js';

const SIDEBAR_MIN = 130;
const SIDEBAR_MAX = 360;
/** Abaixo disto a barra lateral vira gaveta — para o painel continuar usável encaixado. */
const NARROW_AT = 430;

const CELL_MIN = 90;
const CELL_MAX = 320;

export function App() {
  const { packs, loading, scanning, notice, live, addFolder, removePack, rescan, dismissNotice } =
    usePacks();

  const previews = usePreviews();
  const panelVisible = usePanelVisible();

  const [packIndex, setPackIndex] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);
  const [query, setQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = usePersistentState<string[]>('ap.favorites', []);

  const [sidebarW, setSidebarW] = usePersistentState('ap.sidebarW', 190);
  const [cell, setCell] = usePersistentState('ap.cell', 180);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autoplay, setAutoplay] = usePersistentState('ap.autoplay', true);
  const [toast, setToast] = useState<string | null>(null);
  const [settings, setSettings] = usePersistentState<PanelSettings>('ap.settings', DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [viewOpts, setViewOpts] = usePersistentState<ViewOptions>('ap.view', DEFAULT_VIEW);
  /** Categoria a editar destino, ou null. */
  const [editingRule, setEditingRule] = useState<readonly string[] | null>(null);

  const say = useCallback((msg: string, ms = 1800) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), ms);
  }, []);

  /**
   * O arrasto saiu do painel?
   *
   * `dragend` não diz onde a solta aconteceu, e as coordenadas vêm pouco
   * fiáveis quando se larga fora da janela. O sinal robusto é o `dragleave`
   * com `relatedTarget` nulo, que só ocorre quando o ponteiro deixa a janela.
   */
  const leftPanel = useRef(false);
  useEffect(() => {
    const onLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) leftPanel.current = true;
    };
    const onEnter = () => {
      leftPanel.current = false;
    };
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('dragenter', onEnter);
    return () => {
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('dragenter', onEnter);
    };
  }, []);

  /**
   * Duplo-clique põe o asset na timeline.
   *
   * O arrasto nativo do CEP não alcança a timeline — o Premiere só aceita
   * ficheiros largados no painel Projeto. Inserir por ExtendScript é o único
   * caminho, e ainda dá controlo sobre a faixa e a posição.
   */
  /**
   * Aplica ao item importado o rótulo configurado para a categoria.
   *
   * Nunca impede a importação: se esta versão do Premiere não expuser rótulos
   * ao script, o asset entra na mesma e o utilizador é avisado uma vez.
   */
  const applyLabel = useCallback(
    async (asset: Asset, importedPath: string): Promise<void> => {
      const index = findLabel(settings.copyLabels, asset.packId, asset.categoryPath);
      if (index === undefined) return;

      const label = labelByIndex(index);
      if (label === undefined) return;

      try {
        await setLabel(importedPath, index, label.xmpName);
      } catch (e) {
        say(`Rótulo não aplicado: ${(e as Error).message}`, 5000);
      }
    },
    [settings.copyLabels, say],
  );

  /**
   * Devolve o caminho que deve realmente entrar no projeto.
   *
   * Com a cópia ligada, o asset é primeiro copiado para junto do projeto e é
   * essa cópia que se importa — assim a edição deixa de depender do disco onde
   * o pack vive. `adoptCopy` ainda trata do caso em que o Premiere já tinha
   * importado o original sozinho durante o arrasto, religando-o à cópia.
   */
  const prepareForImport = useCallback(
    async (asset: Asset): Promise<string> => {
      if (!settings.copyToProject) {
        // Sem cópia o rótulo continua a fazer sentido: o item entra a partir do
        // caminho original, mas fica igualmente organizado por cor no projeto.
        await applyLabel(asset, asset.absPath);
        return asset.absPath;
      }

      let root = settings.copyCustomPath;
      if (settings.copyDest === 'project') {
        const status = await hostStatus();
        root = projectFolderOf(status?.projectPath ?? '');
        if (root === '') {
          say('Grave o projeto para as cópias ficarem junto dele.', 4000);
          return asset.absPath;
        }
      }
      if (root === '') {
        say('Defina a pasta de destino nas configurações.', 4000);
        return asset.absPath;
      }

      try {
        // A categoria do asset decide a pasta: regra própria, herdada do
        // ancestral, ou a subpasta padrão. Assim o pack chega ao projeto já
        // arrumado na estrutura do editor.
        const dir = resolveCopyDir({
          root,
          packId: asset.packId,
          categoryPath: asset.categoryPath,
          rules: settings.copyRules,
        });
        const copy = await copyAsset(asset.absPath, dir);
        await adoptCopy(asset.absPath, copy);
        await applyLabel(asset, copy);
        return copy;
      } catch (e) {
        say(`Falha ao copiar: ${(e as Error).message}`, 4000);
        return asset.absPath;
      }
    },
    [
      settings.copyToProject,
      settings.copyDest,
      settings.copyCustomPath,
      settings.copyRules,
      applyLabel,
      say,
    ],
  );

  const handleInsert = useCallback(
    async (asset: Asset) => {
      const kind = asset.format.family === 'audio' ? 'audio' : 'video';
      try {
        const target = await prepareForImport(asset);
        await insertAtPlayhead([target], kind);
        say(`${asset.name} → playhead`);
      } catch (e) {
        say((e as Error).message, 4000);
      }
    },
    [say, prepareForImport],
  );

  /**
   * Fim do arrasto. Só age se o ponteiro saiu do painel — largar dentro é
   * cancelamento. Espera meio segundo para o Premiere terminar a importação que
   * ele próprio faz quando a solta cai no painel Projeto; assim o script
   * reaproveita esse item em vez de importar uma segunda cópia.
   */
  const handleDragFinished = useCallback(
    (asset: Asset) => {
      if (settings.dragMode === 'off') return;
      if (!leftPanel.current) return;
      leftPanel.current = false;

      const kind = asset.format.family === 'audio' ? 'audio' : 'video';
      window.setTimeout(() => {
        void prepareForImport(asset).then((target) => {
        if (settings.dragMode === 'project') {
          // Garante a importação mesmo quando a solta caiu na timeline, que
          // recusa ficheiros — assim o asset fica sempre disponível no Projeto
          // para ser arrastado dali com precisão.
          void importToProject([target])
            .then(() => say(`${asset.name} → Projeto`))
            .catch((e: Error) => say(e.message, 4000));
          return;
        }

        void dropAtPlayhead([target], kind)
          .then((n) => {
            if (n > 0) say(`${asset.name} → timeline (selecionado)`);
          })
          .catch((e: Error) => say(e.message, 4000));
        });
      }, 500);
    },
    [settings.dragMode, say, prepareForImport],
  );

  const openAssetMenu = useCallback(
    (asset: Asset, x: number, y: number) => {
      setMenu({
        x,
        y,
        items: [
          { kind: 'header', label: asset.name },
          {
            label: 'Ver no Explorer',
            onSelect: () => {
              void revealInExplorer(asset.absPath).catch((e: Error) => say(e.message, 4000));
            },
          },
          {
            label: 'Copiar caminho',
            onSelect: () => {
              void copyText(asset.absPath)
                .then(() => say('Caminho copiado'))
                .catch(() => say('Não foi possível copiar o caminho', 3000));
            },
          },
        ],
      });
    },
    [say],
  );

  const [bodyRef, bodyWidth] = useElementWidth<HTMLDivElement>();
  const narrow = bodyWidth > 0 && bodyWidth < NARROW_AT;

  const splitter = useResizable(sidebarW, setSidebarW, { min: SIDEBAR_MIN, max: SIDEBAR_MAX });

  // Remover um pack pode deixar o índice fora de alcance.
  useEffect(() => {
    if (packIndex >= packs.length && packs.length > 0) setPackIndex(packs.length - 1);
  }, [packs.length, packIndex]);

  const pack = packs[packIndex];
  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const visible = useMemo(() => {
    if (pack === undefined) return [];
    let list = assetsIn(pack, selection);

    const q = query.trim().toLowerCase();
    if (q !== '') list = list.filter((a) => a.name.toLowerCase().includes(q));
    if (onlyFavorites) list = list.filter((a) => favSet.has(a.id));

    return applyView(list, viewOpts);
  }, [pack, selection, query, onlyFavorites, favSet, viewOpts]);

  /* Contagens do menu: sobre a categoria escolhida, antes do filtro de tipo,
     senão os números mudariam conforme o próprio filtro. */
  const counts = useMemo(
    () => countByFilter(pack === undefined ? [] : assetsIn(pack, selection)),
    [pack, selection],
  );

  const openSortMenu = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setMenu({
        x: r.left,
        y: r.bottom + 2,
        items: [
          { kind: 'header', label: 'Mostrar' },
          ...FILTER_LABELS.map((f) => ({
            label: f.label,
            checked: viewOpts.filter === f.value,
            badge: String(counts[f.value]),
            onSelect: () => setViewOpts({ ...viewOpts, filter: f.value }),
          })),
          { kind: 'separator' as const },
          { kind: 'header' as const, label: 'Ordenar por' },
          ...SORT_LABELS.map((k) => ({
            label: k.label,
            checked: viewOpts.sortKey === k.value,
            onSelect: () => setViewOpts({ ...viewOpts, sortKey: k.value }),
          })),
          { kind: 'separator' as const },
          {
            label: 'Ordem crescente',
            checked: viewOpts.sortDir === 'asc',
            onSelect: () => setViewOpts({ ...viewOpts, sortDir: 'asc' }),
          },
          {
            label: 'Ordem decrescente',
            checked: viewOpts.sortDir === 'desc',
            onSelect: () => setViewOpts({ ...viewOpts, sortDir: 'desc' }),
          },
        ],
      });
    },
    [viewOpts, counts, setViewOpts],
  );

  /*
   * Estas duas têm de ser estáveis entre renders.
   *
   * Uma função nova a cada render chega às células como prop diferente e anula
   * o `memo` delas — com milhares de assets, era o painel inteiro a
   * re-renderizar por qualquer motivo.
   */
  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites(favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id]);
    },
    [favorites, setFavorites],
  );

  const insertAsset = useCallback(
    (asset: Asset) => {
      void handleInsert(asset);
    },
    [handleInsert],
  );

  const heading =
    selection === null
      ? 'Todos os assets'
      : selection.length === 0
        ? 'Sem categoria'
        : selection.join(' / ');

  /* ---------------------------------------------------------------- vazio */
  if (!loading && packs.length === 0) {
    return (
      <div className="app">
        <div className="welcome">
          <div className="welcome__title">Nenhum pack importado</div>
          <p className="welcome__text">
            Aponte para uma pasta do seu PC. As subpastas viram categorias e todos os
            arquivos aparecem aqui, prontos para arrastar.
          </p>
          <button className="welcome__cta" onClick={() => void addFolder()}>
            <IconPlus size={15} />
            Adicionar pasta
          </button>
          {!live ? (
            <p className="welcome__note">
              Fora do Premiere: o seletor de pastas do sistema não está disponível.
            </p>
          ) : null}
        </div>
        <Footer
          cell={cell}
          setCell={setCell}
          autoplay={autoplay}
          setAutoplay={setAutoplay}
          onSettings={() => setShowSettings(true)}
        />
      </div>
    );
  }

  return (
    <div className="app">
      {/* ---------------------------------------------- abas de packs */}
      <div className="packbar">
        {narrow ? (
          <button className="packbar__add" onClick={() => setDrawerOpen(!drawerOpen)} title="Categorias">
            <IconGrip size={16} />
          </button>
        ) : null}

        <div className="packbar__scroll">
          {packs.map((p, i) => (
            <button
              key={p.id}
              className={`packtab${i === packIndex ? ' packtab--on' : ''}`}
              onClick={() => {
                setPackIndex(i);
                setSelection(null);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setPackIndex(i);
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    { label: 'Recarregar pasta', onSelect: () => void rescan(p.rootPath) },
                    {
                      label: 'Remover pack',
                      danger: true,
                      onSelect: () => void removePack(p.rootPath),
                    },
                  ],
                });
              }}
              title={`${p.rootPath}\n${p.assets.length} arquivos`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <button className="packbar__add" onClick={() => void addFolder()} title="Importar pasta">
          <IconPlus size={15} />
        </button>
      </div>

      {scanning !== null ? (
        <ProgressBanner
          label={`Lendo "${scanning.packName}"`}
          detail={`${scanning.found} arquivos`}
        />
      ) : null}

      {scanning === null && previews.remaining > 0 ? (
        <ProgressBanner
          label="Gerando previews"
          detail={`${previews.remaining} restantes`}
          onStop={previews.stop}
        />
      ) : null}

      {!previews.toolsReady && live ? (
        <div className="progress progress--warn">
          <span className="progress__title">
            ffmpeg não encontrado — previews de vídeo e imagem desligados. No
            macOS, instale com <b>brew install ffmpeg</b> e reabra o painel.
          </span>
        </div>
      ) : null}

      {notice !== null ? (
        <div className="progress progress--warn">
          <span className="progress__title">{notice}</span>
          <button className="progress__stop" onClick={dismissNotice}>
            OK
          </button>
        </div>
      ) : null}

      {/* ---------------------------------------------- corpo */}
      <div className={`body${narrow ? ' body--narrow' : ''}`} ref={bodyRef}>
        {!narrow || drawerOpen ? (
          <aside
            className={`sidebar${narrow ? ' sidebar--float' : ''}`}
            style={{ width: narrow ? Math.min(260, Math.max(160, bodyWidth - 40)) : sidebarW }}
          >
            <Sidebar
              pack={pack}
              selection={selection}
              onSelect={(s) => {
                setSelection(s);
                if (narrow) setDrawerOpen(false);
              }}
              query={query}
              onQuery={setQuery}
              onlyFavorites={onlyFavorites}
              onToggleFavorites={() => setOnlyFavorites(!onlyFavorites)}
              onAddFolder={() => void addFolder()}
              ruleFor={(categoryPath) =>
                pack === undefined
                  ? undefined
                  : findRule(settings.copyRules, pack.id, categoryPath)
              }
              labelHexFor={(categoryPath) => {
                if (pack === undefined) return undefined;
                const idx = findLabel(settings.copyLabels, pack.id, categoryPath);
                return idx === undefined ? undefined : labelByIndex(idx)?.hex;
              }}
              onCategoryMenu={(categoryPath, x, y) => {
                if (pack === undefined) return;
                const key = ruleKey(pack.id, categoryPath);
                const current = settings.copyRules[key];
                setMenu({
                  x,
                  y,
                  items: [
                    { kind: 'header', label: categoryPath.join(' / ') || 'Raiz do pack' },
                    {
                      label:
                        current === undefined
                          ? 'Definir pasta de destino…'
                          : 'Alterar pasta de destino…',
                      onSelect: () => setEditingRule(categoryPath),
                    },
                    { kind: 'separator' as const },
                    { kind: 'header' as const, label: 'Rótulo no projeto' },
                    {
                      kind: 'swatches' as const,
                      value: findLabel(settings.copyLabels, pack.id, categoryPath),
                      onPick: (index: number | undefined) => {
                        const next = { ...settings.copyLabels };
                        if (index === undefined) delete next[key];
                        else next[key] = index;
                        setSettings({ ...settings, copyLabels: next });
                        say(
                          index === undefined
                            ? 'Rótulo removido'
                            : `Rótulo: ${labelByIndex(index)?.name ?? ''}`,
                        );
                      },
                    },
                    ...(current === undefined
                      ? []
                      : [
                          {
                            label: 'Remover destino',
                            danger: true,
                            onSelect: () => {
                              const next = { ...settings.copyRules };
                              delete next[key];
                              setSettings({ ...settings, copyRules: next });
                            },
                          },
                        ]),
                  ],
                });
              }}
            />
          </aside>
        ) : null}

        {narrow && drawerOpen ? <div className="scrim" onClick={() => setDrawerOpen(false)} /> : null}

        {!narrow ? (
          <div
            className={`splitter${splitter.dragging ? ' splitter--drag' : ''}`}
            onPointerDown={splitter.onPointerDown}
            onPointerMove={splitter.onPointerMove}
            onPointerUp={splitter.onPointerUp}
            onPointerCancel={splitter.onPointerUp}
            title="Arraste para redimensionar"
          >
            <span className="splitter__grip">
              <IconGrip size={12} />
            </span>
          </div>
        ) : null}

        <div className="grid-wrap">
          {!loading && pack !== undefined ? (
            <div className="gridbar">
              <span className="gridbar__title">
                {heading} · {visible.length}
              </span>
              <button className="gridbar__sort" onClick={openSortMenu} title="Classificar e filtrar">
                <IconSort /> Classificar
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="empty">A carregar packs…</div>
          ) : visible.length === 0 ? (
            <div className="empty">
              {query.trim() !== '' || onlyFavorites
                ? 'Nenhum asset corresponde ao filtro.'
                : 'Esta categoria está vazia.'}
            </div>
          ) : (
            <div className="grid" style={{ ['--cell' as string]: `${cell}px` }}>
              {visible.map((a) => (
                <AssetCell
                  key={a.id}
                  asset={a}
                  entry={previews.get(a.id)}
                  favorite={favSet.has(a.id)}
                  active={panelVisible && autoplay}
                  onInsert={insertAsset}
                  onDragFinished={handleDragFinished}
                  onOpenMenu={openAssetMenu}
                  onToggleFavorite={toggleFavorite}
                  register={previews.register}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showSettings ? (
        <Settings
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
          cacheInfo="Os previews ficam em %APPDATA%\MyPacksPro\cache e são reaproveitados entre sessões."
          onPickCopyFolder={() => {
            void pickFolder().then((dir) => {
              if (dir !== null) setSettings({ ...settings, copyCustomPath: dir });
            });
          }}
          onClearCache={() => {
            void clearPreviewCache().then((n) => say(`${n} previews removidos`));
            setShowSettings(false);
          }}
        />
      ) : null}

      {editingRule !== null && pack !== undefined ? (
        <PromptModal
          title={`Destino de “${editingRule.join(' / ') || 'Raiz do pack'}”`}
          hint={
            'Escreva o nome da subpasta do projeto, por exemplo “03 SFX”. ' +
            'Um nome relativo continua a funcionar quando muda de projeto. ' +
            'Também pode indicar uma pasta completa como D:\Bibliotecas\SFX.'
          }
          initial={settings.copyRules[ruleKey(pack.id, editingRule)] ?? ''}
          placeholder="03 SFX"
          onBrowse={pickFolder}
          onCancel={() => setEditingRule(null)}
          onConfirm={(value) => {
            const key = ruleKey(pack.id, editingRule);
            const next = { ...settings.copyRules };
            if (value === '') delete next[key];
            else next[key] = value;
            setSettings({ ...settings, copyRules: next });
            setEditingRule(null);
            say(value === '' ? 'Destino removido' : `Destino: ${value}`);
          }}
        />
      ) : null}

      {menu !== null ? <ContextMenu state={menu} onClose={() => setMenu(null)} /> : null}

      {toast !== null ? <div className="toast">{toast}</div> : null}

      <Footer
        cell={cell}
        setCell={setCell}
        autoplay={autoplay}
        setAutoplay={setAutoplay}
        onSettings={() => setShowSettings(true)}
      />
    </div>
  );
}

function Footer({
  cell,
  setCell,
  autoplay,
  setAutoplay,
  onSettings,
}: {
  cell: number;
  setCell: (v: number) => void;
  autoplay: boolean;
  setAutoplay: (v: boolean) => void;
  onSettings?: () => void;
}) {
  return (
    <div className="footer">
      <input
        className="footer__slider"
        type="range"
        min={CELL_MIN}
        max={CELL_MAX}
        step={10}
        value={cell}
        onChange={(e) => setCell(Number(e.target.value))}
        title="Tamanho da grade"
      />
      <button
        className="footer__gear"
        title={
          autoplay
            ? 'Pausar as reproduções automáticas (o hover continua a tocar)'
            : 'Retomar as reproduções automáticas'
        }
        onClick={() => setAutoplay(!autoplay)}
      >
        {autoplay ? <IconPause /> : <IconPlay />}
      </button>
      <button className="footer__gear" title="Configurações" onClick={onSettings}>
        <IconGear />
      </button>
      <span className="footer__credit">by Alex Ascencio</span>
    </div>
  );
}

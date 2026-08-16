import { useState } from 'react';
import type { Category, Pack } from '../../core/model/types.js';
import {
  IconChevronDown,
  IconChevronRight,
  IconFolder,
  IconMore,
  IconPlus,
  IconSearch,
  IconStar,
} from './Icon.js';

/** `null` = tudo · `[]` = soltos da raiz · caminho = categoria */
export type Selection = readonly string[] | null;

interface Props {
  pack: Pack | undefined;
  selection: Selection;
  onSelect: (s: Selection) => void;
  query: string;
  onQuery: (q: string) => void;
  onlyFavorites: boolean;
  onToggleFavorites: () => void;
  onAddFolder: () => void;
  /** Botão direito numa categoria — abre o menu de destino de cópia. */
  onCategoryMenu: (categoryPath: readonly string[], x: number, y: number) => void;
  /** Destino configurado para a categoria, se houver. Mostrado como pista. */
  ruleFor: (categoryPath: readonly string[]) => string | undefined;
  /** Cor do rótulo configurado, em hex, se houver. */
  labelHexFor: (categoryPath: readonly string[]) => string | undefined;
}

const same = (a: Selection, b: Selection): boolean => {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((s, i) => s === b[i]);
};

interface NodeProps {
  category: Category;
  depth: number;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onCategoryMenu: (categoryPath: readonly string[], x: number, y: number) => void;
  ruleFor: (categoryPath: readonly string[]) => string | undefined;
  labelHexFor: (categoryPath: readonly string[]) => string | undefined;
}

function TreeNode({
  category,
  depth,
  selection,
  onSelect,
  onCategoryMenu,
  ruleFor,
  labelHexFor,
}: NodeProps) {
  // Categorias de topo começam abertas, como na referência; as internas, fechadas.
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = category.children.length > 0;
  const selected = same(selection, category.path);
  const rule = ruleFor(category.path);
  const labelHex = labelHexFor(category.path);

  return (
    <>
      <div
        className={`node${selected ? ' node--on' : ''}${depth === 0 ? ' node--group' : ''}`}
        style={{ paddingLeft: 4 + depth * 12 }}
        onClick={() => onSelect(category.path)}
        onContextMenu={(e) => {
          e.preventDefault();
          onCategoryMenu(category.path, e.clientX, e.clientY);
        }}
        title={
          rule === undefined
            ? category.path.join(' / ')
            : `${category.path.join(' / ')}

Cópias vão para: ${rule}`
        }
      >
        <button
          className="node__twisty"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setOpen(!open);
          }}
          tabIndex={-1}
        >
          {hasChildren ? (open ? <IconChevronDown /> : <IconChevronRight />) : null}
        </button>

        {depth > 0 ? (
          <span className="node__icon" style={labelHex === undefined ? undefined : { color: labelHex }}>
            <IconFolder />
          </span>
        ) : null}
        {depth === 0 && labelHex !== undefined ? (
          <span className="node__dot" style={{ background: labelHex }} />
        ) : null}

        <span className="node__name">{category.name}</span>
        {rule !== undefined ? (
          <span className="node__rule" title={`Cópias vão para: ${rule}`}>
            {rule}
          </span>
        ) : null}
        <span className="node__count">{category.assetCount}</span>
        <button className="node__more" onClick={(e) => e.stopPropagation()} tabIndex={-1}>
          <IconMore />
        </button>
      </div>

      {open && hasChildren
        ? category.children.map((c) => (
            <TreeNode
              key={c.path.join('/')}
              category={c}
              depth={depth + 1}
              selection={selection}
              onSelect={onSelect}
              onCategoryMenu={onCategoryMenu}
              ruleFor={ruleFor}
              labelHexFor={labelHexFor}
            />
          ))
        : null}
    </>
  );
}

export function Sidebar({
  pack,
  selection,
  onSelect,
  query,
  onQuery,
  onlyFavorites,
  onToggleFavorites,
  onAddFolder,
  onCategoryMenu,
  ruleFor,
  labelHexFor,
}: Props) {
  return (
    <>
      <div className="search">
        <button
          className={`search__star${onlyFavorites ? ' search__star--on' : ''}`}
          onClick={onToggleFavorites}
          title="Mostrar apenas favoritos"
        >
          <IconStar filled={onlyFavorites} />
        </button>
        <div className="search__box">
          <IconSearch />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tree">
        <div
          className={`node node--group${same(selection, null) ? ' node--on' : ''}`}
          style={{ paddingLeft: 4 }}
          onClick={() => onSelect(null)}
        >
          <span className="node__twisty" />
          <span className="node__name">Todos os assets</span>
          <span className="node__count">{pack?.assets.length ?? 0}</span>
        </div>

        {pack !== undefined && pack.looseCount > 0 ? (
          <div
            className={`node${same(selection, []) ? ' node--on' : ''}`}
            style={{ paddingLeft: 4 }}
            onClick={() => onSelect([])}
            title="Arquivos na raiz do pack, fora de qualquer categoria"
          >
            <span className="node__twisty" />
            <span className="node__icon">
              <IconFolder />
            </span>
            <span className="node__name">Sem categoria</span>
            <span className="node__count">{pack.looseCount}</span>
          </div>
        ) : null}

        {pack?.categories.map((c) => (
          <TreeNode
            key={c.path.join('/')}
            category={c}
            depth={0}
            selection={selection}
            onSelect={onSelect}
            onCategoryMenu={onCategoryMenu}
            ruleFor={ruleFor}
            labelHexFor={labelHexFor}
          />
        ))}

        <div className="sidebar__section">Minha biblioteca</div>
        <button className="sidebar__action" onClick={onAddFolder}>
          <IconPlus />
          Adicionar pasta
        </button>
      </div>
    </>
  );
}

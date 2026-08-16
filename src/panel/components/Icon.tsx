/** Ícones inline. Sem dependências e sem requisições — o painel corre em file://. */

interface Props {
  size?: number;
  className?: string;
}

const svg = (d: string, size: number, className?: string, fill = false) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={fill ? 'currentColor' : 'none'}
    stroke={fill ? 'none' : 'currentColor'}
    strokeWidth="1.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

export const IconPlus = ({ size = 14, className }: Props) =>
  svg('M8 3v10M3 8h10', size, className);

export const IconChevronRight = ({ size = 12, className }: Props) =>
  svg('M6 3.5L10.5 8L6 12.5', size, className);

export const IconChevronDown = ({ size = 12, className }: Props) =>
  svg('M3.5 6L8 10.5L12.5 6', size, className);

export const IconFolder = ({ size = 13, className }: Props) =>
  svg('M2 4.5a1 1 0 011-1h3l1.2 1.5H13a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1z', size, className);

export const IconSearch = ({ size = 12, className }: Props) =>
  svg('M7 2.5a4.5 4.5 0 104.5 4.5A4.5 4.5 0 007 2.5zM10.5 10.5L14 14', size, className);

export const IconMore = ({ size = 14, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <circle cx="3.5" cy="8" r="1.15" />
    <circle cx="8" cy="8" r="1.15" />
    <circle cx="12.5" cy="8" r="1.15" />
  </svg>
);

export const IconGrip = ({ size = 14, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <circle cx="8" cy="4" r="1.05" />
    <circle cx="8" cy="8" r="1.05" />
    <circle cx="8" cy="12" r="1.05" />
  </svg>
);

export const IconSort = ({ size = 13, className }: Props) =>
  svg('M4 3v10M4 13L2 11M4 13l2-2M12 13V3M12 3l-2 2M12 3l2 2', size, className);

export const IconPlay = ({ size = 13, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <path d="M4.5 3l8 5-8 5z" />
  </svg>
);

export const IconPause = ({ size = 13, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <rect x="4" y="3" width="3" height="10" rx="1" />
    <rect x="9" y="3" width="3" height="10" rx="1" />
  </svg>
);

export const IconGear = ({ size = 15, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
       className={className} aria-hidden="true">
    <path d="M19.14 12.94a7.07 7.07 0 000-1.88l2.03-1.58a.48.48 0 00.12-.61l-1.92-3.32a.48.48 0 00-.59-.22l-2.39.96a7 7 0 00-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84a.48.48 0 00-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.74 8.87a.48.48 0 00.12.61l2.03 1.58a7.07 7.07 0 000 1.88l-2.03 1.58a.48.48 0 00-.12.61l1.92 3.32c.12.22.37.3.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.48.48 0 00-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z" />
  </svg>
);

export const IconStar = ({ size = 13, className, filled = false }: Props & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 16 16"
       fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
       strokeWidth="1.2" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M8 2l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.5 4.3 13.5l.8-4.2L2 6.4l4.2-.5z" />
  </svg>
);

/* ---------------- ícones por família de arquivo ---------------- */

const FAMILY_COLOR: Record<string, string> = {
  video: '#7aa7e0',
  videoCamera: '#7aa7e0',
  audio: '#6cc07a',
  image: '#d1a05a',
  mogrt: '#c07ad6',
  photoshop: '#4a9be8',
  vector: '#e0a33f',
  raw: '#d1a05a',
  lut: '#e07a9b',
  projectPremiere: '#9a7ae0',
  projectAfterEffects: '#a08ae0',
  projectAdobe: '#9b9b9b',
  preset: '#8a8a8a',
  interchange: '#8a8a8a',
  font: '#8a8a8a',
  caption: '#8a8a8a',
  unknown: '#6e6e6e',
};

/** Glifo compacto por família — lido de relance, como na referência. */
export function FamilyIcon({ family, size = 12 }: { family: string; size?: number }) {
  const color = FAMILY_COLOR[family] ?? FAMILY_COLOR['unknown']!;
  const common = { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true as const };

  if (family === 'audio') {
    return (
      <svg {...common} fill={color}>
        <rect x="1" y="6" width="1.6" height="4" rx=".8" />
        <rect x="4" y="3.5" width="1.6" height="9" rx=".8" />
        <rect x="7" y="5" width="1.6" height="6" rx=".8" />
        <rect x="10" y="2.5" width="1.6" height="11" rx=".8" />
        <rect x="13" y="6" width="1.6" height="4" rx=".8" />
      </svg>
    );
  }
  if (family === 'video' || family === 'videoCamera') {
    return (
      <svg {...common} fill={color}>
        <path d="M1.5 3h9a1 1 0 011 1v8a1 1 0 01-1 1h-9a1 1 0 01-1-1V4a1 1 0 011-1z" />
        <path d="M12.5 6.5l3-2v7l-3-2z" />
      </svg>
    );
  }
  if (family === 'image' || family === 'raw' || family === 'photoshop') {
    return (
      <svg {...common} fill={color}>
        <path d="M1.5 2.5h13a1 1 0 011 1v9a1 1 0 01-1 1h-13a1 1 0 01-1-1v-9a1 1 0 011-1zm1.2 9.3h10.6l-3.3-4.3-2.5 3-1.7-1.9z" />
      </svg>
    );
  }
  if (family === 'lut') {
    return (
      <svg {...common} fill={color}>
        <circle cx="6" cy="6" r="4" opacity=".85" />
        <circle cx="10" cy="10" r="4" opacity=".55" />
      </svg>
    );
  }
  if (family === 'mogrt') {
    return (
      <svg {...common} fill={color}>
        <path d="M8 1l6.1 3.5v7L8 15l-6.1-3.5v-7z" />
      </svg>
    );
  }
  // projetos, presets, fontes, legendas, desconhecido
  return (
    <svg {...common} fill={color}>
      <path d="M3 1.5h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1v-12a1 1 0 011-1z" opacity=".9" />
    </svg>
  );
}

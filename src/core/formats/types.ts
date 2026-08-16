/**
 * Tipos do registro de formatos.
 *
 * O registro é a ÚNICA fonte de verdade sobre "que tipo de arquivo é este e o que
 * fazer com ele". Nenhum outro módulo deve testar extensão por conta própria.
 */

/** Agrupamento por natureza do arquivo. Define ícone e ordenação na grade. */
export type Family =
  | 'video'
  | 'videoCamera'
  | 'audio'
  | 'image'
  | 'mogrt'
  | 'photoshop'
  | 'vector'
  | 'raw'
  | 'lut'
  | 'projectPremiere'
  | 'projectAfterEffects'
  | 'projectAdobe'
  | 'preset'
  | 'interchange'
  | 'font'
  | 'caption'
  | 'unknown';

/**
 * Tier de preview — quanto trabalho custa mostrar este arquivo.
 *  1: ffmpeg decodifica e gera preview real
 *  2: o preview já existe dentro do arquivo, basta extrair
 *  3: não há preview visual possível, só ícone
 */
export type PreviewTier = 1 | 2 | 3;

/** Como produzir o preview. Cada valor corresponde a um handler no pipeline. */
export type PreviewStrategy =
  /* tier 1 */
  | 'ffmpegVideo' // proxy WebM/VP8 com áudio
  | 'ffmpegAudio' // picos da waveform + proxy Opus
  | 'ffmpegImage' // thumb WebP
  | 'ffmpegAnimated' // GIF/APNG → WebM curto
  /* tier 2 */
  | 'zipPreview' // .mogrt é um ZIP com preview dentro
  | 'embeddedComposite' // .psd guarda um composite mesclado
  | 'embeddedThumb' // .ai/.pdf/.eps têm thumbnail embutido
  | 'embeddedJpeg' // RAW carrega um JPEG full-size
  | 'svgDirect' // renderiza direto no painel
  | 'lut3d' // aplica a LUT sobre imagem de referência
  /* tier 3 */
  | 'icon';

export interface FormatDef {
  readonly family: Family;
  readonly tier: PreviewTier;
  readonly strategy: PreviewStrategy;
  /** O Premiere aceita este arquivo em `importFiles`? Controla se o arrasto é permitido. */
  readonly importable: boolean;
  /** Chave do ícone na spritesheet do painel. */
  readonly icon: string;
}

/** Metadados vindos do ffprobe, usados para decidir se vale gerar proxy. */
export interface ProbeInfo {
  readonly sizeBytes: number;
  readonly width?: number;
  readonly height?: number;
  /** Nome do codec de vídeo como o ffprobe reporta: 'h264', 'vp9', 'prores'… */
  readonly videoCodec?: string;
}
